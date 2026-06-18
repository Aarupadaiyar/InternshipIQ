import re
from typing import Dict, Any, List

# More robust URL pattern that captures both http and common domains without protocol
URL_REGEX = re.compile(r'((?:https?://)?(?:www\.)?(?:linkedin\.com|github\.com|kaggle\.com|behance\.net|medium\.com|dribbble\.com)[\w./?=&-]+|https?://[\w./?=&-]+)')

ALL_PLATFORMS = [
    'linkedin', 'github', 'github_project', 'portfolio', 'kaggle', 
    'medium', 'behance', 'dribbble', 'certification', 
    'course_completion', 'competition', 'other'
]

def classify_social_url(url: str) -> str:
    url_lower = url.lower()
    
    # Check exact domains or paths
    if 'linkedin.com' in url_lower: return 'linkedin'
    if 'kaggle.com' in url_lower: return 'kaggle'
    if 'behance.net' in url_lower: return 'behance'
    if 'dribbble.com' in url_lower: return 'dribbble'
    if 'medium.com' in url_lower: return 'medium'
    
    # Github vs Github Project
    if 'github.com' in url_lower:
        try:
            parts = [p for p in url_lower.split('github.com/')[1].split('/') if p]
            if len(parts) > 1:
                return 'github_project'
        except Exception:
            pass
        return 'github'
        
    # Certifications
    if 'oracle.com' in url_lower and 'certview' in url_lower: return 'certification'
    if 'salesforce.com/trailblazer' in url_lower: return 'certification'
    
    # Course completion
    if 'coursera.org' in url_lower: return 'course_completion'
    
    # Competition / Achievement
    if 'gssoc.girlscript.tech' in url_lower: return 'competition'
    
    # Portfolio fallback conditions
    if 'portfolio' in url_lower:
        return 'portfolio'
        
    return 'other'

def extract_social_links(text: str, hyperlinks: List[str] = None) -> Dict[str, Dict[str, Any]]:
    """Extract social profile URLs from resume text and pdf hyperlinks.
    Priority:
    1. PDF hyperlinks
    2. Plain text URLs
    3. Regex fallback
    """
    if hyperlinks is None:
        hyperlinks = []
        
    results: Dict[str, Dict[str, Any]] = {
        platform: {"status": "Not Present", "url": None, "confidence": 0.0}
        for platform in ALL_PLATFORMS
    }

    # Helper to add links (we keep the first one found for each platform)
    def add_link(link: str):
        if link.startswith('mailto:'):
            return
        platform = classify_social_url(link)
        if results[platform]["status"] == "Extracted":
            return
        results[platform] = {"status": "Extracted", "url": link, "confidence": 1.0}

    # 1. Process PDF Hyperlinks first
    for link in hyperlinks:
        add_link(link)

    # 2. Process Plain Text URLs (with or without protocol)
    for match in URL_REGEX.findall(text):
        # Normalize protocol-less URLs for consistency
        norm_url = match if match.startswith('http') else f"https://{match}"
        add_link(norm_url)

    return results
