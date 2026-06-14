# InternshipIQ Production Setup Notes

## Resume Parsing

The resume pipeline is now:

1. Extract native text from PDF/DOCX/TXT in `src/app/api/extract-text/route.ts`.
2. For scanned PDFs with weak/no text, use Gemini document OCR when `GEMINI_API_KEY` is configured.
3. Parse with deterministic local extractors plus Groq structured extraction when `GROQ_API_KEY` is configured.
4. Reconcile LLM output with resume-grounded evidence.
5. Return `confidence`, `missingFields`, and `lowConfidenceFields` for the editable onboarding review screen.
6. Persist achievements through Alembic migration `b7f9c2a41e20`.

Run the DB migration from `backend`:

```powershell
alembic upgrade head
```

## OAuth

Mock Google/GitHub login is disabled. Configure real OAuth apps:

Frontend `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
```

Backend `backend/.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SECRET_KEY=...
```

Allowed callback URLs:

```text
http://localhost:3000/auth/callback/google
http://localhost:3000/auth/callback/github
https://your-domain.com/auth/callback/google
https://your-domain.com/auth/callback/github
```

## Search

Search now includes:

- synonym expansion in `backend/app/utils/search_engine.py`
- typo tolerance
- lightweight semantic lexical scoring
- weighted ranking by relevance, skill match, recency, quality, and source
- `/jobs/autocomplete`
- related filter suggestions

For a larger production index, add `pgvector` columns for job embeddings and compute embeddings during scraper ingestion. The current implementation keeps the architecture dependency-light and works with existing PostgreSQL tables.

## Deployment Checklist

1. Set all frontend and backend environment variables.
2. Run `alembic upgrade head`.
3. Start FastAPI separately from background workers in production if scaling beyond one API process.
4. Configure OAuth provider redirect URLs.
5. Configure `GEMINI_API_KEY` for scanned-resume OCR.
6. Configure `GROQ_API_KEY` for stronger structured parsing.
7. Use a non-default `SECRET_KEY`.
8. Move resume storage to private object storage before production user uploads.
