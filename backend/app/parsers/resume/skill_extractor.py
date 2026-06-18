import re
from typing import List, Dict, Any

# Define canonical skills for each category
CATEGORIES = {
    "technical_skills": [
        "Python", "Java", "C++", "C", "C#", "JavaScript", "TypeScript", "Go", "Rust", "Ruby", "PHP", 
        "Swift", "Kotlin", "HTML", "CSS", "R", "MATLAB", "Data Analysis", "Data Cleaning", 
        "Data Visualization", "Regression Modeling", "Feature Engineering", "Predictive Analytics", 
        "EDA", "RESTful APIs", "OOP", "Data Structures & Algorithms", "Machine Learning", 
        "Deep Learning", "Natural Language Processing", "Computer Vision"
    ],
    "frameworks": [
        "React", "Angular", "Vue.js", "Node.js", "Express.js", "Django", "FastAPI", "Flask", 
        "Spring Boot", "Laravel", "TensorFlow", "Keras", "PyTorch", "Scikit-learn", "Pandas", 
        "NumPy", "Bootstrap", "TailwindCSS"
    ],
    "tools": [
        "Git", "GitHub", "GitLab", "Docker", "Kubernetes", "AWS", "Azure", "GCP", 
        "Salesforce", "Web Scraping", "Regex", "Postman", "Linux", "Operating Systems", 
        "Excel", "Tableau", "Power BI"
    ],
    "databases": [
        "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "Oracle", "DBMS", "NoSQL"
    ],
    "soft_skills": [
        "Leadership", "Communication", "Teamwork", "Problem Solving", "Creativity", 
        "Time Management", "Project Management", "Agile", "Scrum"
    ]
}

# Map alias -> Canonical Name
ALIASES = {
    "dsa": "Data Structures & Algorithms",
    "ml": "Machine Learning",
    "dl": "Deep Learning",
    "os": "Operating Systems",
    "sklearn": "Scikit-learn",
    "react.js": "React",
    "nodejs": "Node.js",
    "node": "Node.js",
    "vue": "Vue.js",
    "aws": "AWS",
    "gcp": "GCP"
}

def extract_skills(text: str) -> Dict[str, List[Dict[str, float]]]:
    """Extract technical and soft skills across multiple categories from resume text.
    Returns a dict with categories mapping to list of skills and confidence scores.
    """
    text_lower = text.lower()
    
    results = {
        "technical_skills": [],
        "frameworks": [],
        "tools": [],
        "databases": [],
        "soft_skills": []
    }
    
    found_canonicals = set()
    
    def find_skill(search_term: str) -> bool:
        # Create a regex to match the term as a whole word, allowing for special chars in skills like C++
        escaped = re.escape(search_term)
        # Using negative lookahead/lookbehind to ensure we don't match inside a word
        # (e.g. don't match "java" inside "javascript")
        pattern = r'(?<![a-z0-9])' + escaped + r'(?![a-z0-9])'
        return bool(re.search(pattern, text_lower))

    # Check aliases first
    for alias, canonical in ALIASES.items():
        if canonical not in found_canonicals:
            if find_skill(alias):
                found_canonicals.add(canonical)
                
    # Then check all canonicals
    for cat, skills in CATEGORIES.items():
        for skill in skills:
            # If already found via alias, just add it to the category results
            if skill in found_canonicals:
                if not any(s["skill"] == skill for s in results[cat]):
                    results[cat].append({"skill": skill, "confidence": 1.0})
                continue
            
            # Direct search
            if find_skill(skill.lower()):
                found_canonicals.add(skill)
                results[cat].append({"skill": skill, "confidence": 1.0})

    return results
