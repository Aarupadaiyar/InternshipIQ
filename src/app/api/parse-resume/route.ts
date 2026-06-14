import { NextRequest, NextResponse } from 'next/server'

type ConfidenceMap = Record<string, { value: unknown; confidence: number; evidence?: string }>
type ParsedResume = {
  name?: string
  email?: string
  phone?: string
  locations?: string[]
  links?: Record<string, string>
  education?: unknown[]
  experience?: unknown[]
  projects?: unknown[]
  certifications?: any[]
  achievements?: string[]
  skills?: string[]
  skillsByCategory?: Record<string, string[]>
  confidence?: ConfidenceMap
  career_recommendations?: string[]
  soft_skills?: string[]
  experience_signals?: string[]
  achievement_signals?: string[]
  [key: string]: unknown
}

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  languages: ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'C', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Dart', 'SQL', 'HTML', 'CSS'],
  frameworks: ['React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Node.js', 'Express.js', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'GraphQL', 'REST APIs', 'TailwindCSS', 'Redux', 'PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'HuggingFace', 'Transformers', 'OpenCV'],
  databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'Firebase', 'SQLite', 'Supabase', 'Neo4j', 'Snowflake', 'BigQuery'],
  cloud: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Vercel', 'Nginx', 'Linux'],
  tools: ['Git', 'GitHub', 'GitHub Actions', 'Jira', 'Figma', 'Postman', 'Power BI', 'Tableau', 'Excel', 'Airflow', 'Kafka', 'Spark', 'Hadoop', 'dbt', 'Databricks', 'Prometheus', 'Grafana', 'Selenium', 'Cypress', 'Jest', 'Pytest'],
}

const ALL_SKILLS = Object.values(SKILLS_BY_CATEGORY).flat()
const SECTION_HEADERS = ['education', 'experience', 'work experience', 'internship', 'projects', 'skills', 'technical skills', 'certifications', 'achievements', 'awards', 'publications']

function normalizeText(input: string): string {
  return input
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[•●▪]/g, '-')
    .trim()
}

function linesOf(text: string): string[] {
  return normalizeText(text).split('\n').map(l => l.trim()).filter(Boolean)
}

function sectionMap(text: string): Record<string, string[]> {
  const sections: Record<string, string[]> = { header: [] }
  let current = 'header'
  for (const line of linesOf(text)) {
    const normalized = line.toLowerCase().replace(/[:\-]+$/g, '').trim()
    const header = SECTION_HEADERS.find(h => normalized === h || normalized.startsWith(`${h} `))
    if (header) {
      current = header
      sections[current] ||= []
      continue
    }
    sections[current] ||= []
    sections[current].push(line)
  }
  return sections
}

function findFirst(re: RegExp, text: string): string {
  return text.match(re)?.[1]?.trim() ?? ''
}

function extractName(text: string): { value: string; confidence: number; evidence?: string } {
  const candidates = linesOf(text).slice(0, 12)
  for (const line of candidates) {
    if (/@|github|linkedin|portfolio|resume|curriculum|phone|\+?\d/.test(line.toLowerCase())) continue
    if (/^(education|experience|projects|skills|summary|objective|profile)$/i.test(line)) continue
    if (line.length < 3 || line.length > 60) continue
    const words = line.split(/\s+/)
    if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Za-z][A-Za-z.'-]*$/.test(w))) {
      return { value: line, confidence: 94, evidence: line }
    }
  }
  return { value: '', confidence: 0 }
}

function extractLinks(text: string) {
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i)?.[0] ?? ''
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_.%-]+/i)?.[0] ?? ''
  const portfolio = text.match(/(?:https?:\/\/)?(?:www\.)?(?!github\.com|linkedin\.com)[A-Za-z0-9.-]+\.(?:dev|io|me|com|net|app|site)(?:\/[^\s)]*)?/i)?.[0] ?? ''
  return {
    github: github ? (github.startsWith('http') ? github : `https://${github}`) : '',
    linkedin: linkedin ? (linkedin.startsWith('http') ? linkedin : `https://${linkedin}`) : '',
    portfolio: portfolio ? (portfolio.startsWith('http') ? portfolio : `https://${portfolio}`) : '',
  }
}

