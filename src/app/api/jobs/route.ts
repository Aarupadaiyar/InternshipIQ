import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // Standard filters
  const skills = searchParams.get('skills') || ''
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || 'all'
  const source = searchParams.get('source') || 'all'
  const domain = searchParams.get('domain') || 'all'
  const location = searchParams.get('location') || ''
  const company = searchParams.get('company') || ''
  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '20'

  // Advanced filters (new)
  const salary_min = searchParams.get('salary_min') || ''
  const salary_max = searchParams.get('salary_max') || ''
  const experience = searchParams.get('experience') || ''
  const internship_type = searchParams.get('internship_type') || ''
  const company_type = searchParams.get('company_type') || ''
  const deadline = searchParams.get('deadline') || ''
  const posted_days = searchParams.get('posted_days') || ''
  const verified_only = searchParams.get('verified_only') || ''

  const params = new URLSearchParams({
    skills,
    search,
    type,
    source,
    domain,
    location,
    company,
    page,
    limit,
    ...(salary_min && { salary_min }),
    ...(salary_max && { salary_max }),
    ...(experience && { experience }),
    ...(internship_type && { internship_type }),
    ...(company_type && { company_type }),
    ...(deadline && { deadline }),
    ...(posted_days && { posted_days }),
    ...(verified_only && { verified_only }),
  })

  const backendUrl = `http://localhost:8000/jobs?${params.toString()}`

  try {
    const res = await fetch(backendUrl, { cache: 'no-store' })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Backend failed to fetch jobs' },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Proxy jobs error:', err)
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 })
  }
}
