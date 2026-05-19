from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


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
