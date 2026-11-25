from datetime import UTC, datetime, timedelta

import pytest

from study_api.srs import MIN_EASE, CardState, schedule

NOW = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)


def test_good_ladder_one_then_three_then_scaled_by_ease():
    state = CardState()
    state, due = schedule(state, "good", NOW)
    assert (state.interval_days, due) == (1, NOW + timedelta(days=1))
    state, _ = schedule(state, "good", NOW)
    assert state.interval_days == 3
    state, _ = schedule(state, "good", NOW)
    assert state.interval_days == round(3 * 2.5)


def test_again_resets_progress_and_is_due_in_ten_minutes():
    state = CardState(ease=2.5, interval_days=20, repetitions=4, lapses=1)
    new, due = schedule(state, "again", NOW)
    assert (new.interval_days, new.repetitions, new.lapses) == (0, 0, 2)
    assert new.ease == pytest.approx(2.3)
    assert due == NOW + timedelta(minutes=10)


def test_ease_never_drops_below_minimum():
    state = CardState(ease=MIN_EASE)
    assert schedule(state, "again", NOW)[0].ease == MIN_EASE
    assert schedule(state, "hard", NOW)[0].ease == MIN_EASE


def test_hard_grows_slower_than_good_and_easy_faster():
    state = CardState(ease=2.5, interval_days=10, repetitions=3)
    hard = schedule(state, "hard", NOW)[0]
    good = schedule(state, "good", NOW)[0]
    easy = schedule(state, "easy", NOW)[0]
    assert hard.interval_days < good.interval_days < easy.interval_days
    assert easy.ease > good.ease > hard.ease


def test_first_easy_review_jumps_four_days():
    assert schedule(CardState(), "easy", NOW)[0].interval_days == 4


def test_interval_is_capped():
    state = CardState(ease=3.0, interval_days=300, repetitions=9)
    assert schedule(state, "easy", NOW)[0].interval_days == 365


def test_unknown_rating_rejected():
    with pytest.raises(ValueError):
        schedule(CardState(), "perfect", NOW)
