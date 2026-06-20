import pytest
from unittest.mock import patch, MagicMock
from django.conf import settings
from study_api.groq_client import call_groq, extract_json, stream_groq

def test_extract_json_direct():
    text = '{"explanation": "hello"}'
    res = extract_json(text)
    assert res == {"explanation": "hello"}

def test_extract_json_markdown():
    text = 'some text ```json\n{"explanation": "hello"}\n``` other text'
    res = extract_json(text)
    assert res == {"explanation": "hello"}

def test_extract_json_raw_braces():
    text = 'here is { "explanation": "hello" } text'
    res = extract_json(text)
    assert res == {"explanation": "hello"}

def test_extract_json_invalid():
    with pytest.raises(ValueError):
        extract_json("no json here")

@patch("study_api.groq_client.requests.post")
def test_call_groq(mock_post):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": "  hello groq  "
                }
            }
        ]
    }
    mock_post.return_value = mock_resp

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        res = call_groq("sys", "user")
        assert res == "hello groq"
        mock_post.assert_called_once()

@patch("study_api.groq_client.requests.post")
def test_stream_groq(mock_post):
    mock_resp = MagicMock()
    mock_resp.iter_lines.return_value = [
        b'data: {"choices": [{"delta": {"content": "hello"}}]}',
        b'data: {"choices": [{"delta": {"content": " world"}}]}',
        b'data: [DONE]'
    ]
    mock_post.return_value = mock_resp

    with patch.object(settings, "GROQ_API_KEY", "fake_key"):
        tokens = list(stream_groq("sys", "user"))
        assert tokens == ["hello", " world"]
