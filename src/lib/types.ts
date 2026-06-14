export interface ParsedProfile {
  name: string
  email: string
  phone?: string
  skills: string[]
  skillsByCategory?: Record<string, string[]>
  education: { degree: string; branch?: string; institution: string; university?: string; cgpa?: string; year?: string }[]
  experience: { role: string; company: string; duration?: string; description?: string; bullets?: string[] }[]
  projects: { name: string; description: string; tech: string[]; technologies?: string[]; github?: string; deployment?: string }[]
  certifications: string[]
  achievements?: string[]
  links: { github?: string; linkedin?: string; portfolio?: string }
  confidence?: Record<string, { value: unknown; confidence: number; evidence?: string }>
  career_recommendations?: string[]
  soft_skills?: string[]
  experience_signals?: string[]
  achievement_signals?: string[]
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  type: 'Remote' | 'Hybrid' | 'On-site'
  salary?: string
  source: string
  sourceUrl: string
  postedAt: string
  description: string
  requiredSkills: string[]
  matchScore?: number
  matchBreakdown?: MatchBreakdown
  skillGaps?: string[]
}

export interface MatchBreakdown {
  resumeMatch: number
  skillMatch: number
  experience: number
  location: number
  preferences: number
  total: number
}

export interface UserPreferences {
  roles: string[]
  domains: string[]
  locations: string[]
  remote: 'remote' | 'hybrid' | 'onsite' | 'any'
  salaryMin?: number
}

export interface SkillGap {
  skill: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  learnUrl?: string
}
