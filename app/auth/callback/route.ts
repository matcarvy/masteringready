/**
 * Auth Callback Route / Ruta de Callback de Auth
 *
 * Handles OAuth redirects and email confirmations
 * Maneja redirecciones OAuth y confirmaciones de email
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getLanguageFromCookieHeader } from '@/lib/language'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Get the origin for redirects
  const origin = requestUrl.origin

  // Read language preference from cookie to preserve across auth flow
  const cookieLang = getLanguageFromCookieHeader(request.headers.get('cookie'))
  const langParam = cookieLang ? `lang=${cookieLang}` : ''

  // Handle OAuth/Auth errors
  if (error) {
    console.error('Auth error:', error, errorDescription)
    const errorParam = `error=${encodeURIComponent(errorDescription || error)}`
    const params = langParam ? `${errorParam}&${langParam}` : errorParam
    return NextResponse.redirect(
      new URL(`/auth/login?${params}`, origin)
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
        const errorParam = `error=${encodeURIComponent(verifyError.message)}`
        const params = langParam ? `${errorParam}&${langParam}` : errorParam
        return NextResponse.redirect(
          new URL(`/auth/login?${params}`, origin)
        )
      }

      // Success - redirect to home with language
      const params = langParam ? `verified=true&${langParam}` : 'verified=true'
      return NextResponse.redirect(new URL(`/?${params}`, origin))
    } catch (err) {
      console.error('Verification error:', err)
      const errorParam = 'error=verification_error'
      const params = langParam ? `${errorParam}&${langParam}` : errorParam
      return NextResponse.redirect(
        new URL(`/auth/login?${params}`, origin)
      )
    }
  }

  // Handle OAuth code exchange
  if (code) {
    try {
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        const errorParam = `error=${encodeURIComponent(sessionError.message)}`
        const params = langParam ? `${errorParam}&${langParam}` : errorParam
        return NextResponse.redirect(
          new URL(`/auth/login?${params}`, origin)
        )
      }

      // Success - redirect to home with language
      const redirectUrl = langParam ? `/?${langParam}` : '/'
      return NextResponse.redirect(new URL(redirectUrl, origin))
    } catch (err) {
      console.error('Callback error:', err)
      const errorParam = 'error=callback_error'
      const params = langParam ? `${errorParam}&${langParam}` : errorParam
      return NextResponse.redirect(
        new URL(`/auth/login?${params}`, origin)
      )
    }
  }

  // No code or token provided - redirect to login
  const loginUrl = langParam ? `/auth/login?${langParam}` : '/auth/login'
  return NextResponse.redirect(new URL(loginUrl, origin))
}
