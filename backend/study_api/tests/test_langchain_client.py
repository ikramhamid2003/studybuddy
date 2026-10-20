
from unittest.mock import patch

import pytest
from django.conf import settings
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import BaseModel

from study_api.langchain_client import (
    build_message_history,
    chat_groq,
    query_groq,
    query_groq_json,
    query_groq_structured,
    stream_chat_groq,
    stream_groq,
)


class _FakeChunk:
    """Stand-in for the AIMessageChunk objects llm.stream() yields."""

    def __init__(self, content):
        self.content = content


class _FakeLLM:
    """Stand-in for ChatGroq, with just enough surface area to exercise
    query_groq / query_groq_json / stream_groq / query_groq_structured."""

    def __init__(self, invoke_result=None, stream_chunks=None):
        self._invoke_result = invoke_result
        self._stream_chunks = stream_chunks or []

    def invoke(self, messages):
        return self._invoke_result

    def stream(self, messages):
        yield from self._stream_chunks


def test_get_llm_raises_without_api_key():
    # Missing configuration should fail before trying to reach Groq.
    with (
        patch.object(settings, "GROQ_API_KEY", ""),
        pytest.raises(ValueError, match="GROQ_API_KEY"),
    ):
        query_groq("sys", "user")


@patch("study_api.langchain_client._get_llm")
def test_query_groq(mock_get_llm):
    mock_get_llm.return_value = _FakeLLM(invoke_result=AIMessage("  hello groq  "))

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = query_groq("sys", "user")
        assert res == "hello groq"


@patch("study_api.langchain_client._get_llm")
def test_query_groq_json(mock_get_llm):
    # ChatGroq returns a message whose content is raw JSON text; the parser is
    # what turns it into a dict.
    mock_get_llm.return_value = _FakeLLM(
        invoke_result=AIMessage('{"explanation": "hello"}')
    )

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = query_groq_json("sys", "user")
        assert res == {"explanation": "hello"}


@patch("study_api.langchain_client._get_llm")
def test_query_groq_json_strips_markdown_fences(mock_get_llm):
    # Models frequently wrap JSON in a ```json fence despite being told not to.
    mock_get_llm.return_value = _FakeLLM(
        invoke_result=AIMessage('```json\n{"explanation": "hello"}\n```')
    )

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        assert query_groq_json("sys", "user") == {"explanation": "hello"}


@patch("study_api.langchain_client._get_llm")
def test_stream_groq(mock_get_llm):
    mock_get_llm.return_value = _FakeLLM(
        stream_chunks=[_FakeChunk("hello"), _FakeChunk(" world"), _FakeChunk("")]
    )

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        tokens = list(stream_groq("sys", "user"))
        # empty-content chunks are filtered out
        assert tokens == ["hello", " world"]


class _DummySchema(BaseModel):
    answer: str


@patch("study_api.langchain_client._get_llm")
def test_query_groq_structured(mock_get_llm):
    # with_structured_output is unavailable on the fake LLM, so the JSON
    # prompting fallback must still produce a validated schema instance.
    mock_get_llm.return_value = _FakeLLM(invoke_result=AIMessage('{"answer": "42"}'))

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = query_groq_structured("sys", "user", _DummySchema)
        assert isinstance(res, _DummySchema)
        assert res.answer == "42"


@patch("study_api.langchain_client._get_llm")
def test_query_groq_structured_prefers_native_tool_calling(mock_get_llm):
    class _StructuredLLM(_FakeLLM):
        def with_structured_output(self, schema, include_raw=False):
            class _Runner:
                def invoke(self, messages):
                    parsed = schema(answer="from-tools")
                    if include_raw:
                        return {"raw": AIMessage("ignored"), "parsed": parsed, "parsing_error": None}
                    return parsed

            return _Runner()

    mock_get_llm.return_value = _StructuredLLM()

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = query_groq_structured("sys", "user", _DummySchema)
        assert res.answer == "from-tools"


@patch("study_api.langchain_client._get_llm")
def test_chat_groq(mock_get_llm):
    mock_get_llm.return_value = _FakeLLM(invoke_result=AIMessage("  sure, happy to help!  "))
    history = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello!"}]

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = chat_groq("sys", history, "explain photosynthesis")
        assert res == "sure, happy to help!"


@patch("study_api.langchain_client._get_llm")
def test_stream_chat_groq(mock_get_llm):
    mock_get_llm.return_value = _FakeLLM(
        stream_chunks=[_FakeChunk("sure"), _FakeChunk(", "), _FakeChunk("happy to help!")]
    )
    history = [{"role": "user", "content": "hi"}]

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        tokens = list(stream_chat_groq("sys", history, "explain photosynthesis"))
        assert tokens == ["sure", ", ", "happy to help!"]


def test_build_message_history_folds_system_turns_into_one_leading_message():
    # The Study Chat page sends its session list as a system turn, and Groq only
    # accepts a system message in first position.
    messages = build_message_history(
        "BASE SYSTEM",
        [
            {"role": "system", "content": "Other chats: Physics"},
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hello"},
        ],
        "next question",
    )

    system_messages = [m for m in messages if isinstance(m, SystemMessage)]
    assert len(system_messages) == 1
    assert "BASE SYSTEM" in system_messages[0].content
    assert "Other chats: Physics" in system_messages[0].content
    assert [type(m) for m in messages[1:]] == [HumanMessage, AIMessage, HumanMessage]
