import { NextRequest, NextResponse } from 'next/server'

// ── Fallback skill extractor (used when Groq unavailable) ───────────────────
const SKILLS_DB = [
  'Python','JavaScript','TypeScript','Java','C++','C#','C','Go','Rust','Ruby','PHP',
  'Swift','Kotlin','Scala','R','MATLAB','Dart','Shell','Bash','SQL','HTML','CSS',
  'React','Next.js','Vue','Angular','Svelte','Node.js','Express','FastAPI','Django',
  'Flask','Spring','Spring Boot','Laravel','GraphQL','REST','gRPC','Redux','TailwindCSS',
  'Machine Learning','Deep Learning','NLP','Computer Vision','LLM','PyTorch','TensorFlow',
  'Keras','Scikit-learn','HuggingFace','OpenCV','Transformers','LangChain','XGBoost',
  'Pandas','NumPy','SciPy','Matplotlib','Seaborn','CUDA','Pinecone','FAISS',
  'Spark','Kafka','Airflow','dbt','Hadoop','Databricks','Snowflake','BigQuery','ETL',
  'Power BI','Tableau','Looker','Excel','Statistics','A/B Testing','Data Analysis',
  'PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','Cassandra','DynamoDB',
  'Firebase','SQLite','Supabase','Neo4j',
  'AWS','GCP','Azure','Docker','Kubernetes','Terraform','CI/CD','GitHub Actions',
  'Linux','Nginx','Vercel','Prometheus','Grafana',
  'Git','GitHub','Agile','Scrum','Jira','Figma','Postman','Microservices',
  'System Design','OAuth','JWT','Selenium','Cypress','Jest','Pytest',
]

function localExtractSkills(text: string): string[] {
  const lower = text.toLowerCase()
  return SKILLS_DB.filter(s => lower.includes(s.toLowerCase()))
}

function localExtractEmail(text: string): string {
  return text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] ?? ''
}

function localExtractName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines.slice(0, 8)) {
    if (line.includes('@') || /https?:\/\//.test(line) || /^\d/.test(line)) continue
    if (/^(objective|summary|education|experience|skills|profile|resume|curriculum|contact)/i.test(line)) continue
    if (line.includes('_') || line.length > 50 || line.length < 3) continue
    const words = line.split(/\s+/)
    if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Za-z.\-']+$/.test(w))) {
      return line
    }
  }
  return ''
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { resumeText } = body

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Resume text too short or missing' }, { status: 400 })
    }

    const text = resumeText.trim()
    const groqKey = process.env.GROQ_API_KEY

    // ── Try Groq AI first (free, 14k req/day) ────────────────────────────────
    if (groqKey && groqKey !== 'your_groq_api_key_here') {
      try {
        const { default: Groq } = await import('groq-sdk')
        const groq = new Groq({ apiKey: groqKey })

        const prompt = `You are a professional resume parser. Extract information from the resume below and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "name": "candidate full name (NOT the filename, look for the actual person's name at the top)",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "skills": ["list", "of", "technical", "skills", "tools", "languages", "frameworks"],
  "education": [{"degree": "degree name", "institution": "university/college name", "year": "graduation year"}],
  "experience": [{"role": "job title", "company": "company name", "duration": "time period", "bullets": ["achievement 1", "achievement 2"]}],
  "projects": [{"name": "project name", "description": "what it does", "tech": ["tech1", "tech2"]}],
  "certifications": ["cert 1", "cert 2"],
  "links": {"github": "github url or empty", "linkedin": "linkedin url or empty", "portfolio": "portfolio url or empty"}
}

Resume text:
${text.slice(0, 5000)}`

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        })

        const raw = completion.choices[0]?.message?.content ?? ''
        const cleaned = raw
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim()

        const profile = JSON.parse(cleaned)
        return NextResponse.json({ profile, source: 'groq' })

      } catch (groqErr) {
        console.error('Groq parse failed, falling back to local:', groqErr)
        // Fall through to local parser
      }
    }

    // ── Local fallback parser ─────────────────────────────────────────────────
    const skills = localExtractSkills(text)
    const name = localExtractName(text)
    const email = localExtractEmail(text)

    // Basic section splitting for education/experience
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const sectionHeaderRe = /^(education|experience|skills|projects?|certifications?|summary|objective|contact|links?|awards?|publications?)/i

    // Strip any line that is just a section header from field values
    const cleanLine = (l: string) => l.replace(/^(education|experience|skills|projects?|certifications?):\s*/i, '').trim()

    return NextResponse.json({
      profile: {
        name,
        email,
        phone: text.match(/(\+?\d[\d\s\-().]{8,14}\d)/)?.[0]?.trim() ?? '',
        skills,
        education: lines
          .filter((l: string) => /\b(b\.?tech|b\.?e|b\.?sc|m\.?tech|mba|phd|bachelor|master|diploma|12th|10th|hsc)\b/i.test(l))
          .slice(0, 3)
          .map((l: string) => ({ degree: cleanLine(l), institution: '', year: l.match(/\b(20\d{2})\b/)?.[0] ?? '' })),
        experience: lines
          .filter((l: string) => /\b(intern|engineer|developer|analyst|researcher|manager|scientist)\b/i.test(l) && l.length < 100)
          .slice(0, 3)
          .map((l: string) => ({ role: cleanLine(l), company: '', duration: '', bullets: [] })),
        projects: [],
        certifications: [],
        links: {
          github: text.match(/github\.com\/[a-zA-Z0-9\-_.]+/)?.[0] ? `https://${text.match(/github\.com\/[a-zA-Z0-9\-_.]+/)?.[0]}` : '',
          linkedin: text.match(/linkedin\.com\/in\/[a-zA-Z0-9\-_.]+/)?.[0] ? `https://${text.match(/linkedin\.com\/in\/[a-zA-Z0-9\-_.]+/)?.[0]}` : '',
          portfolio: '',
        },
      },
      source: 'local',
    })

  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json(
      { error: 'Internal error: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
