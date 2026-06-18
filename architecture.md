# Architecture Overview

## High‑Level Data Flow
```
Upload Resume → Extraction (PDF/DOCX) → Layout Detection → Section Classification → Entity Extraction → Skill Taxonomy Matching → Hidden Skill Inference → Validation (confidence ≥ 0.85) → SQLite Storage → Recommendation & Gap Analysis → JSON Response
```

- **Backend**: FastAPI (sync endpoint `/resume/parse`). All processing performed in‑process.
- **Database**: SQLite file `resume_parser.db` with a single table `resume_parsed` (JSONB column) to store the structured output.
- **Modules** (`backend/app/parsers/resume/`):
  - `extractors/` – PDF/DOCX wrappers.
  - `layout_detector.py` – column/section detection.
  - `section_classifier.py` – rule‑based + LLM classifier.
  - `entity_extractor.py` – regex + spaCy NER for contact info.
  - `skill_taxonomy.py` – static skill dictionary (technical + non‑technical).
  - `skill_extractor.py` – exact & fuzzy matching.
  - `inferred_skill_engine.py` – heuristic inference from experience bullets.
  - `recommendation_engine.py` – role recommendation based on extracted data.
  - `gap_analysis.py` – compare existing skills with target role.
  - `feedback_engine.py` – ATS score & improvement suggestions.
  - `models.py` – Pydantic schemas for the final JSON payload.
  - `router.py` – FastAPI router exposing `/resume/parse`.

## Confidence Handling
All extracted fields include:
```json
{ "value": "...", "confidence": 0.92, "status": "ok" }
```
If `confidence < 0.85`, `status` becomes `review_required` and the field is flagged in the response.

## Extensibility
- New extractors can be added under `extractors/`.
- Skill taxonomy can be extended via `skill_taxonomy.py` or external JSON file.
- Recommendation rules are data‑driven and can be updated without code changes.
