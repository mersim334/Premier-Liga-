from __future__ import annotations

from fastapi import APIRouter

from app.domain.football import public_rules_payload

router = APIRouter()


@router.get(
    "",
    summary="Osnovna pravila fudbala ugrađena u model",
    description=(
        "Sažetak po IFAB Laws of the Game i ligaškim konvencijama koje ovaj API "
        "poštuje (trajanje, bodovi, ograničenja dema)."
    ),
)
def get_football_rules():
    return public_rules_payload()
