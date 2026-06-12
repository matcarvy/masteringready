/**
 * Analyze Token API Endpoint
 *
 * POST /api/analyze-token
 *
 * Issues a short-lived HMAC-signed token that the Render analysis backend
 * validates before accepting an upload. When the caller sends a Supabase
 * Bearer token, the session is verified and the quota RPC runs server-side,
 * so neither auth status nor quota can be self-reported to the backend.
 *
 * Inert until ANALYZE_TOKEN_SECRET is set on both Vercel and Render:
 * without the secret this returns { token: null } and the backend skips
 * validation entirely.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

const TOKEN_TTL_SECONDS = 600

export async function POST(request: NextRequest) {
  const secret = process.env.ANALYZE_TOKEN_SECRET
  if (!secret) {
    return NextResponse.json({ token: null })
  }

  let auth = false
  let uid: string | null = null

  const bearer = request.headers.get('authorization')?.replace('Bearer ', '')
  if (bearer) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data: { user }, error } = await supabase.auth.getUser(bearer)
    if (!error && user) {
      auth = true
      uid = user.id

      // Server-side quota gate: an explicit "no quota" refuses the token.
      // RPC failures fall through so an infra hiccup never blocks analysis;
      // the existing frontend quota layers still apply.
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        try {
          const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
            { auth: { persistSession: false, autoRefreshToken: false } }
          )
          const { data, error: rpcError } = await admin.rpc('can_user_analyze', {
            p_user_id: user.id
          })
          const row = Array.isArray(data) ? data[0] : data
          if (!rpcError && row && row.can_analyze === false) {
            return NextResponse.json({ error: 'quota_exceeded' }, { status: 403 })
          }
        } catch {}
      }
    }
  }

  const payload = JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    auth,
    uid
  })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret).update(payloadB64).digest('hex')

  return NextResponse.json({ token: `${payloadB64}.${sig}` })
}
