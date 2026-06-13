from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta

from app.core.data import ALIASES


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def clean_city(value: str) -> str:
    if not value:
        return ""
    name = value.split("·")[0].strip()
    name = re.sub(r"\([^)]*\)", "", name).strip()
    name = re.sub(r"\s+", " ", name)
    return ALIASES.get(name.lower(), name.title())


def parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")


def display_time(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def plus_minutes(dt: datetime, minutes: int) -> datetime:
    return dt + timedelta(minutes=minutes)