function extractGroundedSkills(text: string): Record<string, string[]> {
  const lower = text.toLowerCase()
  const result: Record<string, string[]> = {}
  for (const [category, skills] of Object.entries(SKILLS_BY_CATEGORY)) {
    result[category] = skills.filter(skill => {
      const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const boundary = /^[a-z0-9+#.]+$/i.test(skill) ? `(?:^|[^a-z0-9+#.])${escaped}(?:$|[^a-z0-9+#.])` : escaped
      return new RegExp(boundary, 'i').test(lower)
    })
  }
  return result
}

function extractEducation(text: string, sections: Record<string, string[]>) {
  const eduLines = [...(sections.education || []), ...linesOf(text).filter(l => /\b(university|college|institute|school|b\.?\s?tech|bachelor|master|m\.?\s?tech|b\.?\s?e\.?|cgpa|gpa)\b/i.test(l))]
  const blob = eduLines.join('\n')
  const university = eduLines.find(l => /\b(university|college|institute|school)\b/i.test(l)) || ''
  const degreeLine = eduLines.find(l => /\b(b\.?\s?tech|bachelor|master|m\.?\s?tech|b\.?\s?e\.?|bsc|msc|mba|phd)\b/i.test(l)) || ''
  const degree = findFirst(/\b((?:B\.?\s?Tech|B\.?\s?E\.?|Bachelor|M\.?\s?Tech|Master|BSc|MSc|MBA|PhD)[^,\n|]*)/i, degreeLine)
  const branch = findFirst(/\b(?:in|of)?\s*(Computer Science|Information Technology|Electronics|Electrical|Mechanical|Civil|Data Science|Artificial Intelligence|Machine Learning|Cybersecurity)\b/i, degreeLine || blob)
  const cgpa = findFirst(/\b(?:CGPA|GPA)\s*[:\-]?\s*([0-9](?:\.[0-9]{1,2})?)\b/i, blob)
  const year = findFirst(/\b(20[1-3][0-9])\b/, blob)

  if (!university && !degree && !cgpa && !year) return []
  return [{
    degree,
    branch,
    institution: university,
    university,
    cgpa,
    year,
  }]
}

function extractBlockItems(lines: string[], headingWords: RegExp) {
  const items: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    const startsItem = headingWords.test(line) || /^[-*]\s*[A-Z0-9]/.test(line)
    if (startsItem && current.length) {
      items.push(current)
      current = []
    }
    current.push(line.replace(/^[-*]\s*/, ''))
  }
  if (current.length) items.push(current)
  return items
}

function extractExperience(sections: Record<string, string[]>) {
  const lines = [...(sections.experience || []), ...(sections['work experience'] || []), ...(sections.internship || [])]
  return extractBlockItems(lines, /\b(intern|engineer|developer|analyst|researcher|assistant|consultant|manager)\b/i)
    .slice(0, 5)
    .map(block => {
      const title = block[0] || ''
      const duration = title.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*(?:-|to|–)\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}))/i)?.[0] ?? ''
      const company = findFirst(/\b(?:at|@)\s+([A-Za-z0-9 .,&-]{2,60})/i, title)
      const role = title.replace(duration, '').replace(/\s+at\s+.+$/i, '').trim()
      return { company, role, duration, description: block.slice(1).join(' '), bullets: block.slice(1) }
    })
    .filter(item => item.role || item.company || item.description)
}

