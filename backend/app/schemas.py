from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.football import (
    REGULATION_MINUTES,
    assert_match_scores_valid,
    assert_regulation_event_minute,
)


class SeasonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_date: date
    end_date: Optional[date] = None
    is_current: bool
    created_at: datetime
    updated_at: datetime


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    city: Optional[str] = None
    stadium: Optional[str] = None
    coach: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    season_id: int
    round_no: int
    match_date: date
    kickoff_at: Optional[datetime] = None
    home_team_id: int
    away_team_id: int
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    regulation_minutes: int = Field(
        default=REGULATION_MINUTES,
        description="Regularno trajanje (dva poluvremena po 45 min).",
    )

    @model_validator(mode="after")
    def _home_and_away_must_differ(self) -> MatchOut:
        if self.home_team_id == self.away_team_id:
            raise ValueError(
                "Utakmica mora imati dva različita kluba: domaćin i gost ne mogu biti isti tim."
            )
        return self

    @model_validator(mode="after")
    def _scores_valid_for_status(self) -> MatchOut:
        assert_match_scores_valid(self.status, self.home_goals, self.away_goals)
        return self


class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    season_id: int
    team_id: int
    full_name: str
    shirt_number: Optional[int] = None
    position: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MatchEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    team_id: int
    minute: int
    minute_added: Optional[int] = None
    event_type: str
    player_id: Optional[int] = None
    related_player_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def _minute_in_regulation(self) -> MatchEventOut:
        assert_regulation_event_minute(self.minute, self.minute_added)
        return self


MatchRefereeRole = Literal[
    "main",
    "assistant_1",
    "assistant_2",
    "fourth_official",
]


class RefereeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    created_at: datetime
    updated_at: datetime


class MatchRefereeAssignmentOut(BaseModel):
    """Jedan sudija na utakmici (uloga + ime za prikaz)."""

    model_config = ConfigDict(from_attributes=True)

    match_id: int
    role: MatchRefereeRole
    referee_id: int
    referee_full_name: str


class StandingsRowOut(BaseModel):
    """Jedan red ligaške tablice (izračunato iz utakmica)."""

    model_config = ConfigDict(from_attributes=True)

    rank: int
    team_id: int
    team_name: str
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int
