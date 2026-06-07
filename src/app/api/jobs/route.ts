import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const skills = searchParams.get('skills') || ''
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || 'all'
  const source = searchParams.get('source') || 'all'
  const domain = searchParams.get('domain') || 'all'
  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '20'

  const backendUrl = `http://localhost:8000/jobs?skills=${encodeURIComponent(skills)}&search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}&source=${encodeURIComponent(source)}&domain=${encodeURIComponent(domain)}&page=${page}&limit=${limit}`

  try {
    const res = await fetch(backendUrl, { cache: 'no-store' })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json({ error: errorData.detail || 'Backend failed to fetch jobs' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Proxy jobs error:', err)
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 })
  }
}
