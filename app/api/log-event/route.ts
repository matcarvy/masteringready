import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { type, message, metadata } = body as {
      type?: string
      message?: string
      metadata?: Record<string, unknown>
    }
    const entry = {
      ts: new Date().toISOString(),
      type: type || 'unknown',
      message: message || '',
      metadata: metadata || {},
      ua: req.headers.get('user-agent')?.slice(0, 200) || '',
    }
    console.error('[client-event]', JSON.stringify(entry))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
