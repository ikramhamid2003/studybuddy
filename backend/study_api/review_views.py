"""Spaced-repetition review endpoints for saved flashcard decks."""

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CardReview, Generation
from .srs import RATINGS, CardState, schedule

DEFAULT_REVIEW_LIMIT = 20
MAX_REVIEW_LIMIT = 50
# New cards are drawn from the most recent decks so a long history does not
# turn into an endless backlog of cards the learner never asked to study.
NEW_CARD_DECK_WINDOW = 10


class ReviewRatingSerializer(serializers.Serializer):
    generation_id = serializers.IntegerField()
    card_index = serializers.IntegerField(min_value=0)
    rating = serializers.ChoiceField(choices=RATINGS)


def _deck_cards(generation):
    cards = generation.result.get("flashcards") if isinstance(generation.result, dict) else None
    return cards if isinstance(cards, list) else []


def _card_payload(generation, index, card, review):
    return {
        "generation_id": generation.id,
        "card_index": index,
        "topic": generation.topic,
        "front": card.get("front", ""),
        "back": card.get("back", ""),
        "hint": card.get("hint", ""),
        "is_new": review is None,
        "due_at": review.due_at if review else None,
    }


class DueCardsView(APIView):
    """GET /api/flashcards/review/ — the cards to study now.

    Overdue cards come first (oldest due first), then never-reviewed cards from
    the newest decks. `?generation_id=` limits the session to one deck and
    `?limit=` caps its size. `due_count` and `new_count` describe everything
    available, not just this page.
    """

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", DEFAULT_REVIEW_LIMIT))
        except ValueError:
            limit = DEFAULT_REVIEW_LIMIT
        limit = max(1, min(MAX_REVIEW_LIMIT, limit))

        decks = Generation.objects.filter(user=request.user, type="flashcards")
        generation_id = request.query_params.get("generation_id")
        if generation_id:
            if not generation_id.isdigit():
                return Response(
                    {"error": "generation_id must be a number"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            decks = decks.filter(id=int(generation_id))
        else:
            decks = decks[:NEW_CARD_DECK_WINDOW]
        decks = list(decks)
        deck_by_id = {deck.id: deck for deck in decks}

        reviews = {
            (r.generation_id, r.card_index): r
            for r in CardReview.objects.filter(user=request.user, generation_id__in=deck_by_id)
        }

        now = timezone.now()
        due, new = [], []
        for deck in decks:
            for index, card in enumerate(_deck_cards(deck)):
                review = reviews.get((deck.id, index))
                if review is None:
                    new.append(_card_payload(deck, index, card, None))
                elif review.due_at <= now:
                    due.append(_card_payload(deck, index, card, review))

        due.sort(key=lambda c: c["due_at"])
        return Response(
            {
                "cards": (due + new)[:limit],
                "due_count": len(due),
                "new_count": len(new),
            }
        )


class ReviewCardView(APIView):
    """POST /api/flashcards/review/ — record how well a card was recalled."""

    def post(self, request):
        serializer = ReviewRatingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        generation = get_object_or_404(
            Generation, id=data["generation_id"], user=request.user, type="flashcards"
        )
        if data["card_index"] >= len(_deck_cards(generation)):
            return Response(
                {"error": "That card does not exist in this deck."},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()
        with transaction.atomic():
            review, _ = CardReview.objects.select_for_update().get_or_create(
                generation=generation,
                card_index=data["card_index"],
                defaults={"user": request.user, "due_at": now},
            )
            state, due_at = schedule(
                CardState(review.ease, review.interval_days, review.repetitions, review.lapses),
                data["rating"],
                now,
            )
            review.ease = state.ease
            review.interval_days = state.interval_days
            review.repetitions = state.repetitions
            review.lapses = state.lapses
            review.due_at = due_at
            review.save()

        return Response(
            {
                "generation_id": generation.id,
                "card_index": review.card_index,
                "interval_days": review.interval_days,
                "due_at": review.due_at,
            }
        )
