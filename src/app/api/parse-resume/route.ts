import { NextRequest, NextResponse } from 'next/server'

type ConfidenceMap = Record<string, { value: unknown; confidence: number; evidence?: string }>
type ParsedResume = {
  name?: string
  email?: string
  phone?: string
  links?: Record<string, string>
  education?: unknown[]
  experience?: unknown[]
  projects?: unknown[]
  certifications?: string[]
  achievements?: string[]
  skills?: string[]
  skillsByCategory?: Record<string, string[]>
  confidence?: ConfidenceMap
  [key: string]: unknown
}

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  languages: ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'C', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Dart', 'SQL', 'HTML', 'CSS'],
  frameworks: ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Spring Boot', 'GraphQL', 'REST', 'TailwindCSS', 'Redux', 'PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'HuggingFace', 'Transformers', 'OpenCV'],
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
  return blocks.slice(0, 8).map((block, idx) => {
    const joined = block.join(' ')
    const tech = ALL_SKILLS.filter(skill => new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(joined))
    return {
      name: (block[0] || '').replace(/[:|-]+$/g, '').trim(),
      description: block.slice(1).join(' '),
      tech,
      github: githubLinks[idx] ? (githubLinks[idx].startsWith('http') ? githubLinks[idx] : `https://${githubLinks[idx]}`) : '',
    }
  }).filter(p => p.name || p.description)
}

function extractListSection(sections: Record<string, string[]>, names: string[]) {
  return names.flatMap(name => sections[name] || [])
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
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
  const achievements = extractListSection(sections, ['achievements', 'awards'])
  const links = extractLinks(normalized)

  const confidence: ConfidenceMap = {
    name,
    email: { value: email, confidence: email ? 99 : 0, evidence: email },
    phone: { value: phone, confidence: phone ? 90 : 0, evidence: phone },
    linkedin: { value: links.linkedin, confidence: links.linkedin ? 98 : 0, evidence: links.linkedin },
    github: { value: links.github, confidence: links.github ? 98 : 0, evidence: links.github },
    portfolio: { value: links.portfolio, confidence: links.portfolio ? 82 : 0, evidence: links.portfolio },
    education: { value: education, confidence: education.length ? 78 : 0 },
    experience: { value: experience, confidence: experience.length ? 70 : 0 },
    projects: { value: projects, confidence: projects.length ? 72 : 0 },
    skills: { value: skills, confidence: skills.length ? 95 : 0 },
  }

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
    confidence,
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
  for (const key of ['education', 'experience', 'projects', 'certifications', 'achievements']) {
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
            role: 'user',
            content: `Extract only facts explicitly present in this resume. Do not infer or invent skills. Return raw JSON with:
{
 "name":"","email":"","phone":"",
 "links":{"linkedin":"","github":"","portfolio":""},
 "education":[{"degree":"","branch":"","university":"","institution":"","cgpa":"","year":""}],
 "experience":[{"company":"","role":"","duration":"","description":"","bullets":[]}],
 "projects":[{"name":"","technologies":[],"tech":[],"description":"","github":""}],
 "skills":[],
 "skillsByCategory":{"languages":[],"frameworks":[],"databases":[],"cloud":[],"tools":[]},
 "certifications":[],
 "achievements":[]
}
Resume:
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

    const flags = reviewFlags(profile)
    return NextResponse.json({ profile, confidence: profile.confidence, ...flags, source })
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json({ error: 'Internal error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
