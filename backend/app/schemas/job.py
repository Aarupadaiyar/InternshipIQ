from __future__ import annotations
import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MatchBreakdown(BaseModel):
    resumeMatch: int
    skillMatch: int
    experience: int
    location: int
    preferences: int
    total: int


class JobBase(BaseModel):
    title: str
    company: str
    location: str
    type: str
    salary: Optional[str] = None
    source: str
    sourceUrl: str = Field(..., serialization_alias="sourceUrl")
    postedAt: str = Field(..., serialization_alias="postedAt")
    description: str
    requiredSkills: List[str] = Field(..., serialization_alias="requiredSkills")


class JobCreate(JobBase):
    external_id: str


class JobResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: uuid.UUID
    title: str
    company: str
    location: str
    type: str
    salary: Optional[str] = None
    source: str
    sourceUrl: str = Field(..., validation_alias="source_url", serialization_alias="sourceUrl")
    postedAt: str = Field(..., validation_alias="posted_at", serialization_alias="postedAt")
    description: str
    requiredSkills: List[str] = Field(..., validation_alias="required_skills", serialization_alias="requiredSkills")
    
    # Dynamic fields computed on the fly against user profile
    matchScore: Optional[int] = None
    matchBreakdown: Optional[MatchBreakdown] = None
    skillGaps: Optional[List[str]] = None


class SourceItem(BaseModel):
    value: str
    label: str


class JobPaginatedResponse(BaseModel):
    jobs: List[JobResponse]
    total: int
    sources: List[SourceItem]
    locations: List[str]
    fetchedAt: str
    suggestedSearches: Optional[List[str]] = None
    suggestedDomains: Optional[List[str]] = None
    suggestedKeywords: Optional[List[str]] = None
    relatedFilters: Optional[dict] = None

