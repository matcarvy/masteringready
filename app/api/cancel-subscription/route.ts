/**
 * Cancel Subscription API Endpoint
 *
 * POST /api/cancel-subscription
 *
 * Cancels the user's Pro subscription at period end.
 * User keeps access until the end of their current billing cycle.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cancelSubscription } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via Bearer token
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

    // Get user's active subscription with Stripe subscription ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, status')
      .eq('user_id', user.id)
      .single() as { data: { stripe_subscription_id: string | null; stripe_customer_id: string | null; status: string } | null }

    if (!subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      )
    }

    // Cancel at period end — user keeps access until billing cycle ends
    const updated = await cancelSubscription(subscription.stripe_subscription_id)

    return NextResponse.json({
      success: true,
      cancel_at: updated.cancel_at ? new Date(updated.cancel_at * 1000).toISOString() : null
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cancellation failed' },
      { status: 500 }
    )
  }
}
