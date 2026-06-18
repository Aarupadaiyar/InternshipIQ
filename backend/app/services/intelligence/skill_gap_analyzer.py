from typing import Dict, Any, List

# A simple curated mapping for learning resources and projects per skill
LEARNING_RESOURCES = {
    "Python": {
        "roadmap": "Master advanced Python, OOP, and asynchronous programming.",
        "projects": ["Build a REST API with FastAPI", "Create a web scraper using BeautifulSoup"],
        "resources": ["Corey Schafer Python Tutorials", "Real Python", "Fluent Python (Book)"]
    },
    "Machine Learning": {
        "roadmap": "Learn supervised/unsupervised learning, model evaluation, and deployment.",
        "projects": ["Predictive model for housing prices", "Customer segmentation using K-Means"],
        "resources": ["Andrew Ng's Machine Learning Course", "Hands-On Machine Learning (Book)"]
    },
    "Deep Learning": {
        "roadmap": "Understand Neural Networks, CNNs, RNNs, and Transformers.",
        "projects": ["Image classifier with PyTorch", "Text summarization tool with Hugging Face"],
        "resources": ["DeepLearning.AI Specialization", "Fast.ai Practical Deep Learning"]
    },
    "SQL": {
        "roadmap": "Master complex joins, window functions, and query optimization.",
        "projects": ["Design a relational schema for an e-commerce store", "Analyze a public dataset using advanced SQL"],
        "resources": ["Mode SQL Tutorial", "SQL for Data Science (Coursera)"]
    },
    "React": {
        "roadmap": "Learn Hooks, Context API, state management, and component architecture.",
        "projects": ["Build a dynamic dashboard", "Create an e-commerce frontend"],
        "resources": ["React Official Docs", "Frontend Masters React Path"]
    },
    "Docker": {
        "roadmap": "Understand containerization, Dockerfiles, and Docker Compose.",
        "projects": ["Containerize a full-stack application", "Set up a CI/CD pipeline using Docker"],
        "resources": ["Docker for Beginners", "NetworkChuck Docker Tutorial"]
    },
    "AWS": {
        "roadmap": "Learn core services: EC2, S3, RDS, Lambda, and IAM.",
        "projects": ["Deploy a scalable web app", "Build a serverless data processing pipeline"],
        "resources": ["AWS Skill Builder", "Stephane Maarek's AWS Courses"]
    },
    "Product Management": {
        "roadmap": "Master agile methodologies, user stories, roadmapping, and metrics.",
        "projects": ["Create a PRD for a new feature", "Conduct user interviews for market research"],
        "resources": ["Inspired by Marty Cagan", "Product School Resources"]
    }
}

# Fallback generic resource
GENERIC_RESOURCE = {
    "roadmap": "Focus on fundamentals and build practical applications.",
    "projects": ["Implement a core project demonstrating this skill"],
    "resources": ["Official Documentation", "Coursera / Udemy highly-rated courses"]
}

def analyze_skill_gap(role: str, missing_skills: List[str], existing_skills: List[str], match_score: int) -> Dict[str, Any]:
    """Generates a detailed skill gap analysis for a specific target role."""
    
    roadmap = []
    projects = []
    resources = []
    
    for skill in missing_skills:
        data = LEARNING_RESOURCES.get(skill, GENERIC_RESOURCE)
        roadmap.append(f"{skill}: {data['roadmap']}")
        projects.extend(data['projects'])
        resources.extend(data['resources'])
        
    return {
        "target_role": role,
        "existing_skills": existing_skills,
        "missing_skills": missing_skills,
        "readiness_score": match_score,
        "learning_roadmap": roadmap,
        "suggested_projects": list(set(projects)),  # deduplicate
        "recommended_resources": list(set(resources))
    }
