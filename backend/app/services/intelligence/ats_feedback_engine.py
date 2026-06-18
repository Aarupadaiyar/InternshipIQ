import re
from typing import Dict, Any, List

def generate_ats_feedback(parsed_resume: Dict[str, Any], raw_text: str = "") -> Dict[str, Any]:
    """Generates weighted ATS scoring and feedback based on resume content."""
    
    strengths = []
    weaknesses = []
    improvements = []
    score_breakdown = {}
    total_score = 0
    text_lower = raw_text.lower() if raw_text else ""
    
    # ---------------------------------------------------------
    # 1. Contact Information (Weight: 10)
    # ---------------------------------------------------------
    contact_score = 0
    if parsed_resume.get("email"):
        contact_score += 4
    else:
        weaknesses.append("Missing email address.")
        improvements.append("Add a professional email address.")
        
    if parsed_resume.get("phone"):
        contact_score += 3
    else:
        weaknesses.append("Missing phone number.")
        
    if parsed_resume.get("linkedin"):
        contact_score += 3
    else:
        weaknesses.append("Missing LinkedIn URL.")
        improvements.append("Include your LinkedIn profile to boost ATS visibility.")
        
    if contact_score == 10:
        strengths.append("Complete contact information provided.")
        
    score_breakdown["contact_information"] = contact_score
    total_score += contact_score

    # ---------------------------------------------------------
    # 2. Formatting & Structure (Weight: 10)
    # ---------------------------------------------------------
    format_score = 10
    pdf_type = parsed_resume.get("pdf_type")
    if pdf_type == "image-only":
        format_score = 0
        weaknesses.append("Resume is an image-only PDF. ATS cannot read it.")
        improvements.append("Use a standard text-based PDF format.")
    elif pdf_type == "mixed":
        format_score = 5
        weaknesses.append("Resume contains complex formatting that may confuse ATS.")
    else:
        strengths.append("ATS-friendly text format detected.")
        
    score_breakdown["formatting"] = format_score
    total_score += format_score

    # ---------------------------------------------------------
    # 3. Section Completeness (Weight: 20)
    # ---------------------------------------------------------
    section_score = 0
    sections = {
        "education": r'\beducation\b|\bacademic background\b',
        "experience": r'\bexperience\b|\bemployment history\b|\bwork history\b',
        "projects": r'\bprojects\b|\bpersonal projects\b',
        "skills": r'\bskills\b|\btechnical skills\b|\bcore competencies\b'
    }
    
    for section, pattern in sections.items():
        if re.search(pattern, text_lower):
            section_score += 5
        else:
            weaknesses.append(f"Missing explicit '{section.capitalize()}' section header.")
            improvements.append(f"Add a clearly labeled '{section.capitalize()}' section.")
            
    if section_score == 20:
        strengths.append("All core resume sections are clearly labeled.")
        
    score_breakdown["section_completeness"] = section_score
    total_score += section_score

    # ---------------------------------------------------------
    # 4. Skills Relevance (Weight: 15)
    # ---------------------------------------------------------
    skills_score = 0
    tech_count = len(parsed_resume.get("technical_skills", [])) + len(parsed_resume.get("frameworks", [])) + len(parsed_resume.get("databases", [])) + len(parsed_resume.get("tools", []))
    soft_count = len(parsed_resume.get("soft_skills", []))
    
    if tech_count >= 8:
        skills_score += 10
        strengths.append("Strong technical skill footprint.")
    elif tech_count >= 3:
        skills_score += 5
        improvements.append("Add more specific technical skills and tools.")
    else:
        weaknesses.append("Very few technical skills detected.")
        
    if soft_count >= 2:
        skills_score += 5
        strengths.append("Soft skills are explicitly mentioned.")
    else:
        improvements.append("Include key soft skills (e.g., Leadership, Communication).")
        
    score_breakdown["skills_relevance"] = skills_score
    total_score += skills_score

    # ---------------------------------------------------------
    # 5. Quantifiable Achievements (Weight: 15)
    # ---------------------------------------------------------
    quant_score = 0
    # Find numbers, percentages, money
    numbers_found = len(re.findall(r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%?\b|\$\d+', raw_text))
    
    if numbers_found >= 8:
        quant_score = 15
        strengths.append("Excellent use of quantifiable metrics and numbers.")
    elif numbers_found >= 3:
        quant_score = 8
        improvements.append("Quantify more achievements to increase impact (e.g., 'improved by 20%').")
    else:
        weaknesses.append("Lack of quantifiable achievements.")
        improvements.append("Add specific metrics, percentages, or dollar amounts to your bullet points.")
        
    score_breakdown["quantifiable_achievements"] = quant_score
    total_score += quant_score

    # ---------------------------------------------------------
    # 6. Action Verbs (Weight: 15)
    # ---------------------------------------------------------
    action_verb_score = 0
    action_verbs = [
        "managed", "led", "developed", "created", "designed", "improved", 
        "increased", "reduced", "spearheaded", "implemented", "orchestrated",
        "achieved", "delivered", "resolved", "optimized", "streamlined"
    ]
    
    verbs_found = sum(1 for verb in action_verbs if re.search(r'\b' + verb + r'\b', text_lower))
    
    if verbs_found >= 6:
        action_verb_score = 15
        strengths.append("Strong use of impactful action verbs.")
    elif verbs_found >= 3:
        action_verb_score = 8
        improvements.append("Replace passive voice with strong action verbs (e.g., 'Spearheaded', 'Optimized').")
    else:
        weaknesses.append("Few action verbs detected.")
        improvements.append("Start bullet points with strong action verbs.")
        
    score_breakdown["action_verbs"] = action_verb_score
    total_score += action_verb_score

    # ---------------------------------------------------------
    # 7. Keyword Density (Weight: 15)
    # ---------------------------------------------------------
    density_score = 0
    word_count = len(re.findall(r'\b\w+\b', raw_text))
    
    if word_count > 0:
        # Approximate density based on extracted skills count over total words
        total_skills_count = tech_count + soft_count
        density = (total_skills_count / word_count) * 100
        
        if density >= 5: # Highly dense
            density_score = 15
            strengths.append("Excellent keyword density for ATS parsing.")
        elif density >= 2:
            density_score = 10
        else:
            density_score = 5
            improvements.append("Increase keyword density by weaving skills naturally into your experience bullets.")
            
        # Also penalize for extreme length
        if word_count > 1200:
            weaknesses.append("Resume is extremely long. Consider condensing to 1-2 pages.")
            density_score = max(0, density_score - 5)
        elif word_count < 150:
            weaknesses.append("Resume is too short to pass typical ATS keyword thresholds.")
            density_score = max(0, density_score - 5)

    score_breakdown["keyword_density"] = density_score
    total_score += density_score

    return {
        "ats_score": total_score,
        "score_breakdown": score_breakdown,
        "missing_keywords": [],  # Can be populated by job matcher
        "strengths": strengths,
        "weaknesses": weaknesses,
        "improvements": improvements
    }
