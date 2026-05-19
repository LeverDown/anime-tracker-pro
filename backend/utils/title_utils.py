"""
title_utils.py
──────────────
Phase 6: Title normalisation utilities.

Provides ``compute_sort_title(title)`` which generates a stable, normalised sort
key from any display title, and ``get_display_title(anime, preference)`` which
returns the appropriate title string based on a user's title preference setting.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Leading articles to strip (case-insensitive) ─────────────────────────────
_ARTICLES = re.compile(r"^(the|a|an)\s+", re.IGNORECASE)

# ── Season/part suffix normalisation ─────────────────────────────────────────
# All of these will be replaced with " s<N>" (lowercase).
_SEASON_PATTERNS = [
    # "2nd Season", "3rd Season", "4th Season" …
    (re.compile(r"\b(\d+)(?:st|nd|rd|th)\s+season\b", re.IGNORECASE),
     lambda m: f" s{m.group(1)}"),
    # "Season 2", "Season II"
    (re.compile(r"\bseason\s+(\d+|[IVXivx]+)\b", re.IGNORECASE),
     lambda m: f" s{_roman_or_int(m.group(1))}"),
    # "Part 2", "Part II"
    (re.compile(r"\bpart\s+(\d+|[IVXivx]+)\b", re.IGNORECASE),
     lambda m: f" s{_roman_or_int(m.group(1))}"),
    # "2nd Cour", "3rd Cour"
    (re.compile(r"\b(\d+)(?:st|nd|rd|th)\s+cour\b", re.IGNORECASE),
     lambda m: f" s{m.group(1)}"),
]

# ── Roman numeral map (limited to likely anime season numbers) ────────────────
_ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5,
          "vi": 6, "vii": 7, "viii": 8, "ix": 9, "x": 10}

# ── Punctuation stripper (keep alphanumeric and spaces) ──────────────────────
_PUNCT = re.compile(r"[^a-z0-9 ]")


def _roman_or_int(s: str) -> int:
    """Convert a roman numeral or digit string to an integer."""
    lower = s.lower()
    if lower in _ROMAN:
        return _ROMAN[lower]
    try:
        return int(s)
    except ValueError:
        return 0


def compute_sort_title(title: Optional[str]) -> str:
    """
    Produce a normalised sort key from a display title.

    Steps applied in order:
      1. Strip leading articles (``"The "``, ``"A "``, ``"An "``).
      2. Normalise season/part suffixes → ``"s<N>"`` format.
      3. Lowercase everything.
      4. Strip all punctuation except alphanumeric characters and spaces.
      5. Collapse multiple spaces into one and strip surrounding whitespace.

    Args:
        title: The raw display title (English preferred, romaji fallback).

    Returns:
        A normalised lowercase string suitable for lexicographic sorting.
        Returns ``""`` if input is None or empty.

    Examples::

        compute_sort_title("The Rising of the Shield Hero 2nd Season")
        → "rising of the shield hero s2"

        compute_sort_title("Sword Art Online: Alicization")
        → "sword art online alicization"
    """
    if not title:
        return ""

    s = title.strip()

    # Step 1: Strip leading article
    s = _ARTICLES.sub("", s)

    # Step 2: Normalise season/part suffixes
    for pattern, replacement in _SEASON_PATTERNS:
        s = pattern.sub(replacement, s)

    # Step 3: Lowercase
    s = s.lower()

    # Step 4: Strip punctuation
    s = _PUNCT.sub(" ", s)

    # Step 5: Collapse whitespace
    s = re.sub(r"\s+", " ", s).strip()

    return s


def get_display_title(
    title_english: Optional[str],
    title_romaji: Optional[str],
    title_native: Optional[str],
    preference: str = "english",
) -> str:
    """
    Return the appropriate display title based on a user's preference setting.

    Fallback chain:
      - ``"english"``:  ``title_english`` → ``title_romaji``
      - ``"romaji"``:   ``title_romaji``
      - ``"native"``:   ``title_native``  → ``title_romaji``
      - Unknown:        same as ``"english"``

    Args:
        title_english: English title (may be None).
        title_romaji:  Romanised title (should rarely be None).
        title_native:  Native-script title (often None for older entries).
        preference:    User setting: ``"english"``, ``"romaji"``, or ``"native"``.

    Returns:
        Best available display title as a string.
    """
    if preference == "romaji":
        return title_romaji or title_english or ""
    if preference == "native":
        return title_native or title_romaji or title_english or ""
    # Default: "english"
    return title_english or title_romaji or ""
