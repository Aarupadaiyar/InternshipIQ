import re
from typing import Dict, Any

# Regex patterns for contact information
EMAIL_REGEX = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
PHONE_REGEX = re.compile(r'(\+?\d[\d\s\-().]{7,}\d)')
URL_REGEX = re.compile(r'(https?://[\w./?=&-]+)')
# Name regex allowing initials (e.g. K. J., KJ) and basic full names
NAME_REGEX = re.compile(r'^[A-Z][a-zA-Z\-\']+(?:\s+(?:[A-Z][a-zA-Z\-\']*|[A-Z]\.?)+)+$')

def _candidate_name(lines: list) -> tuple:
    """Select best name candidate from top 25% of lines.
    Returns (name, confidence).
    """
    if not lines:
        return None, 0.0
    cutoff = max(1, int(len(lines) * 0.25))
    top_lines = lines[:cutoff]
    
    # Filter out lines containing email, phone or URLs
    filtered = []
    for line in top_lines:
        if EMAIL_REGEX.search(line) or PHONE_REGEX.search(line) or URL_REGEX.search(line):
            continue
        # Also filter out lines that just look like protocol-less urls
        if re.search(r'(linkedin\.com|github\.com)', line.lower()):
            continue
        filtered.append(line.strip())
    
    if filtered:
        # Prioritize lines that actually match our name pattern
        for candidate in filtered:
            if NAME_REGEX.match(candidate):
                return candidate, 0.9
        # Fallback to longest line if no regex match (with lower confidence)
        candidate = max(filtered, key=lambda l: len(l))
        return candidate, 0.6
    return None, 0.0

def extract_entities(text: str) -> Dict[str, Any]:
    """Extract name, email, and phone from raw resume text.
    Returns a dict where each key maps to {'value': ..., 'confidence': ...}.
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    result: Dict[str, Any] = {}

    # Email – first occurrence
    email_match = EMAIL_REGEX.search(text)
    if email_match:
        result['email'] = {'value': email_match.group(0), 'confidence': 1.0}
    else:
        result['email'] = {'value': None, 'confidence': 0.0}

    # Phone – first occurrence
    phone_match = PHONE_REGEX.search(text)
    if phone_match:
        result['phone'] = {'value': phone_match.group(0), 'confidence': 1.0}
    else:
        result['phone'] = {'value': None, 'confidence': 0.0}

    # Name – header based detection
    name_val, name_conf = _candidate_name(lines)
    result['name'] = {'value': name_val, 'confidence': name_conf}
    return result
