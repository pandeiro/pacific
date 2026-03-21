"""Shared utilities for scrapers."""

import re


# Common typos found in source data from whale watch operators.
# These are applied before species extraction regex patterns run.
SPECIES_TYPO_MAP = [
    # Whale misspellings
    (r"\bWhahles?\b", "Whales"),
    (r"\bWhlaes?\b", "Whales"),
    (r"\bWHales?\b", "Whales"),
    (r"\bWhaleS\b", "Whales"),
    # Dolphin misspellings
    (r"\bDOlphins?\b", "Dolphins"),
    (r"\bDOLPHINS\b", "Dolphins"),
    # Common case issues
    (r"\bWhitesided\b", "White-sided"),
    (r"\bWhitesided\b", "White-sided"),  # already lowercase
]

# Pre-compile for speed
_TYPO_RE = [(re.compile(p, re.IGNORECASE), r) for p, r in SPECIES_TYPO_MAP]


def normalize_species_text(text: str) -> str:
    """Fix common typos in source data before species extraction.

    Applied at the start of parsing so downstream regex patterns
    (SPECIES_PATTERNS, parse_species_list, etc.) match correctly.

    Preserves the original in raw_text; only the normalized version
    is used for species extraction.
    """
    for pattern, replacement in _TYPO_RE:
        text = pattern.sub(replacement, text)
    return text
