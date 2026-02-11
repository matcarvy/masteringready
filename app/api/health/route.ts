import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic — never evaluate at build time
export const dynamic = 'force-dynamic'

/**
 * Health check endpoint
 *
 * Purpose:
 * 1. Keep Supabase active (free tier pauses after 7 days of inactivity)
 * 2. Monitor database connectivity
 *
 * Usage:
 * - Configure cron-job.org to call this every 5 days
 * - URL: https://masteringready.com/api/health
 */
export async function GET() {
  const start = Date.now()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({
      status: 'error',
      service: 'supabase',
      error: 'Missing environment variables',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }

  try {
    const supabase = createClient(url, key)

    // Simple query to keep Supabase active
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({
        status: 'error',
        service: 'supabase',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    const latency = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      service: 'supabase',
      latency_ms: latency,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    return NextResponse.json({
      status: 'error',
      service: 'supabase',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}
