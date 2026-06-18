import os
import sys
import json
import pathlib
from typing import List, Dict, Any

# Ensure the backend app package is on PYTHONPATH
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.parsers.resume.entity_extractor import extract_entities
from app.parsers.resume.skill_extractor import extract_skills
from app.parsers.resume.social_link_extractor import extract_social_links
from app.parsers.resume.extractors.pdf_extractor import extract_pdf, extract_pdf_links
from app.parsers.resume.extractors.docx_extractor import extract_docx

# Helper to load file content
def load_file(path: str) -> bytes:
    with open(path, 'rb') as f:
        return f.read()

def parse_resume_file(file_path: str) -> Dict[str, Any]:
    ext = pathlib.Path(file_path).suffix.lower()
    if ext == '.pdf':
        try:
            raw_text, pdf_type = extract_pdf(load_file(file_path))
            hyperlinks = extract_pdf_links(load_file(file_path))
        except Exception as e:
            # Fallback if tuple isn't returned
            res = extract_pdf(load_file(file_path))
            if isinstance(res, tuple):
                raw_text, pdf_type = res
            else:
                raw_text = res
                pdf_type = None
            hyperlinks = extract_pdf_links(load_file(file_path))
    elif ext == '.docx':
        raw_text = extract_docx(load_file(file_path))
        pdf_type = None
        hyperlinks = []
    else:
        raw_text = load_file(file_path).decode(errors='ignore')
        pdf_type = None
        hyperlinks = []
        
    # Extract entities
    entity = extract_entities(raw_text)
    # Extract skills
    skills = extract_skills(raw_text)
    # Extract social links passing hyperlinks
    social = extract_social_links(raw_text, hyperlinks)
    
    # Assemble result with dynamic confidence scores
    confidence_scores = {
        'name': entity.get('name', {}).get('confidence', 0.0),
        'email': entity.get('email', {}).get('confidence', 0.0),
        'phone': entity.get('phone', {}).get('confidence', 0.0),
        'social': {k: v.get('confidence', 0.0) for k, v in social.items()},
        'skills': 1.0,
        'pdf_type': pdf_type
    }
    result = {
        "name": entity.get('name'),
        "email": entity.get('email'),
        "phone": entity.get('phone'),
        "linkedin": social.get('linkedin'),
        "github": social.get('github'),
        "portfolio": social.get('portfolio'),
        "technical_skills": skills.get('technical_skills', []),
        "frameworks": skills.get('frameworks', []),
        "tools": skills.get('tools', []),
        "databases": skills.get('databases', []),
        "soft_skills": skills.get('soft_skills', []),
        "social_links": social,
        "confidence_scores": confidence_scores,
        "pdf_type": pdf_type,
        "hyperlinks": hyperlinks
    }
    return result

def find_sample_file(root_dir: str, category_path: str) -> str:
    cat_path = os.path.join(root_dir, category_path)
    for dirpath, _, filenames in os.walk(cat_path):
        for f in filenames:
            if f.lower().endswith(('.pdf', '.docx', '.txt')):
                return os.path.join(dirpath, f)
    raise FileNotFoundError(f"No resume file found for category {category_path}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Validate resume extraction')
    parser.add_argument('--resume', type=str, help='Path to a single resume file for validation')
    args = parser.parse_args()

    base_dir = r"C:/Users/aarup/OneDrive/Desktop/repository folder/InternshipIQ/uploads/resume"
    report = {}

    if args.resume:
        try:
            parsed = parse_resume_file(args.resume)
            report['single'] = parsed
        except Exception as e:
            report['single'] = {"error": str(e)}
    else:
        expected = [
            ('my_resume', 'my_resume'),
            ('technical', os.path.join('benchmark_gold_set', 'technical')),
            ('non_technical', os.path.join('benchmark_gold_set', 'non_technical')),
            ('leadership', os.path.join('benchmark_gold_set', 'leadership')),
            ('design', 'design')
        ]
        for key, rel_path in expected:
            full_path = os.path.join(base_dir, rel_path)
            if not os.path.isdir(full_path):
                report[key] = {"error": f"Category folder not found: {rel_path}"}
                continue
            try:
                file_path = find_sample_file(base_dir, rel_path)
                parsed = parse_resume_file(file_path)
                report[key] = parsed
            except Exception as e:
                report[key] = {"error": str(e)}

    output_path = os.path.join(base_dir, "extraction_validation_report.json")
    with open(output_path, 'w', encoding='utf-8') as out:
        json.dump(report, out, indent=2)
    print(f"Validation report written to {output_path}")

if __name__ == "__main__":
    main()