function extractProjects(sections: Record<string, string[]>, text: string) {
  const projectLines = sections.projects || []
  const blocks = extractBlockItems(projectLines, /^[A-Z][A-Za-z0-9 _:-]{2,80}$/)
  const githubLinks = [...text.matchAll(/(?:https?:\/\/)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/gi)].map(m => m[0])
  const deploymentLinks = [...text.matchAll(/(?:https?:\/\/)?(?!github\.com|linkedin\.com)[A-Za-z0-9.-]+\.(?:dev|io|me|com|net|app|site)(?:\/[^\s)]*)?/gi)].map(m => m[0])
  return blocks.slice(0, 8).map((block, idx) => {
    const joined = block.join(' ')
    const tech = ALL_SKILLS.filter(skill => new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(joined))
    return {
      name: (block[0] || '').replace(/[:|-]+$/g, '').trim(),
      description: block.slice(1).join(' '),
      tech,
      technologies: tech,
      github: githubLinks[idx] ? (githubLinks[idx].startsWith('http') ? githubLinks[idx] : `https://${githubLinks[idx]}`) : '',
      deployment: deploymentLinks[idx] ? (deploymentLinks[idx].startsWith('http') ? deploymentLinks[idx] : `https://${deploymentLinks[idx]}`) : '',
    }
  }).filter(p => p.name || p.description)
}

