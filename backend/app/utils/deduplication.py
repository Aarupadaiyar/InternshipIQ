from __future__ import annotations
import re
from typing import List

def normalize_text(text: str) -> str:
    """Lowercase and remove non-alphanumeric characters and extra spaces."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    return " ".join(text.split())

def normalize_company(name: str) -> str:
    """Normalize company name by removing common business suffixes."""
    normalized = normalize_text(name)
    suffixes = [
        "inc", "ltd", "pvt", "co", "corporation", "corp", "software",
        "technologies", "technology", "services", "solutions", "limited", "private"
    ]
    words = normalized.split()
    filtered_words = [w for w in words if w not in suffixes]
    return " ".join(filtered_words) if filtered_words else normalized

def normalize_title(title: str) -> str:
    """Normalize job title by removing internship/hiring terms and level indicators."""
    normalized = normalize_text(title)
    terms = ["intern", "internship", "hiring", "coop", "junior", "jr", "senior", "sr", "opportunity", "role", "program"]
    words = normalized.split()
    filtered_words = [w for w in words if w not in terms]
    return " ".join(filtered_words) if filtered_words else normalized

def calculate_jaccard_similarity(text1: str, text2: str) -> float:
    """Calculate Jaccard Similarity coefficient between two texts."""
    # Tokenize and keep words with length >= 3
    words1 = set([w for w in normalize_text(text1).split() if len(w) >= 3])
    words2 = set([w for w in normalize_text(text2).split() if len(w) >= 3])
    
    if not words1 or not words2:
        return 0.0
        
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)

def is_duplicate(
    job1: dict | object,
    job2: dict | object
) -> bool:
    """
    Check if two job listings are duplicates based on:
    - Company similarity
    - Title similarity
    - Location overlap
    - Description word similarity (Jaccard similarity > 75%)
    """
    # Handle both dict objects (scraped jobs) and model objects (existing jobs)
    def get_val(obj, key, default=""):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    # 1. Exact ID match (source_job_id / external_id)
    ext_id1 = get_val(job1, "external_id")
    ext_id2 = get_val(job2, "external_id")
    if ext_id1 and ext_id2 and ext_id1 == ext_id2:
        return True

    # 2. Company comparison
    comp1 = normalize_company(get_val(job1, "company"))
    comp2 = normalize_company(get_val(job2, "company"))
    if not comp1 or not comp2 or comp1 != comp2:
        return False

    # 3. Job Title comparison
    title1 = normalize_title(get_val(job1, "title"))
    title2 = normalize_title(get_val(job2, "title"))
    # Check if they are similar. If titles don't share at least one keyword, they are different roles
    words_title1 = set(title1.split())
    words_title2 = set(title2.split())
    if not words_title1.intersection(words_title2):
        return False

    # 4. Location comparison (if one is remote and other is onsite, they are different listings)
    loc1 = get_val(job1, "location").lower()
    loc2 = get_val(job2, "location").lower()
    is_remote1 = "remote" in loc1 or "work from home" in loc1
    is_remote2 = "remote" in loc2 or "work from home" in loc2
    if is_remote1 != is_remote2:
        return False

    # 5. Description similarity
    desc1 = get_val(job1, "description", "")
    desc2 = get_val(job2, "description", "")
    
    similarity = calculate_jaccard_similarity(desc1, desc2)
    return similarity > 0.40
