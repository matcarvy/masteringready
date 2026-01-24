/**
 * Auth Callback Route / Ruta de Callback de Auth
 *
 * Handles OAuth redirects from Google, Apple, Facebook
 * Maneja redirecciones OAuth de Google, Apple, Facebook
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    try {
      // Exchange code for session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(sessionError.message)}`, request.url)
        )
      }

      // Success - redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    } catch (err) {
      console.error('Callback error:', err)
      return NextResponse.redirect(
        new URL('/auth/login?error=callback_error', request.url)
      )
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
