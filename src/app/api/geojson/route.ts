import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_HOSTS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
]

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  try {
    const parsed = new URL(url)
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: 'URL not permitted' }, { status: 403 })
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[/api/geojson]', error)
    return NextResponse.json({ error: 'Failed to fetch geojson' }, { status: 500 })
  }
}
