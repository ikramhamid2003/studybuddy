import pytest
from unittest.mock import patch
from rest_framework.test import APIClient

# Enable DB access for throttling and database cache
pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()

@patch("study_api.views.query_groq_json")
def test_explain_view(mock_query, api_client):
    mock_query.return_value = {
        "explanation": "test explanation",
        "key_points": ["point 1"],
        "analogy": "test analogy",
        "example": "test example"
    }

    resp = api_client.post("/api/explain/", {"topic": "react", "level": "beginner"}, format="json")
    assert resp.status_code == 200
    assert resp.data["explanation"] == "test explanation"
    mock_query.assert_called_once()

@patch("study_api.views.query_groq_json")
def test_summarize_view(mock_query, api_client):
    mock_query.return_value = {
        "summary": "test summary",
        "key_concepts": [],
        "important_terms": [],
        "study_tips": []
    }

    resp = api_client.post("/api/summarize/", {"notes": "This is a long piece of study notes that is at least twenty characters long.", "format": "bullets"}, format="json")
    assert resp.status_code == 200
    assert resp.data["summary"] == "test summary"

@patch("study_api.views.query_groq_json")
def test_quiz_view(mock_query, api_client):
    mock_query.return_value = {
        "questions": [
            {
                "id": 1,
                "question": "Q?",
                "options": ["A", "B"],
                "answer": "A",
                "explanation": "exp"
            }
        ]
    }

    resp = api_client.post("/api/quiz/", {"topic": "react", "num_questions": 1, "difficulty": "easy"}, format="json")
    assert resp.status_code == 200
    assert "questions" in resp.data

@patch("study_api.views.query_groq_json")
def test_flashcards_view(mock_query, api_client):
    mock_query.return_value = {
        "flashcards": [
            {
                "id": 1,
                "front": "F",
                "back": "B",
                "hint": "H"
            }
        ]
    }

    resp = api_client.post("/api/flashcards/", {"topic": "react", "num_cards": 5}, format="json")
    assert resp.status_code == 200
    assert "flashcards" in resp.data


@patch("study_api.views.query_groq")
def test_chat_view(mock_query, api_client):
    mock_query.return_value = "Study Buddy: hello there student"

    resp = api_client.post("/api/chat/", {"message": "hi", "history": []}, format="json")
    assert resp.status_code == 200
    assert resp.data["reply"] == "hello there student"

@patch("study_api.views.stream_groq")
def test_chat_stream_view(mock_stream, api_client):
    mock_stream.return_value = ["hello", " stream"]

    resp = api_client.post("/api/chat/stream/", {"message": "hi", "history": []}, format="json")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "text/event-stream"
    
    chunks = b"".join(resp.streaming_content).decode("utf-8")
    assert "hello" in chunks
    assert "stream" in chunks

