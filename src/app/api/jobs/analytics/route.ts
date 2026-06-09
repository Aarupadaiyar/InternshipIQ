import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const backendUrl = 'http://localhost:8000/jobs/analytics'

  try {
    const res = await fetch(backendUrl, { cache: 'no-store' })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Backend failed to fetch scraper analytics' },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Proxy analytics error:', err)
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 })
  }
}
