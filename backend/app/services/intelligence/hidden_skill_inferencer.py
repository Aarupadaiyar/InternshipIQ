import re
from typing import List

# Mappings of action verbs/phrases to inferred skills
INFERENCE_MAP = {
    "Leadership": [
        r'\bled\b', r'\bleading\b', r'\bheaded\b', r'\bspearheaded\b',
        r'\bdirected\b', r'\bpresident\b', r'\bfounder\b', r'\bpioneer\b'
    ],
    "Mentoring": [
        r'\bmentored\b', r'\bmentoring\b', r'\bguided\b', r'\bcoached\b',
        r'\btutored\b', r'\btrained\b', r'\bonboarded\b'
    ],
    "Public Speaking": [
        r'\bpresented\b', r'\bspoke\b', r'\bspeaker\b', r'\bpanelist\b',
        r'\bkeynote\b', r'\bhost\b', r'\bhosted\b', r'\btalk\b'
    ],
    "Community Building": [
        r'\bcommunity\b', r'\bambassador\b', r'\badvocate\b', r'\bvolunteered\b',
        r'\bforum\b', r'\bmeetup\b', r'\boutreach\b'
    ],
    "Event Management": [
        r'\borganized\b', r'\bhosted\b', r'\bcoordinated\b', r'\bevent\b',
        r'\bhackathon\b', r'\bworkshop\b', r'\bconference\b'
    ],
    "Team Management": [
        r'\bmanaged\b', r'\boversaw\b', r'\bsupervised\b', r'\bteam\b',
        r'\bcross-functional\b', r'\bcoordinated\b', r'\bfacilitated\b'
    ],
    "Project Ownership": [
        r'\bowned\b', r'\barchitected\b', r'\bdesigned\b', r'\bdeveloped\b',
        r'\bdeployed\b', r'\bdelivered\b', r'\bbuilt\b', r'\bcreated\b'
    ]
}

def infer_hidden_skills(raw_text: str) -> List[str]:
    """Infers hidden soft skills based on semantic markers in the text."""
    text_lower = raw_text.lower()
    inferred = set()
    
    for skill, patterns in INFERENCE_MAP.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                inferred.add(skill)
                break  # Once we infer the skill, move to the next skill
                
    return sorted(list(inferred))
