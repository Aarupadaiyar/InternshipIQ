from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Iterable

# Typo tolerance dictionary
TYPOS: dict[str, str] = {
    "googel": "google",
    "microsft": "microsoft",
    "pythn": "python",
    "machin learnng": "machine learning",
    "pwer bi": "power bi",
}

# Alias dictionary (bi-directional mapping support)
SYNONYMS: dict[str, list[str]] = {
    # Short -> Long
    "ml": ["machine learning", "ml engineer", "ai / ml"],
    "ai": ["artificial intelligence", "ai engineer", "machine learning"],
    "ds": ["data science", "data scientist"],
    "swe": ["software engineer", "software developer", "sde"],
    "sde": ["software development engineer", "software engineer", "sde intern"],
    "nlp": ["natural language processing", "ai"],
    "cv": ["computer vision", "opencv"],
    "bi": ["business intelligence", "power bi", "tableau"],
    "pm": ["product manager", "product management", "program manager"],
    "qa": ["quality assurance", "qa engineer", "testing"],
    "fe": ["frontend", "frontend developer", "react"],
    "be": ["backend", "backend developer", "server-side"],
    "fs": ["full stack", "fullstack", "full stack developer"],
    # Long -> Short
    "machine learning": ["ml", "ai / ml"],
    "artificial intelligence": ["ai"],
    "data science": ["ds"],
    "software engineer": ["swe", "sde"],
    "software development engineer": ["sde", "swe"],
    "natural language processing": ["nlp"],
    "computer vision": ["cv"],
    "business intelligence": ["bi", "power bi"],
    "product manager": ["pm"],
    "quality assurance": ["qa"],
    "frontend": ["fe"],
    "backend": ["be"],
    "full stack": ["fs"],
    "power bi": ["pwer bi", "bi"],
}

AUTOCOMPLETE_TERMS = sorted(set([
    "Machine Learning", "ML Engineer", "AI Engineer", "Artificial Intelligence",
    "Data Science", "Data Scientist", "NLP", "Computer Vision", "LLM Engineer",
    "Software Engineer", "Backend Developer", "Frontend Developer", "Full Stack Developer",
    "Product Manager", "Program Manager", "Prompt Engineer", "Python", "React",
    "Node.js", "FastAPI", "TensorFlow", "PyTorch", "Marketing", "Mobile Development",
    "Cloud", "DevOps", "Cybersecurity", "QA Testing", "Data Analytics",
] + [term for values in SYNONYMS.values() for term in values]))

RELATED_FILTERS: dict[str, dict[str, list[str]]] = {
    "machine learning": {"skills": ["Python", "TensorFlow", "PyTorch", "Data Science"], "domains": ["AI / ML", "Data Science"]},
    "ml": {"skills": ["Python", "TensorFlow", "PyTorch", "Data Science"], "domains": ["AI / ML", "Data Science"]},
    "ai": {"skills": ["Python", "LLM", "Transformers", "Machine Learning"], "domains": ["AI / ML", "Data Science"]},
    "frontend": {"skills": ["React", "Next.js", "TypeScript", "CSS"], "domains": ["Frontend", "Full Stack"]},
    "backend": {"skills": ["Python", "Node.js", "FastAPI", "PostgreSQL"], "domains": ["Backend", "Full Stack"]},
    "product manager": {"skills": ["SQL", "Excel", "Figma", "Product Analytics"], "domains": ["Business Analyst", "Marketing"]},
}


def normalize_query(query: str) -> str:
    return re.sub(r"\s+", " ", query.lower().strip())


def correct_typos(query: str) -> str:
    """Corrects known typos in the search query."""
    q = normalize_query(query)
    for typo, correction in TYPOS.items():
        q = re.sub(r"\b" + re.escape(typo) + r"\b", correction, q)
    return q


