from unittest.mock import MagicMock, patch

import pytest
from django.conf import settings
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


class _FakeResult:
    """Stand-in for the AIMessage llm.invoke() returns."""

    def __init__(self, content):
        self.content = content


class _FakeChain:
    """Stand-in for `llm | parser`."""

    def __init__(self, return_value):
        self._return_value = return_value

    def invoke(self, messages):
        return self._return_value


class _FakeLLM:
    """Stand-in for ChatGroq, with just enough surface area to exercise
    query_groq / query_groq_json / stream_groq / with_structured_output."""

    def __init__(self, invoke_result=None, stream_chunks=None, structured_result=None):
        self._invoke_result = invoke_result
        self._stream_chunks = stream_chunks or []
        self._structured_result = structured_result

    def invoke(self, messages):
        return self._invoke_result

    def stream(self, messages):
        yield from self._stream_chunks

    def __or__(self, parser):
        return _FakeChain(self._invoke_result)

    def with_structured_output(self, schema):
        structured_llm = MagicMock()
        structured_llm.invoke.return_value = self._structured_result
        return structured_llm


def test_get_llm_raises_without_api_key():
    with (
        patch.object(settings, "GROQ_API_KEY", ""),
        pytest.raises(ValueError, match="GROQ_API_KEY"),
    ):
        query_groq("sys", "user")


@patch("study_api.langchain_client._get_llm")
def test_query_groq(mock_get_llm):
    mock_get_llm.return_value = _FakeLLM(invoke_result=_FakeResult("  hello groq  "))

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = query_groq("sys", "user")
        assert res == "hello groq"


@patch("study_api.langchain_client._get_llm")
def test_query_groq_json(mock_get_llm):
    mock_get_llm.return_value = _FakeLLM(invoke_result={"explanation": "hello"})

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = query_groq_json("sys", "user")
        assert res == {"explanation": "hello"}


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
    expected = _DummySchema(answer="42")
    mock_get_llm.return_value = _FakeLLM(structured_result=expected)

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = query_groq_structured("sys", "user", _DummySchema)
        assert res == expected
        assert res.answer == "42"


def test_build_message_history_role_mapping():
    history = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello!"},
    ]
    messages = build_message_history("sys prompt", history, "how are you?")

    assert [m.content for m in messages] == [
        "sys prompt",
        "hi",
        "hello!",
        "how are you?",
    ]
    # SystemMessage, HumanMessage, AIMessage, HumanMessage
    assert [type(m).__name__ for m in messages] == [
        "SystemMessage",
        "HumanMessage",
        "AIMessage",
        "HumanMessage",
    ]


@patch("study_api.langchain_client._get_llm")
def test_chat_groq(mock_get_llm):
    mock_get_llm.return_value = _FakeLLM(invoke_result=_FakeResult("  sure, happy to help!  "))
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
