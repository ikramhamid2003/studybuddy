"""Tests for the optional ALLOWED_SCRAPE_DOMAINS whitelist."""

from study_api.content_fetcher import _hostname_allowed, _is_safe_url


def test_empty_whitelist_allows_any_public_host(settings):
    settings.ALLOWED_SCRAPE_DOMAINS = ""
    assert _hostname_allowed("example.com") is True
    ok, _ = _is_safe_url("https://example.com/article")
    assert ok is True


def test_whitelist_blocks_unlisted_host(settings):
    settings.ALLOWED_SCRAPE_DOMAINS = "wikipedia.org,edu"
    ok, reason = _is_safe_url("https://example.com/article")
    assert ok is False
    assert "allowed scrape list" in reason


def test_whitelist_allows_suffix_match(settings):
    settings.ALLOWED_SCRAPE_DOMAINS = "wikipedia.org,edu"
    assert _hostname_allowed("en.wikipedia.org") is True
    assert _hostname_allowed("mit.edu") is True
    assert _hostname_allowed("cs.mit.edu") is True
    ok, _ = _is_safe_url("https://en.wikipedia.org/wiki/Inertia")
    assert ok is True
