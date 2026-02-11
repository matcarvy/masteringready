/**
 * Stripe Checkout API Endpoint
 *
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for:
 * - Pro Monthly subscription
 * - Single Analysis purchase
 * - Add-on Pack purchase (Pro only)
 *
 * Includes regional pricing with local currency for Tier 1 countries.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getStripeClient, getOrCreateCustomer } from '@/lib/stripe'
import { getProductPrice, getPricingForCountry } from '@/lib/pricing-config'

export const dynamic = 'force-dynamic'

interface CheckoutRequest {
  productType: 'pro_monthly' | 'single' | 'addon'
  countryCode?: string
}

// Product names for Stripe
const PRODUCT_NAMES = {
  pro_monthly: 'Mastering Ready Pro',
  single: 'Single Analysis',
  addon: 'Pro Add-on Pack'
} as const

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CheckoutRequest = await request.json()
    const { productType, countryCode: clientCountryCode = 'US' } = body

    // Verify country code server-side to prevent pricing manipulation
    const serverCountry = request.headers.get('x-vercel-ip-country') || clientCountryCode
    const countryCode = serverCountry || 'US'

    if (!productType || !['pro_monthly', 'single', 'addon'].includes(productType)) {
      return NextResponse.json(
        { error: 'Invalid product type' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's subscription for addon validation
    if (productType === 'addon') {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, status, plan_id, addon_packs_this_cycle')
        .eq('user_id', user.id)
        .single() as { data: { id: string; status: string; plan_id: string; addon_packs_this_cycle: number } | null }

      if (!subscription) {
        return NextResponse.json(
          { error: 'Add-on packs are only available for Pro subscribers' },
          { status: 403 }
        )
      }

      // Get the plan type
      const { data: plan } = await supabase
        .from('plans')
        .select('type')
        .eq('id', subscription.plan_id)
        .single() as { data: { type: string } | null }

      // Check if user is Pro subscriber
      if (!plan || plan.type !== 'pro') {
        return NextResponse.json(
          { error: 'Add-on packs are only available for Pro subscribers' },
          { status: 403 }
        )
      }

      // Check if user has reached max packs
      if ((subscription.addon_packs_this_cycle || 0) >= 2) {
        return NextResponse.json(
          { error: 'Maximum 2 add-on packs per billing cycle' },
          { status: 403 }
        )
      }
    }

    // Get pricing for this country (with local currency for Tier 1)
    const priceInfo = getProductPrice(countryCode, productType)
    const pricingConfig = getPricingForCountry(countryCode)

    // Get or create Stripe customer
    const stripe = getStripeClient()
    const customer = await getOrCreateCustomer(user.id, user.email!)

    // Create price for this checkout with correct currency
    const stripePrice = await stripe.prices.create({
      currency: priceInfo.currency,
      unit_amount: priceInfo.amount,
      product_data: {
        name: PRODUCT_NAMES[productType],
        metadata: {
          product_type: productType,
          country_code: countryCode,
          currency: priceInfo.currency.toUpperCase()
        }
      },
      ...(productType === 'pro_monthly' && {
        recurring: {
          interval: 'month',
          interval_count: 1
        }
      })
    })

    // Build URLs (with origin validation)
    const ALLOWED_ORIGINS = [
      'https://masteringready.com',
      'https://www.masteringready.com',
      'https://masteringready-git-dev-matcarvys-projects.vercel.app',
      'http://localhost:3000',
    ]
    const requestOrigin = request.headers.get('origin')
    const origin = (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin))
      ? requestOrigin
      : 'https://masteringready.com'
    const successUrl = `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/dashboard?checkout=cancelled`

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: productType === 'pro_monthly' ? 'subscription' : 'payment',
      customer: customer.id,
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        product_type: productType,
        country_code: countryCode,
        currency: priceInfo.currency.toUpperCase(),
        amount_cents: priceInfo.amount.toString()
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      ...(productType === 'pro_monthly' && {
        subscription_data: {
          metadata: {
            user_id: user.id,
            country_code: countryCode
          }
        }
      }),
      ...(productType !== 'pro_monthly' && {
        payment_intent_data: {
          metadata: {
            user_id: user.id,
            product_type: productType,
            country_code: countryCode
          }
        }
      })
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      currency: priceInfo.currency.toUpperCase(),
      amount: priceInfo.amount
    })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
