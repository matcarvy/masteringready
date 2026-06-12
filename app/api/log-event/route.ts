import { NextRequest, NextResponse } from 'next/server'

const MAX_BODY_BYTES = 2048
const RATE_WINDOW_MS = 60_000
const MAX_EVENTS_PER_WINDOW = 10
const MAX_TRACKED_IPS = 1000

const ipHits = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  if (ipHits.size > MAX_TRACKED_IPS) {
    for (const [key, hit] of ipHits) {
      if (now - hit.windowStart > RATE_WINDOW_MS) ipHits.delete(key)
    }
  }
  const hit = ipHits.get(ip)
  if (!hit || now - hit.windowStart > RATE_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now })
    return false
  }
  hit.count++
  return hit.count > MAX_EVENTS_PER_WINDOW
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 })
    }

    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(raw)
    } catch {}

    const { type, message, metadata } = body as {
      type?: string
      message?: string
      metadata?: Record<string, unknown>
    }
    const entry = {
      ts: new Date().toISOString(),
      type: (typeof type === 'string' ? type : 'unknown').slice(0, 50),
      message: (typeof message === 'string' ? message : '').slice(0, 500),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      ua: req.headers.get('user-agent')?.slice(0, 200) || '',
    }
    console.error('[client-event]', JSON.stringify(entry))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
