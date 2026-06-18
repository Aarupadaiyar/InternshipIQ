import os
import sys
import json

# Ensure the backend app package is on PYTHONPATH
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.append(backend_path)

# Import the existing extraction validation logic to get base data
try:
    from validate_extraction import parse_resume_file, find_sample_file, load_file
except ImportError:
    # Handle if run from top level
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
    from validate_extraction import parse_resume_file, find_sample_file, load_file

from app.parsers.resume.extractors.pdf_extractor import extract_pdf
from app.services.intelligence.hidden_skill_inferencer import infer_hidden_skills
from app.services.intelligence.career_recommender import generate_recommendations
from app.services.intelligence.job_matcher import match_job
from app.services.intelligence.skill_gap_analyzer import analyze_skill_gap
from app.services.intelligence.ats_feedback_engine import generate_ats_feedback

# Sample JD for Job Matcher
SAMPLE_JD = """
We are looking for a Data Scientist / AI Engineer.
Required Skills: Python, Machine Learning, Deep Learning, SQL, Pandas, Scikit-learn, TensorFlow.
Soft skills: Communication, Problem Solving.
"""

def process_intelligence(file_path: str) -> dict:
    """Runs extraction and then applies the intelligence layer."""
    
    # 1. Base Extraction
    parsed_resume = parse_resume_file(file_path)
    
    # Get raw text for ATS and hidden skills
    # Since parse_resume_file doesn't return raw text directly, we re-extract it for these modules
    if file_path.lower().endswith('.pdf'):
        res = extract_pdf(load_file(file_path))
        raw_text = res[0] if isinstance(res, tuple) else res
    else:
        raw_text = load_file(file_path).decode(errors='ignore')
        
    # Flatten explicit skills for intelligence engines
    explicit_skills = []
    for cat in ["technical_skills", "frameworks", "tools", "databases", "soft_skills"]:
        explicit_skills.extend([s["skill"] for s in parsed_resume.get(cat, [])])
        
    # 2. Intelligence Phase
    
    # Hidden Skill Inferencer
    inferred_skills = infer_hidden_skills(raw_text)
    
    # Career Recommendation Engine
    recommendations = generate_recommendations(explicit_skills, inferred_skills)
    top_role = recommendations[0]["role"] if recommendations else "Data Scientist"
    
    # Resume-to-Job Match Engine
    job_match = match_job(explicit_skills + inferred_skills, SAMPLE_JD)
    
    # Skill Gap Analyzer
    # Let's analyze against the top recommended role
    top_role_data = recommendations[0] if recommendations else {"missing_skills": [], "matched_skills": [], "match_score": 0}
    skill_gap = analyze_skill_gap(
        role=top_role, 
        missing_skills=top_role_data["missing_skills"], 
        existing_skills=top_role_data["matched_skills"], 
        match_score=top_role_data["match_score"]
    )
    
    # ATS Feedback Engine
    ats_feedback = generate_ats_feedback(parsed_resume, raw_text)
    
    return {
        "extraction": parsed_resume,
        "intelligence": {
            "hidden_skills": inferred_skills,
            "career_recommendations": recommendations[:3],  # Top 3
            "job_match_sample": job_match,
            "skill_gap_analysis": skill_gap,
            "ats_feedback": ats_feedback
        }
    }

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Validate resume intelligence phase')
    parser.add_argument('--resume', type=str, help='Path to a single resume file for validation')
    args = parser.parse_args()

    base_dir = r"C:/Users/aarup/OneDrive/Desktop/repository folder/InternshipIQ/uploads/resume"
    report = {}

    if args.resume:
        try:
            report['single'] = process_intelligence(args.resume)
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
                report[key] = process_intelligence(file_path)
            except Exception as e:
                report[key] = {"error": str(e)}

    output_path = os.path.join(base_dir, "intelligence_validation_report.json")
    with open(output_path, 'w', encoding='utf-8') as out:
        json.dump(report, out, indent=2)
    print(f"Intelligence validation report written to {output_path}")

if __name__ == "__main__":
    main()
