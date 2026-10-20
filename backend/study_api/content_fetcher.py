"""
Web content fetcher for URLs.
Detects if user input is a URL and fetches its content for LLM processing.
Pages are scraped with the Firecrawl API (clean markdown, handles JS-heavy
sites) when FIRECRAWL_API_KEY is configured, and fall back to a direct
requests/BeautifulSoup scrape otherwise.
Includes security measures against malicious URLs.
"""

import ipaddress
import logging
import re
import socket
from typing import TypedDict
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from django.conf import settings

logger = logging.getLogger(__name__)

URL_PATTERN = re.compile(
    r"https?://(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)"
)

BLOCKED_DOMAINS = {
    "linkedin.com", "www.linkedin.com",
    "facebook.com", "www.facebook.com",
    "twitter.com", "www.twitter.com",
    "x.com", "www.x.com",
    "instagram.com", "www.instagram.com",
    "tiktok.com", "www.tiktok.com",
}

BLOCKED_PATHS = [
    r"/login", r"/signin", r"/signup", r"/register",
    r"/password", r"/reset", r"/account", r"/settings",
    r"/admin", r"/dashboard", r"\.env", r"\.git", r"/api/", r"/auth/",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

MAX_CONTENT_LENGTH = 12000

FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape"
# Firecrawl renders pages server-side, so it legitimately needs more time than
# a direct fetch of the raw HTML.
FIRECRAWL_TIMEOUT = 60

MAX_REDIRECTS = 3


class FetchedContent(TypedDict):
    """The normalized result returned for every URL fetch attempt."""

    success: bool
    url: str
    title: str
    content: str
    error: str


class TopicContent(TypedDict):
    """The prompt-ready content produced from a user topic or URL."""

    has_url: bool
    original_topic: str
    fetched_content: FetchedContent | None
    combined_content: str

BLOCKED_IP_PATTERNS = [
    r"^127\.", r"^10\.", r"^172\.(1[6-9]|2\d|3[01])\.",
    r"^192\.168\.", r"^0\.", r"localhost", r"^::1$", r"^169\.254\.",
]


def is_url(text):
    text = text.strip()
    return bool(URL_PATTERN.match(text))


def extract_urls(text):
    return URL_PATTERN.findall(text)


def _allowed_scrape_domains() -> set[str]:
    """Optional hostname whitelist from ALLOWED_SCRAPE_DOMAINS (comma-separated).

    Empty means no extra restriction beyond the existing SSRF / blocklist gates.
    Matching is suffix-based so ``edu`` allows ``mit.edu`` and ``cs.mit.edu``.
    """
    raw = getattr(settings, "ALLOWED_SCRAPE_DOMAINS", "") or ""
    return {part.strip().lower().lstrip(".") for part in raw.split(",") if part.strip()}


def _hostname_allowed(hostname: str) -> bool:
    """True when *hostname* is permitted by ALLOWED_SCRAPE_DOMAINS (if set)."""
    allowed = _allowed_scrape_domains()
    if not allowed:
        return True
    host = (hostname or "").lower().rstrip(".")
    if not host:
        return False
    for domain in allowed:
        if host == domain or host.endswith("." + domain):
            return True
    return False


def _is_safe_url(url):
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP/HTTPS URLs are supported"
        hostname = parsed.hostname or ""
        if hostname in BLOCKED_DOMAINS:
            return False, f"This website ({hostname}) blocks external access. Try copying the content directly."
        for pattern in BLOCKED_IP_PATTERNS:
            if re.match(pattern, hostname, re.IGNORECASE):
                return False, "Private/local URLs are not allowed"
        if not _hostname_allowed(hostname):
            return (
                False,
                (
                    f"This domain ({hostname}) is not on the allowed scrape list. "
                    "Ask an admin to add it to ALLOWED_SCRAPE_DOMAINS, or paste the content directly."
                ),
            )
        path = parsed.path.lower()
        for pattern in BLOCKED_PATHS:
            if re.search(pattern, path, re.IGNORECASE):
                return False, "This URL path is not accessible"
        return True, ""
    except ValueError:
        return False, "Invalid URL format"


def _firecrawl_failure(url: str, error: str, title: str = "") -> FetchedContent:
    """Build the standard unsuccessful FetchedContent for a failed Firecrawl call."""
    return {"success": False, "url": url, "title": title, "content": "", "error": error}


def _fetch_with_firecrawl(url: str) -> FetchedContent | None:
    """Scrape *url* with Firecrawl and return its clean markdown.

    Returns None when no FIRECRAWL_API_KEY is configured. API failures are
    returned as an unsuccessful FetchedContent (never raised) so the caller
    can fall back to direct scraping.
    """
    api_key = settings.FIRECRAWL_API_KEY
    if not api_key:
        return None

    try:
        response = requests.post(
            FIRECRAWL_SCRAPE_URL,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            json={"url": url, "formats": ["markdown"]},
            timeout=FIRECRAWL_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.exceptions.Timeout:
        return _firecrawl_failure(url, "Firecrawl request timed out.")
    except requests.exceptions.HTTPError as e:
        code = e.response.status_code if e.response else 0
        return _firecrawl_failure(url, f"Firecrawl could not scrape this page (HTTP {code}).")
    except requests.exceptions.RequestException as e:
        return _firecrawl_failure(url, f"Firecrawl request failed: {e!s}")
    except ValueError:
        return _firecrawl_failure(url, "Firecrawl returned an invalid response.")

    if not payload.get("success"):
        message = str(payload.get("error") or "Firecrawl could not scrape this page.")
        return _firecrawl_failure(url, message)

    data = payload.get("data") or {}
    markdown = str(data.get("markdown") or "").strip()
    title = str((data.get("metadata") or {}).get("title") or "").strip()

    if len(markdown) < 50:
        return _firecrawl_failure(url, "Firecrawl could not extract meaningful content.", title=title)

    if len(markdown) > MAX_CONTENT_LENGTH:
        markdown = markdown[:MAX_CONTENT_LENGTH] + "\n\n[Content truncated...]"
    return {"success": True, "url": url, "title": title, "content": markdown, "error": ""}


def fetch_url_content(url: str, timeout: int = 15) -> FetchedContent:
    """Fetch *url* as clean markdown for the LLM prompts.

    Prefers Firecrawl when FIRECRAWL_API_KEY is set (it renders JavaScript and
    returns page-ready markdown), falling back to a direct scrape when
    Firecrawl is unconfigured or fails.
    """
    is_safe, reason = _is_safe_url(url)
    if not is_safe:
        return {"success": False, "url": url, "title": "", "content": "", "error": reason}

    firecrawl_result = _fetch_with_firecrawl(url)
    if firecrawl_result is not None:
        if firecrawl_result["success"]:
            return firecrawl_result
        logger.warning(
            "Firecrawl fetch failed for %s (%s); falling back to direct scraping",
            url,
            firecrawl_result["error"],
        )
    return _fetch_with_requests(url, timeout)


def _host_is_public(hostname: str) -> bool:
    """True when *hostname* DNS-resolves only to public/global IP addresses.

    Guards against hostnames that point into internal networks (DNS
    rebinding), encoded IP forms (octal/hex/decimal), and IPv6 loopback
    variants that pass the string checks in _is_safe_url.
    """
    try:
        infos = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
    except (OSError, ValueError):
        return False
    if not infos:
        return False
    for info in infos:
        try:
            if not ipaddress.ip_address(info[4][0]).is_global:
                return False
        except ValueError:
            return False
    return True


def _safe_get(url: str, timeout: int):
    """GET *url*, following redirects manually so every hop re-passes the SSRF gates.

    Returns (response, error_reason); response is None when a hop was rejected
    as unsafe or the redirect chain exceeded MAX_REDIRECTS.
    """
    current_url = url
    for _ in range(MAX_REDIRECTS + 1):
        hostname = urlparse(current_url).hostname or ""
        if not hostname or not _host_is_public(hostname):
            return None, "Private/local URLs are not allowed"
        response = requests.get(current_url, headers=HEADERS, timeout=timeout, allow_redirects=False)
        if response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get("Location")
            if not location:
                return response, ""
            next_url = urljoin(current_url, location)
            is_safe, reason = _is_safe_url(next_url)
            if not is_safe:
                return None, reason
            current_url = next_url
            continue
        return response, ""
    return None, "Too many redirects."


def _fetch_with_requests(url: str, timeout: int = 15) -> FetchedContent:
    try:
        response, fetch_error = _safe_get(url, timeout)
        if response is None:
            return {"success": False, "url": url, "title": "", "content": "", "error": fetch_error}
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return {"success": False, "url": url, "title": "", "content": "", "error": f"Cannot process {content_type} content. Try a regular webpage."}
        soup = BeautifulSoup(response.text, "lxml")
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "form"]):
            element.decompose()
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        main_content = soup.find("article") or soup.find("main") or soup.find("div", {"role": "main"}) or soup.body or soup
        text = main_content.get_text(separator="\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text).strip()
        if len(text) < 50:
            return {"success": False, "url": url, "title": title, "content": "", "error": "Could not extract meaningful content. The page may require JavaScript or login."}
        if len(text) > MAX_CONTENT_LENGTH:
            text = text[:MAX_CONTENT_LENGTH] + "\n\n[Content truncated...]"
        return {"success": True, "url": url, "title": title, "content": text, "error": ""}
    except requests.exceptions.Timeout:
        return {"success": False, "url": url, "title": "", "content": "", "error": "Request timed out."}
    except requests.exceptions.HTTPError as e:
        code = e.response.status_code if e.response else 0
        if code == 403:
            return {"success": False, "url": url, "title": "", "content": "", "error": "This website blocks external access. Try copying the content directly."}
        if code == 404:
            return {"success": False, "url": url, "title": "", "content": "", "error": "Page not found. Please check the URL."}
        if code in (401, 407):
            return {"success": False, "url": url, "title": "", "content": "", "error": "This page requires authentication. Try copying the content directly."}
        return {"success": False, "url": url, "title": "", "content": "", "error": f"Cannot access this page (HTTP {code}). Try copying the content directly."}
    except requests.exceptions.ConnectionError:
        return {"success": False, "url": url, "title": "", "content": "", "error": "Could not connect to this website."}
    except requests.exceptions.RequestException as e:
        return {"success": False, "url": url, "title": "", "content": "", "error": f"Failed to fetch URL: {e!s}"}
    except RuntimeError as e:
        return {"success": False, "url": url, "title": "", "content": "", "error": f"Unexpected error: {e!s}"}


def process_topic_with_url(topic: str) -> TopicContent:
    topic = topic.strip()
    if not is_url(topic):
        urls = extract_urls(topic)
        if urls:
            fetched = fetch_url_content(urls[0])
            if fetched["success"]:
                return {"has_url": True, "original_topic": topic, "fetched_content": fetched, "combined_content": f"{topic}\n\n--- Content from {urls[0]} ---\n{fetched['content']}"}
            else:
                return {"has_url": True, "original_topic": topic, "fetched_content": fetched, "combined_content": f"{topic}\n\n[Note: Could not fetch content from {urls[0]}: {fetched['error']}]"}
        return {"has_url": False, "original_topic": topic, "fetched_content": None, "combined_content": topic}
    fetched = fetch_url_content(topic)
    if fetched["success"]:
        combined = f"Topic: {fetched['title']}\nURL: {topic}\n\n--- Page Content ---\n{fetched['content']}"
    else:
        combined = f"{topic}\n\n[Note: Could not fetch content: {fetched['error']}]"
    return {"has_url": True, "original_topic": topic, "fetched_content": fetched, "combined_content": combined}
