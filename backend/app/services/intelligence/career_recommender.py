from typing import Dict, List, Any

# Required skills for each role (canonical names)
ROLE_REQUIREMENTS = {
    "AI Engineer": {
        "category": "Technical",
        "skills": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Natural Language Processing", "Computer Vision"]
    },
    "ML Engineer": {
        "category": "Technical",
        "skills": ["Python", "Machine Learning", "Scikit-learn", "Pandas", "NumPy", "Model Deployment", "Docker"]
    },
    "Data Scientist": {
        "category": "Technical",
        "skills": ["Python", "R", "Machine Learning", "Data Analysis", "Data Cleaning", "Data Visualization", "SQL", "Pandas"]
    },
    "Data Analyst": {
        "category": "Technical",
        "skills": ["SQL", "Excel", "Data Visualization", "Tableau", "Power BI", "Data Cleaning", "Python"]
    },
    "Backend Developer": {
        "category": "Technical",
        "skills": ["Python", "Java", "Node.js", "SQL", "RESTful APIs", "Docker", "AWS", "Databases"]
    },
    "Full Stack Developer": {
        "category": "Technical",
        "skills": ["JavaScript", "React", "Node.js", "HTML", "CSS", "SQL", "RESTful APIs", "Git"]
    },
    "Product Manager": {
        "category": "Non-Technical",
        "skills": ["Leadership", "Communication", "Problem Solving", "Project Management", "Agile", "Team Management", "Strategy"]
    },
    "Program Manager": {
        "category": "Non-Technical",
        "skills": ["Project Management", "Leadership", "Communication", "Team Management", "Event Management", "Agile"]
    },
    "Community Manager": {
        "category": "Non-Technical",
        "skills": ["Community Building", "Event Management", "Communication", "Public Speaking", "Mentoring"]
    },
    "Operations Associate": {
        "category": "Non-Technical",
        "skills": ["Problem Solving", "Time Management", "Communication", "Excel", "Data Analysis", "Project Management"]
    },
    "Business Analyst": {
        "category": "Non-Technical",
        "skills": ["Data Analysis", "Communication", "SQL", "Excel", "Problem Solving", "Tableau"]
    },
    "Technical Product Manager": {
        "category": "Hybrid",
        "skills": ["Product Management", "Agile", "Python", "SQL", "RESTful APIs", "Leadership", "Communication"]
    },
    "AI Product Engineer": {
        "category": "Hybrid",
        "skills": ["Machine Learning", "Python", "Product Management", "Deep Learning", "Communication", "Leadership"]
    },
    "Solutions Engineer": {
        "category": "Hybrid",
        "skills": ["Communication", "Python", "Java", "SQL", "Problem Solving", "AWS", "RESTful APIs", "Public Speaking"]
    }
}

def generate_recommendations(extracted_skills: List[str], inferred_skills: List[str]) -> List[Dict[str, Any]]:
    """Generates career recommendations based on matched skills."""
    all_user_skills = set(skill.lower() for skill in extracted_skills + inferred_skills)
    
    recommendations = []
    
    for role, reqs in ROLE_REQUIREMENTS.items():
        required = [s.lower() for s in reqs["skills"]]
        
        matched = []
        missing = []
        
        for req in reqs["skills"]:
            if req.lower() in all_user_skills:
                matched.append(req)
            else:
                missing.append(req)
                
        match_score = int((len(matched) / len(required)) * 100) if required else 0
        
        recommendations.append({
            "role": role,
            "category": reqs["category"],
            "match_score": match_score,
            "matched_skills": matched,
            "missing_skills": missing
        })
        
    # Sort by highest match score
    recommendations.sort(key=lambda x: x["match_score"], reverse=True)
    return recommendations
