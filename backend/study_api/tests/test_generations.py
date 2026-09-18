from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from study_api.models import Generation
from study_api.schemas import FlashcardsResponse, QuizResponse

pytestmark = pytest.mark.django_db


@pytest.fixture
def other_auth_client():
    """Second authenticated user used to prove data is scoped by account."""

    client = APIClient()
    user = User.objects.create_user(username="dave", password="testpassword")
    client.force_authenticate(user=user)
    client.user = user
    return client


def test_generate_requires_auth(api_client):
    resp = api_client.post(
        "/api/generate/", {"topic": "gravity", "type": "explain"}, format="json"
    )
    assert resp.status_code == 401


def test_generate_rejects_unknown_type(auth_client):
    resp = auth_client.post(
        "/api/generate/", {"topic": "gravity", "type": "poem"}, format="json"
    )
    assert resp.status_code == 400
    assert not Generation.objects.exists()


@patch("study_api.views.query_groq_json")
def test_generate_explain_persists_generation(mock_query, auth_client):
    # Mock the LLM call so the test focuses on persistence and response shape.
    mock_query.return_value = {
        "explanation": "test explanation",
        "key_points": ["point 1"],
        "analogy": "test analogy",
        "example": "test example",
    }

    resp = auth_client.post(
        "/api/generate/", {"topic": "gravity", "type": "explain"}, format="json"
    )
    assert resp.status_code == 200
    assert resp.data["explanation"] == "test explanation"
    assert resp.data["generation_id"]

    generation = Generation.objects.get(id=resp.data["generation_id"])
    assert generation.user == auth_client.user
    assert generation.type == "explain"
    assert generation.topic == "gravity"
    assert generation.result["explanation"] == "test explanation"


@patch("study_api.views.query_groq_structured")
def test_generate_quiz_persists_generation(mock_query, auth_client):
    mock_query.return_value = QuizResponse.model_validate(
        {
            "questions": [
                {
                    "id": 1,
                    "question": "Q?",
                    "options": ["A", "B", "C", "D"],
                    "answer": "A",
                    "explanation": "exp",
                }
            ]
        }
    )

    resp = auth_client.post(
        "/api/generate/", {"topic": "react", "type": "quiz"}, format="json"
    )
    assert resp.status_code == 200
    assert "questions" in resp.data

    generation = Generation.objects.get(id=resp.data["generation_id"])
    assert generation.type == "quiz"
    assert generation.result["questions"][0]["question"] == "Q?"


@patch("study_api.views.query_groq_structured")
def test_generate_flashcards_persists_generation(mock_query, auth_client):
    mock_query.return_value = FlashcardsResponse.model_validate(
        {"flashcards": [{"id": 1, "front": "F", "back": "B", "hint": "H"}]}
    )

    resp = auth_client.post(
        "/api/generate/", {"topic": "cells", "type": "flashcards"}, format="json"
    )
    assert resp.status_code == 200

    generation = Generation.objects.get(id=resp.data["generation_id"])
    assert generation.type == "flashcards"
    assert generation.result["flashcards"][0]["front"] == "F"


@patch("study_api.views.query_groq_json")
def test_generate_summarize_persists_generation(mock_query, auth_client):
    mock_query.return_value = {
        "summary": "test summary",
        "key_concepts": [],
        "important_terms": [],
        "study_tips": [],
    }

    resp = auth_client.post(
        "/api/generate/",
        {"topic": "Short topic text", "type": "summarize"},
        format="json",
    )
    assert resp.status_code == 200

    generation = Generation.objects.get(id=resp.data["generation_id"])
    assert generation.type == "summarize"


@patch("study_api.views.chat_groq")
def test_generate_chat_persists_generation(mock_chat, auth_client):
    mock_chat.return_value = "quick answer"

    resp = auth_client.post(
        "/api/generate/", {"topic": "What is inertia?", "type": "chat"}, format="json"
    )
    assert resp.status_code == 200
    assert resp.data["reply"] == "quick answer"

    generation = Generation.objects.get(id=resp.data["generation_id"])
    assert generation.type == "chat"
    assert generation.result["reply"] == "quick answer"


@patch("study_api.views.query_groq_json")
def test_failed_generation_is_not_persisted(mock_query, auth_client):
    # Failed model calls should not leave partial history records behind.
    mock_query.side_effect = Exception("groq down")

    resp = auth_client.post(
        "/api/generate/", {"topic": "gravity", "type": "explain"}, format="json"
    )
    assert resp.status_code == 503
    assert not Generation.objects.exists()


@patch("study_api.views.query_groq_json")
def test_generate_explain_uses_level_param(mock_query, auth_client):
    mock_query.return_value = {"explanation": "x"}

    resp = auth_client.post(
        "/api/generate/",
        {"topic": "gravity", "type": "explain", "level": "advanced"},
        format="json",
    )
    assert resp.status_code == 200
    user_msg = mock_query.call_args[0][1]
    assert "advanced level" in user_msg


@patch("study_api.views.query_groq_structured")
def test_generate_quiz_uses_custom_params(mock_query, auth_client):
    mock_query.return_value = QuizResponse.model_validate(
        {
            "questions": [
                {
                    "id": 1,
                    "question": "Q?",
                    "options": ["A", "B", "C", "D"],
                    "answer": "A",
                    "explanation": "exp",
                }
            ]
        }
    )

    resp = auth_client.post(
        "/api/generate/",
        {"topic": "gravity", "type": "quiz", "num_questions": 3, "difficulty": "hard"},
        format="json",
    )
    assert resp.status_code == 200
    user_msg = mock_query.call_args[0][1]
    assert "exactly 3" in user_msg
    assert "hard difficulty" in user_msg


def test_generate_rejects_out_of_range_params(auth_client):
    resp = auth_client.post(
        "/api/generate/",
        {"topic": "gravity", "type": "quiz", "num_questions": 99},
        format="json",
    )
    assert resp.status_code == 400
    assert not Generation.objects.exists()


@patch("study_api.views.chat_groq")
def test_generate_chat_uses_history(mock_chat, auth_client):
    mock_chat.return_value = "following along"

    history = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello!"},
    ]
    resp = auth_client.post(
        "/api/generate/",
        {"topic": "tell me more", "type": "chat", "history": history},
        format="json",
    )
    assert resp.status_code == 200
    assert mock_chat.call_args[0][1] == history


def test_generations_list_scoped_to_user(auth_client, other_auth_client):
    Generation.objects.create(
        user=auth_client.user, type="explain", topic="mine", result={}
    )
    Generation.objects.create(
        user=other_auth_client.user, type="quiz", topic="theirs", result={}
    )

    resp = auth_client.get("/api/generations/")
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["topic"] == "mine"


def test_generations_list_filter_by_type(auth_client):
    Generation.objects.create(
        user=auth_client.user, type="explain", topic="a", result={}
    )
    Generation.objects.create(user=auth_client.user, type="quiz", topic="b", result={})

    resp = auth_client.get("/api/generations/?type=quiz")
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["type"] == "quiz"


def test_generations_require_auth(api_client):
    resp = api_client.get("/api/generations/")
    assert resp.status_code == 401
