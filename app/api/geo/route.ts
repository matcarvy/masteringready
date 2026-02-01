import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geo — Returns the user's country code from Vercel headers.
 *
 * Vercel automatically provides X-Vercel-IP-Country on every request.
 * This works reliably on all devices (mobile, desktop, WiFi, cellular)
 * because it reads the IP at the edge, not from a third-party API.
 */
export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') || null

  return NextResponse.json({
    countryCode: country,
    source: country ? 'vercel' : 'none'
  })
}
