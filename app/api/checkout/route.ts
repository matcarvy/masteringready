/**
 * Stripe Checkout API Endpoint
 *
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for:
 * - Pro Monthly subscription ($9.99)
 * - Single Analysis purchase ($5.99)
 * - Add-on Pack purchase ($3.99, Pro only)
 *
 * Includes regional pricing based on user's country.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getStripeClient,
  getOrCreateCustomer,
  calculateRegionalPrice,
  toStripeAmount,
  PRODUCT_DEFINITIONS
} from '@/lib/stripe'

export const dynamic = 'force-dynamic'

interface CheckoutRequest {
  productType: 'pro_monthly' | 'single' | 'addon'
  countryCode?: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CheckoutRequest = await request.json()
    const { productType, countryCode = 'US' } = body

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

    // Get regional pricing - use default if not found
    let multiplier = 1.0
    const { data: pricing } = await supabase
      .from('regional_pricing')
      .select('multiplier')
      .eq('country_code', countryCode)
      .single() as { data: { multiplier: number } | null }

    if (pricing) {
      multiplier = pricing.multiplier
    }

    // Get product details
    const productKey = productType === 'pro_monthly' ? 'PRO_MONTHLY' :
      productType === 'single' ? 'SINGLE_ANALYSIS' : 'ADDON_PACK'
    const product = PRODUCT_DEFINITIONS[productKey]

    // Calculate regional price
    const regionalPrice = calculateRegionalPrice(product.basePriceUsd, multiplier)

    // Get or create Stripe customer
    const stripe = getStripeClient()
    const customer = await getOrCreateCustomer(user.id, user.email!)

    // Create price for this checkout
    // For regional pricing, we create a custom price
    const stripePrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: toStripeAmount(regionalPrice),
      product_data: {
        name: product.name,
        metadata: {
          product_type: productType,
          base_price_usd: product.basePriceUsd.toString(),
          country_code: countryCode,
          multiplier: multiplier.toString()
        }
      },
      ...(productType === 'pro_monthly' && {
        recurring: {
          interval: 'month',
          interval_count: 1
        }
      })
    })

    // Build URLs
    const origin = request.headers.get('origin') || 'https://masteringready.com'
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
        regional_price: regionalPrice.toString()
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
      url: session.url
    })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
