import re


def duration_seconds(value):
    """Normalize seconds, M:SS, or H:MM:SS; unknown durations stay unknown."""
    text = str(value or "").strip()
    if not re.fullmatch(r"\d{1,6}(?::\d{2}){0,2}", text):
        return None
    parts = [int(part) for part in text.split(":")]
    if len(parts) > 1 and any(part >= 60 for part in parts[1:]):
        return None
    total = 0
    for part in parts:
        total = total * 60 + part
    return total if total <= 2147483647 else None
