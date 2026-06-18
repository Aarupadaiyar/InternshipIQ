from typing import Dict, Any, List
import os
import sys

# Ensure backend path is on sys.path if this is run independently
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.parsers.resume.skill_extractor import extract_skills

def match_job(user_skills: List[str], jd_text: str) -> Dict[str, Any]:
    """Matches a parsed resume against a Job Description."""
    
    # 1. Extract required skills from JD
    jd_extracted = extract_skills(jd_text)
    jd_required_skills = set()
    for cat, skills in jd_extracted.items():
        for s in skills:
            jd_required_skills.add(s["skill"])
            
    user_skills_set = set(s.lower() for s in user_skills)
    
    matched = []
    missing = []
    
    for req in jd_required_skills:
        if req.lower() in user_skills_set:
            matched.append(req)
        else:
            missing.append(req)
            
    match_score = int((len(matched) / len(jd_required_skills)) * 100) if jd_required_skills else 0
    readiness_score = match_score  # In future could incorporate experience years, etc.
    
    return {
        "match_score": match_score,
        "matched_skills": matched,
        "missing_skills": missing,
        "readiness_score": readiness_score
    }
