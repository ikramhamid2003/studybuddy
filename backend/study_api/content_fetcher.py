"""
Web content fetcher for URLs.
Detects if user input is a URL and fetches its content for LLM processing.
"""

import re

import requests
from bs4 import BeautifulSoup


# Regex to detect URLs (http/https)
URL_PATTERN = re.compile(
    r"https?://(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)"
)

# Headers to mimic a browser request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Max content length to prevent token overflow
MAX_CONTENT_LENGTH = 12000


def is_url(text: str) -> bool:
    """Check if the input text is a URL."""
    text = text.strip()
    return bool(URL_PATTERN.match(text))


def extract_urls(text: str) -> list[str]:
    """Extract all URLs from a text string."""
    return URL_PATTERN.findall(text)


def fetch_url_content(url: str, timeout: int = 15) -> dict:
    """
    Fetch and extract main text content from a URL.
    
    Returns:
        dict with keys:
            - success: bool
            - url: str (the original URL)
            - title: str (page title)
            - content: str (extracted text content)
            - error: str (error message if failed)
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
        
        # Check content type - only process HTML
        content_type = response.headers.get("Content-Type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return {
                "success": False,
                "url": url,
                "title": "",
                "content": "",
                "error": f"Unsupported content type: {content_type}",
            }
        
        soup = BeautifulSoup(response.text, "lxml")
        
        # Remove script, style, nav, footer, header elements
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"]):
            element.decompose()
        
        # Extract title
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        
        # Try to find main content area
        main_content = (
            soup.find("article")
            or soup.find("main")
            or soup.find("div", {"role": "main"})
            or soup.find("div", class_=re.compile(r"(content|article|post|entry|main)", re.I))
            or soup.body
            or soup
        )
        
        # Extract text with spacing
        text = main_content.get_text(separator="\n", strip=True)
        
        # Clean up excessive whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = text.strip()
        
        # Truncate if too long
        if len(text) > MAX_CONTENT_LENGTH:
            text = text[:MAX_CONTENT_LENGTH] + "\n\n[Content truncated...]"
        
        return {
            "success": True,
            "url": url,
            "title": title,
            "content": text,
            "error": "",
        }
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "url": url,
            "title": "",
            "content": "",
            "error": "Request timed out. The website took too long to respond.",
        }
    except requests.exceptions.HTTPError as e:
        return {
            "success": False,
            "url": url,
            "title": "",
            "content": "",
            "error": f"HTTP error: {e.response.status_code} {e.response.reason}",
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "url": url,
            "title": "",
            "content": "",
            "error": f"Failed to fetch URL: {str(e)}",
        }
    except Exception as e:
        return {
            "success": False,
            "url": url,
            "title": "",
            "content": "",
            "error": f"Unexpected error: {str(e)}",
        }


def process_topic_with_url(topic: str) -> dict:
    """
    Process user input topic. If it contains a URL, fetch its content.
    
    Returns:
        dict with keys:
            - has_url: bool
            - original_topic: str
            - fetched_content: dict or None (from fetch_url_content)
            - combined_content: str (topic + fetched content for LLM)
    """
    topic = topic.strip()
    
    if not is_url(topic):
        # Check if topic contains URLs within text
        urls = extract_urls(topic)
        if urls:
            # Fetch first URL found
            fetched = fetch_url_content(urls[0])
            return {
                "has_url": True,
                "original_topic": topic,
                "fetched_content": fetched,
                "combined_content": f"{topic}\n\n--- Content from {urls[0]} ---\n{fetched['content']}" if fetched["success"] else topic,
            }
        return {
            "has_url": False,
            "original_topic": topic,
            "fetched_content": None,
            "combined_content": topic,
        }
    
    # Topic IS a URL
    fetched = fetch_url_content(topic)
    if fetched["success"]:
        combined = f"Topic: {fetched['title']}\nURL: {topic}\n\n--- Page Content ---\n{fetched['content']}"
    else:
        combined = topic
    
    return {
        "has_url": True,
        "original_topic": topic,
        "fetched_content": fetched,
        "combined_content": combined,
    }
