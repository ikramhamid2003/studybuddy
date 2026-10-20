"""Token usage extraction, pricing, and persistence.

Verifies the client reads provider usage metadata (or the OpenAI-style
fallback), resets the per-thread counter after each read so one request never
inherits another's token counts, and — the part that was missing while the
feature read as dead — that GenerateView writes the counts and the priced cost
onto the Generation row that /api/usage/ reports from.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from langchain_core.messages import AIMessage

from study_api.dispatchers import enforce_daily_token_limit, tokens_used_today
from study_api.langchain_client import (
    _extract_usage,
    estimate_cost_usd,
    take_last_usage,
)
from study_api.models import Generation, UsageLog


class FakeLLM:
    """Stands in for ChatGroq, returning a canned reply plus usage metadata."""

    def __init__(self, content, usage=None):
        self._content = content
        self._usage = usage

    def invoke(self, _messages):
        usage = self._usage
        if usage is not None:
            # UsageMetadata requires total_tokens; providers always send it.
            usage = {
                **usage,
                "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
            }
        return AIMessage(content=self._content, usage_metadata=usage)


EXPLAIN_JSON = (
    '{"explanation":"e","key_points":["a"],"analogy":"x","example":"y"}'
)


# ── Usage extraction ────────────────────────────────────────────────────────


def test_extract_usage_reads_langchain_usage_metadata():
    msg = AIMessage(
        content="hi",
        usage_metadata={"input_tokens": 11, "output_tokens": 22, "total_tokens": 33},
    )
    assert _extract_usage(msg) == {"input_tokens": 11, "output_tokens": 22}


def test_extract_usage_falls_back_to_openai_token_usage():
    # Providers that skip usage_metadata still report the OpenAI-style block.
    msg = AIMessage(content="hi")
    msg.response_metadata = {
        "token_usage": {"prompt_tokens": 7, "completion_tokens": 3, "total_tokens": 10}
    }
    assert _extract_usage(msg) == {"input_tokens": 7, "output_tokens": 3}


def test_extract_usage_returns_none_when_absent():
    assert _extract_usage(AIMessage(content="hi")) is None


def test_take_last_usage_clears_after_reading():
    # Without the reset a worker thread would carry usage into the next request.
    with patch(
        "study_api.langchain_client._get_llm",
        return_value=FakeLLM(EXPLAIN_JSON, {"input_tokens": 5, "output_tokens": 6}),
    ):
        from study_api.langchain_client import query_groq_json

        query_groq_json("sys", "user")
        assert take_last_usage() == {"input_tokens": 5, "output_tokens": 6}
        assert take_last_usage() == {"input_tokens": 0, "output_tokens": 0}


# ── Cost estimation ─────────────────────────────────────────────────────────


def test_estimate_cost_uses_per_million_rates():
    with override_settings(GROQ_PRICE_PER_M_INPUT=1.0, GROQ_PRICE_PER_M_OUTPUT=2.0):
        assert estimate_cost_usd(1000, 500) == Decimal("0.0020")


def test_estimate_cost_is_zero_when_rates_are_unset():
    # Documented default: an honest 0 instead of a guessed price.
    with override_settings(GROQ_PRICE_PER_M_INPUT=0.0, GROQ_PRICE_PER_M_OUTPUT=0.0):
        assert estimate_cost_usd(100_000, 50_000) == Decimal("0.0000")


def test_estimate_cost_rounds_half_up_to_the_column_precision():
    # 50 tokens at $1/M is exactly $0.00005 — the midpoint must not truncate down.
    with override_settings(GROQ_PRICE_PER_M_INPUT=1.0, GROQ_PRICE_PER_M_OUTPUT=0.0):
        assert estimate_cost_usd(50, 0) == Decimal("0.0001")


# ── Persistence through the API ─────────────────────────────────────────────


@pytest.mark.django_db
def test_generate_persists_tokens_and_cost(auth_client):
    # The whole point of the plumbing: the counts must land on the Generation row.
    cache.clear()
    with (
        patch(
            "study_api.langchain_client._get_llm",
            return_value=FakeLLM(EXPLAIN_JSON, {"input_tokens": 120, "output_tokens": 45}),
        ),
        override_settings(GROQ_PRICE_PER_M_INPUT=1.0, GROQ_PRICE_PER_M_OUTPUT=2.0),
    ):
        resp = auth_client.post(
            "/api/generate/",
            {"topic": "wobble the usage tracking", "type": "explain"},
            format="json",
        )

    assert resp.status_code == 200
    generation = Generation.objects.get(id=resp.data["generation_id"])
    assert generation.input_tokens == 120
    assert generation.output_tokens == 45
    assert generation.cost == Decimal("0.0002")


@pytest.mark.django_db
def test_usage_endpoint_reports_persisted_tokens(auth_client):
    cache.clear()
    with (
        patch(
            "study_api.langchain_client._get_llm",
            return_value=FakeLLM(EXPLAIN_JSON, {"input_tokens": 30, "output_tokens": 12}),
        ),
        override_settings(GROQ_PRICE_PER_M_INPUT=100.0, GROQ_PRICE_PER_M_OUTPUT=100.0),
    ):
        auth_client.post(
            "/api/generate/",
            {"topic": "usage rollup check", "type": "explain"},
            format="json",
        )
        resp = auth_client.get("/api/usage/")

    data = resp.json()["data"]
    assert data["total_input_tokens"] == 30
    assert data["total_output_tokens"] == 12
    assert data["total_estimated_cost"] == pytest.approx(0.0042, abs=1e-6)


@pytest.mark.django_db
def test_cache_hit_records_no_tokens(auth_client):
    # A cached answer never called the model, so it must not bill the student.
    cache.clear()
    payload = {"topic": "cached turn tokens", "type": "explain"}
    with patch(
        "study_api.langchain_client._get_llm",
        return_value=FakeLLM(EXPLAIN_JSON, {"input_tokens": 99, "output_tokens": 99}),
    ):
        auth_client.post("/api/generate/", payload, format="json")
        second = auth_client.post("/api/generate/", payload, format="json")

    assert second.status_code == 200
    generation = Generation.objects.get(id=second.data["generation_id"])
    assert (generation.input_tokens, generation.output_tokens) == (0, 0)
    assert generation.cost == Decimal("0.0000")


# ── Daily token budget ──────────────────────────────────────────────────────


def _seed_generation(user, i, o, *, days_ago=0):
    gen = Generation.objects.create(
        user=user, type="explain", topic=f"seed-{i}-{o}", input_tokens=i, output_tokens=o
    )
    if days_ago:
        # auto_now_add pins created_at to now; move it to test the day window.
        Generation.objects.filter(id=gen.id).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )
    return gen


@pytest.mark.django_db
def test_tokens_used_today_sums_generations_and_usage_logs(auth_client):
    user = auth_client.user
    _seed_generation(user, 100, 50)
    UsageLog.objects.create(user=user, input_tokens=10, output_tokens=5)
    assert tokens_used_today(user) == 165


@pytest.mark.django_db
def test_tokens_used_today_ignores_earlier_days(auth_client):
    _seed_generation(auth_client.user, 100, 50, days_ago=2)
    assert tokens_used_today(auth_client.user) == 0


@pytest.mark.django_db
def test_enforce_returns_none_until_budget_is_spent(auth_client):
    user = auth_client.user
    with override_settings(USER_TOKEN_LIMIT=200):
        assert enforce_daily_token_limit(user) is None
        _seed_generation(user, 150, 60)  # 210 >= 200
        blocked = enforce_daily_token_limit(user)
        assert blocked is not None and blocked.status_code == 429


@pytest.mark.django_db
def test_enforce_is_disabled_when_limit_is_zero(auth_client):
    _seed_generation(auth_client.user, 999_999, 999_999)
    with override_settings(USER_TOKEN_LIMIT=0):
        assert enforce_daily_token_limit(auth_client.user) is None


@pytest.mark.django_db
def test_generate_is_blocked_once_over_budget(auth_client):
    cache.clear()
    user = auth_client.user
    _seed_generation(user, 5000, 5000)  # exactly fills the default 10k budget
    resp = auth_client.post(
        "/api/generate/", {"topic": "must be refused", "type": "explain"}, format="json"
    )
    assert resp.status_code == 429
    # Refused before the model call, so no second generation was persisted.
    assert Generation.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_usage_endpoint_reports_budget_fields(auth_client):
    cache.clear()
    _seed_generation(auth_client.user, 300, 100)
    with override_settings(USER_TOKEN_LIMIT=1000):
        data = auth_client.get("/api/usage/").json()["data"]
    assert data["daily_token_limit"] == 1000
    assert data["tokens_used_today"] == 400
    assert data["tokens_remaining_today"] == 600


@pytest.mark.django_db
def test_streamed_chat_records_a_usage_log(auth_client):
    # Chat streaming has no Generation row, so UsageLog is what makes it count
    # toward the budget. The stream is stubbed; only the recording is asserted.
    with (
        patch("study_api.views.stream_chat_groq", return_value=iter([])),
        patch("study_api.views.take_last_usage", return_value={"input_tokens": 40, "output_tokens": 12}),
    ):
        resp = auth_client.post(
            "/api/chat/stream/", {"message": "hello there", "history": []}, format="json"
        )
        b"".join(resp.streaming_content)  # drive the generator to completion

    log = UsageLog.objects.get(user=auth_client.user)
    assert (log.input_tokens, log.output_tokens) == (40, 12)
