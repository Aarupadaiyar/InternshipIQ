'''Pydantic models for resume parsing output.'''

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class EntityExtraction(BaseModel):
    name: Optional[str] = Field(None, description="Full name of candidate")
    email: Optional[str] = Field(None, description="Primary email address")
    phone: Optional[str] = Field(None, description="Phone number")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    github: Optional[str] = Field(None, description="GitHub profile URL")

class Skill(BaseModel):
    skill: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class EducationEntry(BaseModel):
    degree: str
    institution: str
    start_year: Optional[int] = None
    end_year: Optional[int] = None

class ExperienceEntry(BaseModel):
    role: str
    company: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    bullet_points: List[str] = []

class ProjectEntry(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: List[str] = []

class Recommendation(BaseModel):
    role: str
    match_score: float = Field(..., ge=0.0, le=100.0)
    evidence: List[str] = []
    missing_skills: List[str] = []
    job_readiness: float = Field(..., ge=0.0, le=100.0)

class GapAnalysis(BaseModel):
    target_role: str
    existing_skills: List[str]
    missing_skills: List[str]
    readiness_score: float = Field(..., ge=0.0, le=100.0)
    learning_roadmap: List[str] = []
    suggested_projects: List[str] = []
    recommended_resources: List[str] = []

class ATSFeedback(BaseModel):
    ats_score: float = Field(..., ge=0.0, le=100.0)
    strengths: List[str] = []
    weaknesses: List[str] = []
    missing_sections: List[str] = []
    improvement_suggestions: List[str] = []

class ResumeParseResult(BaseModel):
    version: int = 1
    entity: EntityExtraction
    skills: List[Skill]
    education: List[EducationEntry]
    experience: List[ExperienceEntry]
    projects: List[ProjectEntry]
    recommendations: List[Recommendation]
    gap_analysis: Optional[GapAnalysis] = None
    ats_feedback: ATSFeedback
    raw_text: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
