# InternshipIQ MVP

> AI-powered internship matching platform — "Spotify for Internships"

## Stack
- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + CSS variables (dark editorial theme)
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`) for resume parsing
- **State**: localStorage (no DB for MVP)

## Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with rotating hero |
| `/onboarding` | 3-step: upload resume → review profile → set preferences |
| `/dashboard` | Match score overview, skill gap chart, daily digest |
| `/jobs` | Filterable job feed with match %, detail panel |
| `/gaps` | Full skill gap analysis with learning resources |
| `/profile` | Editable parsed profile |

## API Routes
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/extract-text` | POST | Extract text from PDF/DOCX/TXT upload |
| `/api/parse-resume` | POST | Parse resume text → structured JSON via Claude |
| `/api/jobs` | GET | Return mock jobs scored against user skills |

## Getting Started

```bash
# Install dependencies
npm install

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## User Flow
1. Land on `/` → click "Analyze my resume"
2. Upload PDF/DOCX or use "demo profile"
3. Review AI-parsed profile (skills, experience, projects)
4. Set preferences (roles, domains, remote/onsite)
5. Land on `/dashboard` — see match scores + skill gaps
6. Browse `/jobs` — filter, search, view match breakdown per job
7. Visit `/gaps` — get learning roadmap to close skill gaps

## AI Architecture
- **Real AI**: Resume parsing via Claude Sonnet — extracts structured JSON from raw text
- **Mock matching**: Weighted scoring engine (resume 40% + skills 25% + experience 15% + location 10% + prefs 10%)
- **Phase 2**: Replace mock with embeddings + semantic search

## Job Sources (Mock Data)
Currently seeded with 8 real internship-style listings from:
`Greenhouse`, `Lever`, `Ashby`, `YC Jobs` — lowest legal risk, API-accessible in production

## Deploy
```bash
# Vercel (recommended)
npx vercel

# Self-hosted
npm run build && npm start
```

Set `ANTHROPIC_API_KEY` in your deployment environment variables.
