/**
 * Auth Callback Route / Ruta de Callback de Auth
 *
 * Handles OAuth redirects and email confirmations
 * Maneja redirecciones OAuth y confirmaciones de email
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Get the origin for redirects
  const origin = requestUrl.origin

  // Handle OAuth/Auth errors
  if (error) {
    console.error('Auth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, origin)
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Handle email confirmation (token_hash)
  if (token_hash && type) {
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'signup' | 'recovery' | 'email'
      })

      if (verifyError) {
        console.error('Email verification error:', verifyError)
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(verifyError.message)}`, origin)
        )
      }

      // Success - redirect to home
      return NextResponse.redirect(new URL('/?verified=true', origin))
    } catch (err) {
      console.error('Verification error:', err)
      return NextResponse.redirect(
        new URL('/auth/login?error=verification_error', origin)
      )
    }
  }

  // Handle OAuth code exchange
  if (code) {
    try {
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(sessionError.message)}`, origin)
        )
      }

      // Success - redirect to home
      return NextResponse.redirect(new URL('/', origin))
    } catch (err) {
      console.error('Callback error:', err)
      return NextResponse.redirect(
        new URL('/auth/login?error=callback_error', origin)
      )
    }
  }

  // No code or token provided - redirect to login
  return NextResponse.redirect(new URL('/auth/login', origin))
}
