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
import { createClient } from '@supabase/supabase-js'
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

// ISO 3166-1 alpha-2 country codes (complete list)
const VALID_COUNTRY_CODES = new Set([
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
  'HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA',
  'RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
])

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CheckoutRequest = await request.json()
    const { productType, countryCode: clientCountryCode = 'US' } = body

    // Verify country code server-side to prevent pricing manipulation
    const serverCountry = request.headers.get('x-vercel-ip-country') || clientCountryCode
    const rawCountry = (serverCountry || 'US').toUpperCase()
    const countryCode = VALID_COUNTRY_CODES.has(rawCountry) ? rawCountry : 'US'

    if (!productType || !['pro_monthly', 'single', 'addon'].includes(productType)) {
      return NextResponse.json(
        { error: 'Invalid product type' },
        { status: 400 }
      )
    }

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
    console.error('Checkout error:', error instanceof Error ? error.message : (error as any)?.message || 'Unknown error')
    return NextResponse.json(
      { error: 'Checkout failed' },
      { status: 500 }
    )
  }
}
