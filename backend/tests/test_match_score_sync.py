from app.services.match_score_sync import (
    compute_goals_from_events,
    match_goals_for_db,
)


def test_compute_goals_goal_and_own_goal():
    ev = [
        {"minute": 1, "minute_added": None, "id": 1, "event_type": "goal", "team_id": 10},
        {
            "minute": 30,
            "minute_added": None,
            "id": 2,
            "event_type": "own_goal",
            "team_id": 10,
        },
    ]
    # domaćin 10, gost 20: gol za 10 → 1:0; autogol igrača 10 → gol za 20 → 1:1
    assert compute_goals_from_events(ev, 10, 20) == (1, 1)


def test_compute_goals_penalty():
    ev = [
        {
            "minute": 90,
            "minute_added": 2,
            "id": 1,
            "event_type": "penalty_scored",
            "team_id": 20,
        },
    ]
    assert compute_goals_from_events(ev, 10, 20) == (0, 1)


def test_match_goals_for_db_empty_scheduled():
    assert match_goals_for_db([], 1, 2, match_status="scheduled") == (None, None)


def test_match_goals_for_db_empty_finished():
    assert match_goals_for_db([], 1, 2, match_status="finished") == (0, 0)


def test_match_goals_for_db_only_cards():
    ev = [
        {
            "minute": 5,
            "minute_added": None,
            "id": 1,
            "event_type": "yellow_card",
            "team_id": 10,
        },
    ]
    assert match_goals_for_db(ev, 10, 20, match_status="scheduled") == (0, 0)
