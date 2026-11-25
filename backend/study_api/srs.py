"""Spaced-repetition scheduling for flashcards.

A small SM-2 variant. Each card carries an ease factor (how fast its interval
grows) and an interval in days. After every review the learner rates recall,
and the next due time follows from that rating:

* again - forgot it: relearn in ten minutes, ease drops, repetitions reset.
* hard  - recalled with effort: interval grows slowly, ease drops a little.
* good  - recalled: 1 day, then 3 days, then interval x ease.
* easy  - recalled instantly: bigger jump, ease rises.

Kept free of Django so the rules can be tested without a database.
"""

from dataclasses import dataclass, replace
from datetime import datetime, timedelta

RATINGS = ("again", "hard", "good", "easy")

DEFAULT_EASE = 2.5
MIN_EASE = 1.3
MAX_INTERVAL_DAYS = 365
RELEARN_DELAY = timedelta(minutes=10)


@dataclass(frozen=True)
class CardState:
    ease: float = DEFAULT_EASE
    interval_days: int = 0
    repetitions: int = 0
    lapses: int = 0


def schedule(state: CardState, rating: str, now: datetime) -> tuple[CardState, datetime]:
    """Return the card's new state and when it is next due."""
    if rating not in RATINGS:
        raise ValueError(f"rating must be one of {', '.join(RATINGS)}")

    if rating == "again":
        new = replace(
            state,
            ease=max(MIN_EASE, state.ease - 0.2),
            interval_days=0,
            repetitions=0,
            lapses=state.lapses + 1,
        )
        return new, now + RELEARN_DELAY

    repetitions = state.repetitions + 1
    base = max(state.interval_days, 1)
    if rating == "hard":
        ease = max(MIN_EASE, state.ease - 0.15)
        interval = round(base * 1.2)
    elif rating == "good":
        ease = state.ease
        interval = {1: 1, 2: 3}.get(repetitions) or round(base * ease)
    else:  # easy
        ease = state.ease + 0.15
        interval = 4 if repetitions == 1 else round(base * ease * 1.3)

    interval = max(1, min(MAX_INTERVAL_DAYS, interval))
    new = replace(state, ease=round(ease, 2), interval_days=interval, repetitions=repetitions)
    return new, now + timedelta(days=interval)
