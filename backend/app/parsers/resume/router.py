from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi import Depends
from app.database.session import get_db
from sqlalchemy.orm import Session
import json
from .models import ResumeParseResult
from .extractors.pdf_extractor import extract_pdf
from .extractors.docx_extractor import extract_docx
from .extractors.docling_extractor import extract_docling
from .fallback_extractor import extract_fallback
from .entity_extractor import extract_entities
from .skill_extractor import extract_skills
from .recommendation_engine import generate_recommendations
from .gap_analysis import analyze_gap
from .feedback_engine import generate_ats_feedback

router = APIRouter(prefix="/resume", tags=["Resume Parsing"])

@router.post("/parse", response_model=ResumeParseResult)
async def parse_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Parse an uploaded resume and store the result.

    Supported formats: PDF, DOCX, other (fallback).
    """
    # Basic validation
    filename = file.filename.lower()
    if not (filename.endswith('.pdf') or filename.endswith('.docx') or filename.endswith('.txt')):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or DOCX.")

    # Read content into memory (size limit 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Limit 5MB.")

    # Choose extractor
    if filename.endswith('.pdf'):
        try:
            raw_text = extract_pdf(content)
        except Exception:
            raw_text = extract_fallback(content)
    elif filename.endswith('.docx'):
        try:
            raw_text = extract_docx(content)
        except Exception:
            raw_text = extract_fallback(content)
    else:
        raw_text = extract_fallback(content)

    # Entity extraction (name, email, phone, socials)
    entity = extract_entities(raw_text)

    # Skill extraction
    skills = extract_skills(raw_text)

    # TODO: layout/section detection and further parsing – omitted for brevity
    # Build base result
    result = {
        "version": 1,
        "entity": entity,
        "skills": skills,
        "education": [],
        "experience": [],
        "projects": [],
        "recommendations": [],
        "gap_analysis": None,
        "ats_feedback": {},
        "raw_text": raw_text,
        "confidence": 0.9,
    }

    # Recommendations (optional LLM – skip if unavailable)
    recommendations = generate_recommendations(entity, skills)
    result["recommendations"] = recommendations

    # Gap analysis – will be invoked later by frontend with target role
    # ATS feedback
    result["ats_feedback"] = generate_ats_feedback(raw_text)

    # Persist to DB (resume_parsed table)
    from app.models.resume_profile import ResumeParsed
    parsed_json = json.dumps(result)
    # Use a placeholder candidate_id; adjust as needed when linking to actual user
    candidate_id = entity.get('candidate_id') if isinstance(entity, dict) else None
    new_entry = ResumeParsed(candidate_id=candidate_id or 0, parsed_json=parsed_json)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return result
