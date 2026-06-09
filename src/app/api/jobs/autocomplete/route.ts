import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = searchParams.get('limit') || '8'

  try {
    const res = await fetch(`${API_BASE}/jobs/autocomplete?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ suggestions: [], relatedFilters: { skills: [], domains: [] } }, { status: 200 })
  }
}
