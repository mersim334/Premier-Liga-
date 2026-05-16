import sys
from pathlib import Path

import pytest

# backend/ kao cwd za uvoz app.*
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Nemoj globano postavljati DATABASE_URL="" — Pydantic bi time pregazio backend/.env.
# tests/test_api_mock.py eksplicitno monkeypatchuje prazan DATABASE_URL gdje je potrebno.
