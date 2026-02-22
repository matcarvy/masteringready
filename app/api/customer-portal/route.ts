/**
 * Stripe Customer Portal API Endpoint
 *
 * POST /api/customer-portal
 *
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * Allows users to:
 * - Update payment method
 * - Cancel subscription
 * - View invoices and receipts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPortalSession } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's subscription to find Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single() as { data: { stripe_customer_id: string | null } | null }

    if (!subscription || !subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Build return URL (whitelist origins to prevent spoofed redirects)
    const ALLOWED_ORIGINS = [
      'https://masteringready.com',
      'https://www.masteringready.com',
      'https://masteringready-git-dev-matcarvys-projects.vercel.app',
      'http://localhost:3000',
    ]
    const origin = request.headers.get('origin')
    const safeOrigin = (origin && ALLOWED_ORIGINS.includes(origin))
      ? origin
      : 'https://masteringready.com'
    const returnUrl = `${safeOrigin}/dashboard`

    // Create portal session
    const session = await createPortalSession(
      subscription.stripe_customer_id,
      returnUrl
    )

    return NextResponse.json({
      url: session.url
    })

  } catch (error) {
    console.error('Customer portal error:', error instanceof Error ? error.message : (error as any)?.message || 'Unknown error')
    return NextResponse.json(
      { error: 'Portal creation failed' },
      { status: 500 }
    )
  }
}