function extractListSection(sections: Record<string, string[]>, names: string[]) {
  return names.flatMap(name => sections[name] || [])
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function extractSoftSkills(text: string): string[] {
  const keywords = [
    { word: 'leadership', label: 'Leadership' },
    { word: 'communication', label: 'Communication' },
    { word: 'collaborat', label: 'Collaboration' },
    { word: 'teamwork', label: 'Teamwork' },
    { word: 'managed', label: 'Management' },
    { word: 'organized', label: 'Organization' },
    { word: 'problem-solv', label: 'Problem Solving' },
    { word: 'creativ', label: 'Creativity' },
    { word: 'critical think', label: 'Critical Thinking' },
    { word: 'adaptab', label: 'Adaptability' },
    { word: 'public speak', label: 'Public Speaking' },
    { word: 'negotiat', label: 'Negotiation' },
    { word: 'mentor', label: 'Mentorship' },
  ]
  const lower = text.toLowerCase()
  return keywords
    .filter(k => lower.includes(k.word))
    .map(k => k.label)
}

function extractExperienceSignals(text: string): string[] {
  const lower = text.toLowerCase()
  const signals: string[] = []
  
  if (lower.includes('president') || lower.includes('vice president')) {
    signals.push('Club President / Leader')
  }
  if (lower.includes('founder') || lower.includes('co-founder')) {
    signals.push('Founder / Co-Founder')
  }
  if (lower.includes('lead coordinator') || lower.includes('head coordinator') || lower.includes('event coordinator')) {
    signals.push('Coordinator / Organizer')
  }
  if (lower.includes('team lead') || lower.includes('tech lead') || lower.includes('project lead')) {
    signals.push('Team / Project Lead')
  }
  if (lower.includes('mentor') || lower.includes('teaching assistant') || lower.includes('tutor')) {
    signals.push('Mentorship / Teaching Role')
  }
  if (lower.includes('representative') || lower.includes('senator') || lower.includes('ambassador')) {
    signals.push('Student Representative / Ambassador')
  }
  
  return signals
}

function extractAchievementSignals(text: string): string[] {
  const lower = text.toLowerCase()
  const signals: string[] = []
  
  if (lower.includes('hackathon') || lower.includes('codechef') || lower.includes('leetcode')) {
    signals.push('Competitive Programming / Hackathons')
  }
  if (lower.includes('publication') || lower.includes('research paper') || lower.includes('journal') || lower.includes('ieee')) {
    signals.push('Research / Publications')
  }
  if (lower.includes('scholarship') || lower.includes('grant') || lower.includes('fellowship')) {
    signals.push('Scholarships / Grants')
  }
  if (lower.includes('winner') || lower.includes('first place') || lower.includes('1st place') || lower.includes('gold medalist')) {
    signals.push('Competition Winner')
  }
  if (lower.includes('patent') || lower.includes('inventor')) {
    signals.push('Patent / Innovation Award')
  }
  
  return signals
}

function extractLocation(text: string): string[] {
  const normalized = text.toLowerCase()
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 15)
  
  for (const line of lines) {
    if (line.startsWith('location:') || line.startsWith('address:') || line.startsWith('city:') || line.startsWith('lives in:')) {
      const clean = line.replace(/location:|address:|city:|lives in:/i, '').trim()
      if (clean.length > 2) return [clean.toUpperCase()]
    }
  }
  
  const cities = ['bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'pune', 'hyderabad', 'chennai', 'kolkata', 'san francisco', 'new york', 'london', 'toronto', 'seattle']
  for (const line of lines) {
    for (const city of cities) {
      if (line.includes(city)) {
        const idx = line.indexOf(city)
        const matched = line.slice(idx, idx + city.length)
        return [matched.charAt(0).toUpperCase() + matched.slice(1)]
      }
    }
  }
  
  return ['India']
}

function recommendCareerRoles(skills: string[]): string[] {
  const lowerSkills = skills.map(s => s.toLowerCase().trim())
  
  const roleRules = [
    { role: 'AI Engineer', triggers: ['langchain', 'openai', 'llm', 'prompt engineering', 'huggingface', 'nlp', 'pytorch', 'tensorflow'] },
    { role: 'Machine Learning Engineer', triggers: ['scikit-learn', 'tensorflow', 'pytorch', 'numpy', 'pandas', 'mlflow', 'keras'] },
    { role: 'Data Scientist', triggers: ['r', 'pandas', 'numpy', 'scikit-learn', 'statistics', 'tableau', 'jupyter'] },
    { role: 'Data Analyst', triggers: ['excel', 'tableau', 'power bi', 'data visualization'] },
    { role: 'Full Stack Developer', triggers: ['react', 'node.js', 'express.js', 'mongodb', 'typescript', 'javascript', 'html', 'css'] },
    { role: 'Frontend Developer', triggers: ['react', 'typescript', 'next.js', 'redux', 'tailwindcss', 'responsive design'] },
    { role: 'Backend Developer', triggers: ['node.js', 'express.js', 'fastapi', 'django', 'flask', 'postgresql', 'mysql', 'mongodb', 'rest apis'] },
    { role: 'DevOps Engineer', triggers: ['linux', 'docker', 'kubernetes', 'aws', 'gcp', 'terraform', 'ci/cd', 'github actions', 'nginx'] },
    { role: 'Product Manager', triggers: ['agile', 'scrum', 'jira', 'figma', 'product roadmap', 'wireframing'] },
    { role: 'Cybersecurity Analyst', triggers: ['network security', 'wireshark', 'metasploit', 'cryptography', 'siem', 'firewalls', 'penetration testing'] },
    { role: 'UI Designer', triggers: ['figma', 'ui designer', 'mockups', 'wireframes', 'adobe xd', 'sketch'] },
    { role: 'UX Designer', triggers: ['user research', 'ux designer', 'wireframes', 'personas', 'user flows', 'interaction design'] },
    { role: 'Product Designer', triggers: ['product design', 'prototypes', 'design systems', 'figma', 'sketch'] },
    { role: 'Graphic Designer', triggers: ['photoshop', 'illustrator', 'indesign', 'graphic design', 'branding', 'typography'] },
    { role: 'Video Editor', triggers: ['premiere pro', 'final cut', 'davinci', 'video editing', 'after effects'] },
    { role: 'Digital Marketing', triggers: ['seo', 'sem', 'google analytics', 'digital marketing', 'email campaigns', 'adwords'] },
    { role: 'SEO Specialist', triggers: ['seo', 'google search console', 'semrush', 'ahrefs', 'link building', 'keyword research'] },
    { role: 'Social Media Manager', triggers: ['instagram', 'linkedin marketing', 'social media', 'content creation', 'tiktok'] },
    { role: 'Business Development', triggers: ['lead generation', 'cold calling', 'sales outreach', 'business development', 'crm'] },
    { role: 'Sales Executive', triggers: ['sales targets', 'negotiation', 'closing deals', 'presentations', 'sales pitch'] },
    { role: 'Financial Analyst', triggers: ['excel financial models', 'financial analysis', 'valuation', 'accounting', 'corporate finance'] },
    { role: 'Electrician', triggers: ['electrical safety', 'wiring', 'circuit breakers', 'electrical testing', 'multimeters', 'nec'] },
    { role: 'Mechanic', triggers: ['engine repair', 'automotive tools', 'diagnostics', 'hydraulics', 'brake systems'] },
    { role: 'Technician', triggers: ['troubleshooting hardware', 'maintenance', 'repairs', 'calibration', 'signal testing'] },
  ]
  
  const matches = roleRules.map(rule => {
    const score = rule.triggers.filter(t => lowerSkills.some(ls => ls === t || ls.includes(t) || t.includes(ls))).length
    return { role: rule.role, score }
  })
  
  const sorted = matches.filter(m => m.score > 0).sort((a, b) => b.score - a.score)
  const selected = sorted.slice(0, 3).map(m => m.role)
  
  if (selected.length === 0) {
    if (lowerSkills.includes('python') || lowerSkills.includes('sql')) {
      return ['Data Scientist', 'Backend Developer']
    }
    return ['Full Stack Developer', 'Frontend Developer']
  }
  return selected
}

function baseProfile(text: string) {
  const normalized = normalizeText(text)
  const sections = sectionMap(normalized)
  const skillsByCategory = extractGroundedSkills(normalized)
  const skills = [...new Set(Object.values(skillsByCategory).flat())]
  const name = extractName(normalized)
  const email = normalized.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? ''
  const phone = normalized.match(/(?:\+?\d[\d\s().-]{8,}\d)/)?.[0]?.trim() ?? ''
  const education = extractEducation(normalized, sections)
  const experience = extractExperience(sections)
  const projects = extractProjects(sections, normalized)
  const certifications = extractListSection(sections, ['certifications'])
  const achievements = extractListSection(sections, ['achievements', 'awards', 'publications'])
  const links = extractLinks(normalized)
  
  const soft_skills = extractSoftSkills(normalized)
  const experience_signals = extractExperienceSignals(normalized)
  const achievement_signals = extractAchievementSignals(normalized)
  const career_recommendations = recommendCareerRoles(skills)
  const locations = extractLocation(text)

  return {
    name: name.value,
    email,
    phone,
    links,
    education,
    experience,
    projects,
    certifications,
    achievements,
    skills,
    skillsByCategory,
    soft_skills,
    experience_signals,
    achievement_signals,
    career_recommendations,
    locations,
  }
}

function stripUngroundedSkills(profile: ParsedResume, text: string) {
  const grounded = new Set(Object.values(extractGroundedSkills(text)).flat() as string[])
  profile.skills = (profile.skills || []).filter((skill: string) => grounded.has(skill))
  profile.skillsByCategory = extractGroundedSkills(text)
  return profile
}

function reconcileProfile(localProfile: ParsedResume, llmProfile: unknown, text: string) {
  if (!llmProfile || typeof llmProfile !== 'object') return localProfile
  const parsed = llmProfile as ParsedResume
  const merged = { ...localProfile }
  for (const key of ['name', 'email', 'phone']) {
    if (!merged[key] && typeof parsed[key] === 'string') merged[key] = parsed[key]
  }
  merged.links = { ...merged.links, ...(parsed.links || {}) }
  for (const key of ['education', 'experience', 'projects', 'certifications', 'achievements', 'career_recommendations', 'soft_skills', 'experience_signals', 'achievement_signals', 'locations']) {
    const existing = merged[key]
    if ((!Array.isArray(existing) || existing.length === 0) && Array.isArray(parsed[key])) merged[key] = parsed[key]
  }
  return stripUngroundedSkills(merged, text)
}

function reviewFlags(profile: ParsedResume) {
  const required = ['name', 'email', 'phone', 'education', 'skills']
  const missingFields = required.filter(field => {
    const value = profile[field]
    return Array.isArray(value) ? value.length === 0 : !value
  })
  const lowConfidenceFields = Object.entries(profile.confidence || {})
    .filter(([, meta]) => (meta?.confidence ?? 0) > 0 && (meta?.confidence ?? 0) < 80)
    .map(([field]) => field)
  return { missingFields, lowConfidenceFields }
}

function validateAndStandardize(profile: ParsedResume): ParsedResume {
  // 1. Email Format Validation
  if (profile.email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(profile.email.trim())) {
      profile.email = ''
    } else {
      profile.email = profile.email.trim().toLowerCase()
    }
  }

  // Helper to standardise links
  const fixUrl = (url: string, keyword: string): string => {
    if (!url) return ''
    let val = url.trim()
    if (!val.toLowerCase().includes(keyword.toLowerCase())) return ''
    if (!val.startsWith('http')) {
      val = `https://${val.replace(/^\/+/g, '')}`
    }
    return val
  }

  // 2. Validate LinkedIn URLs
  if (profile.links) {
    profile.links.linkedin = fixUrl(profile.links.linkedin || '', 'linkedin.com')
    profile.links.github = fixUrl(profile.links.github || '', 'github.com')
    
    const port = profile.links.portfolio ? profile.links.portfolio.trim() : ''
    if (port && !port.startsWith('http')) {
      profile.links.portfolio = `https://${port}`
    }
  } else {
    profile.links = { linkedin: '', github: '', portfolio: '' }
  }

  // 3. Technology Names Standardization Map
  const techMap: Record<string, string> = {
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'reactjs': 'React',
    'react.js': 'React',
    'react': 'React',
    'node': 'Node.js',
    'nodejs': 'Node.js',
    'node.js': 'Node.js',
    'nextjs': 'Next.js',
    'next.js': 'Next.js',
    'vuejs': 'Vue.js',
    'vue.js': 'Vue.js',
    'vue': 'Vue.js',
    'py': 'Python',
    'python': 'Python',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'fastapi': 'FastAPI',
    'django': 'Django',
    'flask': 'Flask',
    'mongodb': 'MongoDB',
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'aws': 'AWS',
    'gcp': 'GCP',
    'git': 'Git',
    'github': 'GitHub',
    'tf': 'TensorFlow',
    'tensorflow': 'TensorFlow',
    'pytorch': 'PyTorch',
    'scikit': 'Scikit-learn',
    'scikit-learn': 'Scikit-learn',
    'sklearn': 'Scikit-learn',
  }

  const standardizeTech = (tech: string): string => {
    const key = tech.trim().toLowerCase()
    return techMap[key] || tech.trim()
  }

  // 4. Remove duplicate skills and standardize
  if (profile.skills) {
    profile.skills = Array.from(new Set(
      profile.skills.map(s => standardizeTech(s)).filter(Boolean)
    ))
  }

  // Standardize skillsByCategory
  if (profile.skillsByCategory) {
    for (const key of Object.keys(profile.skillsByCategory)) {
      profile.skillsByCategory[key] = Array.from(new Set(
        (profile.skillsByCategory[key] || []).map((s: string) => standardizeTech(s)).filter(Boolean)
      ))
    }
  }

  // Standardize technologies inside projects
  if (profile.projects && Array.isArray(profile.projects)) {
    profile.projects = profile.projects.map((p: any) => {
      let pTech = p.tech || p.technologies || []
      if (typeof pTech === 'string') {
        pTech = pTech.split(',').map((s: string) => s.trim())
      }
      const cleanedTech = Array.from(new Set(
        (pTech as string[]).map((t: string) => standardizeTech(t)).filter(Boolean)
      ))
      return {
        ...p,
        tech: cleanedTech,
        technologies: cleanedTech,
        github: p.github ? p.github.trim() : '',
        deployment: p.deployment ? p.deployment.trim() : '',
      }
    })
  }

  // 5. Structured Certifications Formatting: "CertName by Org (Date)"
  if (profile.certifications && Array.isArray(profile.certifications)) {
    profile.certifications = profile.certifications.map((c: any) => {
      if (typeof c === 'object' && c !== null) {
        const parts = []
        if (c.name || c.title) parts.push(c.name || c.title)
        if (c.organization || c.issuer || c.authority) parts.push(`by ${c.organization || c.issuer || c.authority}`)
        if (c.date || c.completionDate) parts.push(`(${c.date || c.completionDate})`)
        return parts.join(' ').trim()
      }
      return String(c).trim()
    }).filter(Boolean)
  }

  // Standardize achievements list
  if (profile.achievements && Array.isArray(profile.achievements)) {
    profile.achievements = profile.achievements.map((a: any) => String(a).trim()).filter(Boolean)
  }

  // Standardize career recommendations & signals
  if (profile.career_recommendations && Array.isArray(profile.career_recommendations)) {
    profile.career_recommendations = Array.from(new Set(profile.career_recommendations.map((s: any) => String(s).trim()))).filter(Boolean)
  } else {
    profile.career_recommendations = []
  }

  if (profile.soft_skills && Array.isArray(profile.soft_skills)) {
    profile.soft_skills = Array.from(new Set(profile.soft_skills.map((s: any) => String(s).trim()))).filter(Boolean)
  } else {
    profile.soft_skills = []
  }

  if (profile.experience_signals && Array.isArray(profile.experience_signals)) {
    profile.experience_signals = Array.from(new Set(profile.experience_signals.map((s: any) => String(s).trim()))).filter(Boolean)
  } else {
    profile.experience_signals = []
  }

  if (profile.achievement_signals && Array.isArray(profile.achievement_signals)) {
    profile.achievement_signals = Array.from(new Set(profile.achievement_signals.map((s: any) => String(s).trim()))).filter(Boolean)
  } else {
    profile.achievement_signals = []
  }

  // Standardize locations list
  if (profile.locations && Array.isArray(profile.locations)) {
    profile.locations = Array.from(new Set(profile.locations.map((l: any) => String(l).trim()))).filter(Boolean)
  } else {
    profile.locations = []
  }

  // 6. Recalculate Confidence Scores
  const nameConfidence = profile.name && profile.name.length > 2 ? 95 : 0
  const emailConfidence = profile.email ? 99 : 0
  const phoneConfidence = profile.phone && profile.phone.replace(/\D/g, '').length >= 10 ? 90 : 0
  const liConfidence = profile.links?.linkedin ? 98 : 0
  const ghConfidence = profile.links?.github ? 98 : 0
  const portConfidence = profile.links?.portfolio ? 85 : 0
  const eduConfidence = profile.education && profile.education.length > 0 ? 88 : 0
  const expConfidence = profile.experience && profile.experience.length > 0 ? 85 : 0
  const projConfidence = profile.projects && profile.projects.length > 0 ? 85 : 0
  const skillsConfidence = profile.skills && profile.skills.length > 0 ? 95 : 0
  const certConfidence = profile.certifications && profile.certifications.length > 0 ? 85 : 0
  const achConfidence = profile.achievements && profile.achievements.length > 0 ? 85 : 0

  profile.confidence = {
    name: { value: profile.name, confidence: nameConfidence },
    email: { value: profile.email, confidence: emailConfidence },
    phone: { value: profile.phone, confidence: phoneConfidence },
    linkedin: { value: profile.links?.linkedin, confidence: liConfidence },
    github: { value: profile.links?.github, confidence: ghConfidence },
    portfolio: { value: profile.links?.portfolio, confidence: portConfidence },
    education: { value: profile.education, confidence: eduConfidence },
    experience: { value: profile.experience, confidence: expConfidence },
    projects: { value: profile.projects, confidence: projConfidence },
    skills: { value: profile.skills, confidence: skillsConfidence },
    certifications: { value: profile.certifications, confidence: certConfidence },
    achievements: { value: profile.achievements, confidence: achConfidence },
  }

  return profile
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText } = await req.json()
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Resume text too short or missing. If this is a scanned PDF, OCR is required before parsing.' }, { status: 400 })
    }

    const text = normalizeText(resumeText)
    let profile: ParsedResume = baseProfile(text)
    let source = 'local-multistage'
    const groqKey = process.env.GROQ_API_KEY

    if (groqKey && groqKey !== 'your_groq_api_key_here') {
      try {
        const { default: Groq } = await import('groq-sdk')
        const groq = new Groq({ apiKey: groqKey })
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0,
          max_tokens: 3000,
          messages: [{
            role: 'system',
            content: `You are an expert ATS resume parsing assistant. Extract all data from the resume. If facts are not present, leave them blank or empty.
Infer soft skills and hard skills from experience descriptions (e.g. if the user organized events, add 'Event Management' to soft_skills).
Infer suitability for career roles. Choose the top 3-4 recommended career roles from this exact list:
Technology: Software Engineer, Full Stack Developer, Backend Developer, Frontend Developer, AI Engineer, ML Engineer, Data Scientist, Data Analyst, Cloud Engineer, DevOps Engineer, Cybersecurity Analyst.
Design: UI Designer, UX Designer, Product Designer, Graphic Designer, Video Editor, Motion Designer.
Product & Strategy: Product Manager, Program Manager, Business Analyst, Strategy Associate.
Marketing: Digital Marketing, Content Marketing, SEO Specialist, Growth Associate, Brand Executive, Social Media Manager.
Sales: Business Development, Sales Executive, Account Manager, Customer Success.
Operations: Operations Associate, Operations Manager, Supply Chain Associate.
Community & Events: Community Manager, Campus Ambassador, Event Manager, Partnerships Associate.
Education: Tutor, Teaching Assistant, Curriculum Developer.
HR & Recruitment: Recruiter, Talent Acquisition, HR Associate.
Finance: Financial Analyst, Investment Analyst, Operations Finance.
Media & Content: Content Writer, Copywriter, Script Writer, Content Strategist.
Blue Collar & Skilled Trades: Electrician, Technician, Mechanic, Machine Operator, Field Technician, Maintenance Engineer.`
          }, {
            role: 'user',
            content: `Extract only facts explicitly present or highly justified by experiences in this resume. Return raw JSON matching this format:
{
  "name": "Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "locations": ["City, State, Country"],
  "links": {
    "linkedin": "LinkedIn Profile URL",
    "github": "GitHub Profile URL",
    "portfolio": "Portfolio Website URL"
  },
  "education": [
    {
      "degree": "Degree (e.g. B.Tech)",
      "branch": "Branch of Study (e.g. Computer Science)",
      "institution": "College/University Name",
      "university": "Affiliated University Name",
      "cgpa": "CGPA/GPA",
      "year": "Graduation Year"
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Duration (e.g. 3 months)",
      "description": "Short summary of achievements and responsibilities",
      "bullets": ["Responsibility 1", "Responsibility 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Description",
      "tech": ["Python", "Docker"],
      "github": "GitHub project repo URL",
      "deployment": "Live app link (Vercel, Netlify, etc.)"
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "skillsByCategory": {
    "languages": [],
    "frameworks": [],
    "databases": [],
    "cloud": [],
    "tools": []
  },
  "soft_skills": ["Leadership", "Communication", "Event Management"],
  "career_recommendations": ["Software Engineer", "Product Manager"],
  "certifications": [
    {
      "name": "Certificate Name",
      "organization": "Issuing Organization",
      "date": "Completion Date"
    }
  ],
  "achievements": [
    "Award, competition win, ranking, or publication detail 1"
  ]
}

Resume text:
${text.slice(0, 9000)}`
          }],
        })
        const raw = completion.choices[0]?.message?.content ?? ''
        const parsed = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
        profile = reconcileProfile(profile, parsed, text)
        source = 'groq-validated'
      } catch (error) {
        console.error('Groq parse failed, using local multistage parser:', error)
      }
    }

    // Run Validation and Standardization
    profile = validateAndStandardize(profile)

    const flags = reviewFlags(profile)
    return NextResponse.json({ profile, confidence: profile.confidence, ...flags, source })
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json({ error: 'Internal error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

