"""Tests for the Firecrawl-first URL fetcher."""
import socket
from unittest.mock import MagicMock, patch

import requests

from study_api.content_fetcher import (
    _host_is_public,
    fetch_url_content,
    process_topic_with_url,
)

FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape"
ARTICLE_URL = "https://example.com/article"


def _firecrawl_response(markdown: str, title: str = "Example Blog") -> MagicMock:
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json.return_value = {
        "success": True,
        "data": {"markdown": markdown, "metadata": {"title": title}},
    }
    return response


def _html_response(title: str = "Direct Title") -> MagicMock:
    response = MagicMock()
    response.status_code = 200
    response.headers = {"Content-Type": "text/html; charset=utf-8"}
    response.text = (
        f"<html><head><title>{title}</title></head>"
        f"<body><p>{'Directly scraped paragraph content. ' * 10}</p></body></html>"
    )
    response.raise_for_status = MagicMock()
    return response


def _redirect_response(location: str) -> MagicMock:
    response = MagicMock()
    response.status_code = 302
    response.headers = {"Location": location}
    return response


@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_firecrawl_used_when_key_configured(mock_post, mock_get, settings):
    settings.FIRECRAWL_API_KEY = "fc-test-key"
    mock_post.return_value = _firecrawl_response("# Example\n\n" + "Clean markdown body. " * 10)

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is True
    assert "# Example" in result["content"]
    assert result["title"] == "Example Blog"

    args, kwargs = mock_post.call_args
    assert args[0] == FIRECRAWL_URL
    assert kwargs["headers"]["Authorization"] == "Bearer fc-test-key"
    assert kwargs["json"] == {"url": ARTICLE_URL, "formats": ["markdown"]}
    mock_get.assert_not_called()


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_no_key_skips_firecrawl(mock_post, mock_get, mock_public, settings):
    settings.FIRECRAWL_API_KEY = ""
    mock_get.return_value = _html_response()

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is True
    assert result["title"] == "Direct Title"
    mock_post.assert_not_called()
    mock_get.assert_called_once()


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_firecrawl_http_error_falls_back_to_direct_scrape(mock_post, mock_get, mock_public, settings):
    settings.FIRECRAWL_API_KEY = "fc-test-key"
    mock_post.return_value.raise_for_status.side_effect = requests.exceptions.HTTPError("500 Server Error")
    mock_get.return_value = _html_response()

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is True
    assert result["title"] == "Direct Title"
    mock_post.assert_called_once()
    mock_get.assert_called_once()


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_firecrawl_success_false_falls_back(mock_post, mock_get, mock_public, settings):
    settings.FIRECRAWL_API_KEY = "fc-test-key"
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json.return_value = {"success": False, "error": "Blocked by robots.txt"}
    mock_post.return_value = response
    mock_get.return_value = _html_response()

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is True
    assert result["title"] == "Direct Title"


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_firecrawl_empty_markdown_falls_back(mock_post, mock_get, mock_public, settings):
    settings.FIRECRAWL_API_KEY = "fc-test-key"
    mock_post.return_value = _firecrawl_response("Read more")
    mock_get.return_value = _html_response()

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is True
    assert result["title"] == "Direct Title"


@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_firecrawl_truncates_long_markdown(mock_post, mock_get, settings):
    settings.FIRECRAWL_API_KEY = "fc-test-key"
    mock_post.return_value = _firecrawl_response("A" * 15000)

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is True
    assert result["content"].endswith("[Content truncated...]")
    assert len(result["content"]) < 13000
    mock_get.assert_not_called()


@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_unsafe_url_never_reaches_network(mock_post, mock_get, settings):
    settings.FIRECRAWL_API_KEY = "fc-test-key"

    result = fetch_url_content("http://127.0.0.1/notes")

    assert result["success"] is False
    assert "not allowed" in result["error"]
    mock_post.assert_not_called()
    mock_get.assert_not_called()


# ── URL gating: scraping only for URL inputs ────────────────────────────────


@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_plain_topic_skips_all_scraping(mock_post, mock_get, settings):
    """Non-URL input must go straight to Groq with no Firecrawl/direct fetch."""
    settings.FIRECRAWL_API_KEY = "fc-test-key"

    result = process_topic_with_url("Explain photosynthesis at a beginner level")

    assert result["has_url"] is False
    assert result["fetched_content"] is None
    assert result["combined_content"] == "Explain photosynthesis at a beginner level"
    mock_post.assert_not_called()
    mock_get.assert_not_called()


