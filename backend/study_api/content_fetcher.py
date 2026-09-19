"""
Web content fetcher for URLs.
Detects if user input is a URL and fetches its content for LLM processing.
Includes security measures against malicious URLs.
"""

import re
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup




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

BLOCKED_IP_PATTERNS = [
    r"^127\.", r"^10\.", r"^172\.(1[6-9]|2\d|3[01])\.",
    r"^192\.168\.", r"^0\.", r"localhost", r"^::1$", r"^169\.254\.",
]


def is_url(text):
    text = text.strip()
    return bool(URL_PATTERN.match(text))


def extract_urls(text):
    return URL_PATTERN.findall(text)


def _is_safe_url(url):
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP/HTTPS URLs are supported"
        hostname = parsed.hostname or ""
        if hostname in BLOCKED_DOMAINS:
            return False, f"This website ({hostname}) blocks external access. Try copying the content directly."
        for pattern in BLOCKED_IP_PATTERNS:
            if re.match(pattern, hostname, re.I):
                return False, "Private/local URLs are not allowed"
        path = parsed.path.lower()
        for pattern in BLOCKED_PATHS:
            if re.search(pattern, path, re.I):
                return False, "This URL path is not accessible"
        return True, ""
    except Exception:
        return False, "Invalid URL format"


def fetch_url_content(url, timeout=15):
    is_safe, reason = _is_safe_url(url)
    if not is_safe:
        return {"success": False, "url": url, "title": "", "content": "", "error": reason}
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
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
        return {"success": False, "url": url, "title": "", "content": "", "error": f"Failed to fetch URL: {str(e)}"}
    except Exception as e:
        return {"success": False, "url": url, "title": "", "content": "", "error": f"Unexpected error: {str(e)}"}


def process_topic_with_url(topic):
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
