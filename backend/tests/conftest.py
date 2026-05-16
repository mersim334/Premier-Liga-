import os
import sys
from pathlib import Path

import pytest

# backend/ kao cwd za uvoz app.*
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "")