@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_topic_with_embedded_url_uses_firecrawl(mock_post, mock_get, settings):
    """Text containing a URL still counts as URL input and gets scraped."""
    settings.FIRECRAWL_API_KEY = "fc-test-key"
    mock_post.return_value = _firecrawl_response("# Article\n\n" + "Scraped body. " * 10, title="Scraped Page")

    result = process_topic_with_url("Summarize https://example.com/article for me")

    assert result["has_url"] is True
    assert "Scraped body." in result["combined_content"]
    mock_post.assert_called_once()
    mock_get.assert_not_called()


# ── SSRF hardening: resolved-IP validation and redirect re-checks ─────────────


@patch("study_api.content_fetcher.socket.getaddrinfo")
def test_host_is_public_rejects_metadata_address(mock_resolve):
    mock_resolve.return_value = [
        (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("169.254.169.254", 443)),
    ]
    assert _host_is_public("metadata.example.com") is False


@patch("study_api.content_fetcher.socket.getaddrinfo")
def test_host_is_public_rejects_loopback(mock_resolve):
    mock_resolve.return_value = [
        (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("127.0.0.1", 80)),
    ]
    assert _host_is_public("rebind.example.com") is False


@patch("study_api.content_fetcher.socket.getaddrinfo")
def test_host_is_public_rejects_private_ranges(mock_resolve):
    mock_resolve.return_value = [
        (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("93.184.216.34", 443)),
        (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("10.0.0.5", 443)),
    ]
    assert _host_is_public("split-horizon.example.com") is False


@patch("study_api.content_fetcher.socket.getaddrinfo")
def test_host_is_public_accepts_public_ips(mock_resolve):
    mock_resolve.return_value = [
        (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("93.184.216.34", 443)),
        (socket.AF_INET6, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("2606:2800:220:1:248:1893:25c8:1946", 443)),
    ]
    assert _host_is_public("example.com") is True


@patch("study_api.content_fetcher.socket.getaddrinfo", side_effect=socket.gaierror)
def test_host_is_public_rejects_unresolvable_host(mock_resolve):
    assert _host_is_public("nonexistent.invalid") is False


@patch("study_api.content_fetcher._host_is_public", return_value=False)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_direct_fetch_blocks_private_dns_resolution(mock_post, mock_get, mock_public, settings):
    """A hostname whose DNS points inside the network must never be fetched."""
    settings.FIRECRAWL_API_KEY = ""

    result = fetch_url_content("https://internal.example.com/notes")

    assert result["success"] is False
    assert "not allowed" in result["error"]
    mock_get.assert_not_called()


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_redirect_to_private_target_is_blocked(mock_post, mock_get, mock_public, settings):
    """A public page 302-ing to an internal address must not be followed."""
    settings.FIRECRAWL_API_KEY = ""
    mock_get.return_value = _redirect_response("http://192.168.1.1/secret")

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is False
    assert "not allowed" in result["error"]
    assert mock_get.call_count == 1


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_redirect_to_private_dns_target_is_blocked(mock_post, mock_get, mock_public, settings):
    """A redirect to a public-looking host that resolves internally is blocked."""
    settings.FIRECRAWL_API_KEY = ""
    mock_get.side_effect = [
        _redirect_response("https://rebind.example.com/notes"),
        _html_response(title="Should Not Load"),
    ]
    # First hop is public; the redirect target resolves internally.
    mock_public.side_effect = [True, False]

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is False
    assert "not allowed" in result["error"]
    assert mock_get.call_count == 1


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_safe_redirect_is_followed(mock_post, mock_get, mock_public, settings):
    """Redirects to validated public pages still work."""
    settings.FIRECRAWL_API_KEY = ""
    mock_get.side_effect = [
        _redirect_response("https://example.com/article-2"),
        _html_response(title="Page Two"),
    ]

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is True
    assert result["title"] == "Page Two"
    assert mock_get.call_count == 2
    assert mock_get.call_args_list[1].args[0] == "https://example.com/article-2"


@patch("study_api.content_fetcher._host_is_public", return_value=True)
@patch("study_api.content_fetcher.requests.get")
@patch("study_api.content_fetcher.requests.post")
def test_redirect_loop_is_capped(mock_post, mock_get, mock_public, settings):
    settings.FIRECRAWL_API_KEY = ""
    mock_get.return_value = _redirect_response("/next")

    result = fetch_url_content(ARTICLE_URL)

    assert result["success"] is False
    assert "Too many redirects" in result["error"]
    assert mock_get.call_count == 4