def expand_query(query: str) -> list[str]:
    """Corrects typos and expands search query with synonyms and aliases."""
    corrected = correct_typos(query)
    terms = {corrected}
    # Check exact matching key
    if corrected in SYNONYMS:
        terms.update(SYNONYMS[corrected])
    # Check substring mapping
    for key, values in SYNONYMS.items():
        if corrected == key or corrected in key or key in corrected:
            terms.update(values)
    return [term for term in terms if term]


def tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9+#.]+", text.lower()))


def levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        return levenshtein(b, a)
    if not b:
        return len(a)
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        previous = current
    return previous[-1]


def fuzzy_contains(term: str, text: str) -> bool:
    term = normalize_query(term)
    if len(term) < 4:
        return term in text
    if term in text:
        return True
    term_tokens = tokenize(term)
    target_tokens = tokenize(text)
    for token in term_tokens:
        max_dist = 1 if len(token) < 7 else 2
        if not any(levenshtein(token, target) <= max_dist or token in target or target in token for target in target_tokens):
            return False
    return True


def semantic_score(query_terms: Iterable[str], text: str) -> float:
    query_tokens = set()
    for term in query_terms:
        query_tokens |= tokenize(term)
    text_tokens = tokenize(text)
    if not query_tokens or not text_tokens:
        return 0.0
    overlap = len(query_tokens & text_tokens)
    return overlap / math.sqrt(len(query_tokens) * len(text_tokens))


def recency_score(posted_at: str) -> float:
    try:
        posted = datetime.fromisoformat(posted_at[:10]).replace(tzinfo=timezone.utc)
        days = max((datetime.now(timezone.utc) - posted).days, 0)
        return max(0.0, 1.0 - (days / 60))
    except Exception:
        return 0.2


def quality_score(job) -> float:
    score = 0.0
    if getattr(job, "verification_status", "") == "VERIFIED":
        score += 0.35
    if getattr(job, "application_url", "") and getattr(job, "application_url", "") != getattr(job, "source_url", ""):
        score += 0.2
    if getattr(job, "salary_min", None) is not None:
        score += 0.15
    if len(getattr(job, "description", "") or "") > 160:
        score += 0.15
    if getattr(job, "source_type", "") == "TYPE_B":
        score += 0.15
    return score


def score_job(job, query: str, user_skills: list[str] | None = None) -> float:
    terms = expand_query(query)
    haystack = " ".join([
        getattr(job, "title", ""),
        getattr(job, "company", ""),
        getattr(job, "domain", ""),
        getattr(job, "location", ""),
        getattr(job, "source", ""),
        " ".join(getattr(job, "required_skills", []) or []),
        getattr(job, "description", ""),
    ]).lower()
    relevance = 0.0
    for term in terms:
        if term in getattr(job, "title", "").lower():
            relevance += 4.0
        if term in getattr(job, "domain", "").lower():
            relevance += 2.5
        if any(term in skill.lower() for skill in getattr(job, "required_skills", []) or []):
            relevance += 2.0
        if fuzzy_contains(term, haystack):
            relevance += 1.0
    relevance += semantic_score(terms, haystack) * 5.0

    skill_match = 0.0
    if user_skills:
        required = [s.lower() for s in getattr(job, "required_skills", []) or []]
        owned = [s.lower() for s in user_skills]
        matched = sum(1 for req in required if any(req in skill or skill in req for skill in owned))
        skill_match = matched / max(len(required), 1)

    return (relevance * 0.55) + (skill_match * 2.0) + (recency_score(getattr(job, "posted_at", "")) * 1.25) + (quality_score(job) * 1.25)


def autocomplete(prefix: str, limit: int = 8) -> list[str]:
    q = normalize_query(prefix)
    if not q:
        return []
    starts = [term for term in AUTOCOMPLETE_TERMS if term.lower().startswith(q)]
    contains = [term for term in AUTOCOMPLETE_TERMS if q in term.lower() and term not in starts]
    return (starts + contains)[:limit]


def related_filters(query: str) -> dict[str, list[str]]:
    normalized = normalize_query(query)
    for key, filters in RELATED_FILTERS.items():
        if normalized == key or normalized in key or key in normalized:
            return filters
    return {"skills": [], "domains": []}
