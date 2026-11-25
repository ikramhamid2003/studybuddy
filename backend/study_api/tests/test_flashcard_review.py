from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from study_api.models import CardReview, Generation

pytestmark = pytest.mark.django_db

DUE_URL = "/api/flashcards/review/"
ANSWER_URL = "/api/flashcards/review/answer/"


def _deck(user, topic="biology", n=3):
    cards = [{"id": i + 1, "front": f"Q{i}", "back": f"A{i}", "hint": f"H{i}"} for i in range(n)]
    return Generation.objects.create(
        user=user, type="flashcards", topic=topic, result={"flashcards": cards}
    )


@pytest.fixture
def other_client():
    client = APIClient()
    client.user = User.objects.create_user(username="eve", password="pw-12345-x")
    client.force_authenticate(client.user)
    return client


def test_requires_auth(api_client):
    assert api_client.get(DUE_URL).status_code == 401
    assert api_client.post(ANSWER_URL, {}, format="json").status_code == 401


def test_unreviewed_cards_are_new(auth_client):
    deck = _deck(auth_client.user)
    data = auth_client.get(DUE_URL).json()
    assert data["new_count"] == 3 and data["due_count"] == 0
    assert [c["front"] for c in data["cards"]] == ["Q0", "Q1", "Q2"]
    assert all(c["is_new"] and c["generation_id"] == deck.id for c in data["cards"])


def test_answering_schedules_the_card_and_removes_it_from_the_queue(auth_client):
    deck = _deck(auth_client.user)
    resp = auth_client.post(
        ANSWER_URL, {"generation_id": deck.id, "card_index": 0, "rating": "good"}, format="json"
    )
    assert resp.status_code == 200
    assert resp.json()["interval_days"] == 1
    data = auth_client.get(DUE_URL).json()
    assert data["new_count"] == 2 and data["due_count"] == 0


def test_overdue_cards_come_before_new_ones(auth_client):
    deck = _deck(auth_client.user)
    CardReview.objects.create(
        user=auth_client.user, generation=deck, card_index=2,
        due_at=timezone.now() - timedelta(hours=1),
    )
    data = auth_client.get(DUE_URL).json()
    assert data["due_count"] == 1 and data["new_count"] == 2
    assert data["cards"][0]["card_index"] == 2 and not data["cards"][0]["is_new"]


def test_cards_not_yet_due_are_hidden(auth_client):
    deck = _deck(auth_client.user, n=1)
    CardReview.objects.create(
        user=auth_client.user, generation=deck, card_index=0,
        due_at=timezone.now() + timedelta(days=2),
    )
    data = auth_client.get(DUE_URL).json()
    assert data["cards"] == [] and data["due_count"] == 0 and data["new_count"] == 0


def test_limit_and_single_deck_filter(auth_client):
    first = _deck(auth_client.user, "a", n=4)
    _deck(auth_client.user, "b", n=4)
    limited = auth_client.get(DUE_URL, {"limit": 2}).json()
    assert len(limited["cards"]) == 2 and limited["new_count"] == 8
    one = auth_client.get(DUE_URL, {"generation_id": first.id}).json()
    assert one["new_count"] == 4 and {c["topic"] for c in one["cards"]} == {"a"}


def test_bad_inputs(auth_client):
    deck = _deck(auth_client.user, n=1)
    bad_rating = auth_client.post(
        ANSWER_URL, {"generation_id": deck.id, "card_index": 0, "rating": "meh"}, format="json"
    )
    assert bad_rating.status_code == 400
    out_of_range = auth_client.post(
        ANSWER_URL, {"generation_id": deck.id, "card_index": 5, "rating": "good"}, format="json"
    )
    assert out_of_range.status_code == 404
    assert auth_client.get(DUE_URL, {"generation_id": "abc"}).status_code == 400


def test_other_users_decks_are_invisible(auth_client, other_client):
    deck = _deck(other_client.user)
    assert auth_client.get(DUE_URL).json()["cards"] == []
    resp = auth_client.post(
        ANSWER_URL, {"generation_id": deck.id, "card_index": 0, "rating": "good"}, format="json"
    )
    assert resp.status_code == 404


def test_only_flashcard_generations_can_be_reviewed(auth_client):
    quiz = Generation.objects.create(
        user=auth_client.user, type="quiz", topic="t", result={"questions": []}
    )
    resp = auth_client.post(
        ANSWER_URL, {"generation_id": quiz.id, "card_index": 0, "rating": "good"}, format="json"
    )
    assert resp.status_code == 404


def test_deleting_a_deck_removes_its_review_state(auth_client):
    deck = _deck(auth_client.user, n=1)
    auth_client.post(
        ANSWER_URL, {"generation_id": deck.id, "card_index": 0, "rating": "good"}, format="json"
    )
    deck.delete()
    assert CardReview.objects.count() == 0
