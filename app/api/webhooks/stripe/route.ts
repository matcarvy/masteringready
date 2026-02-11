/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events:
 * - checkout.session.completed: New subscription or purchase
 * - invoice.paid: Subscription renewal
 * - invoice.payment_failed: Subscription payment failed
 * - charge.failed: One-time payment failed (Single/Addon)
 * - customer.subscription.deleted: Subscription cancelled
 * - customer.subscription.updated: Subscription changed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

// Use service role for webhook operations
function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient()
  const supabase = getSupabaseAdmin()

  // Get raw body for signature verification
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log(`Stripe webhook received: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase, stripe)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase)
        break

      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

type SupabaseAdmin = SupabaseClient

/**
 * Insert a payment record only if it hasn't been recorded yet.
 * Deduplicates on stripe_payment_intent_id OR stripe_invoice_id (subscriptions use invoices, not payment intents).
 * Prevents duplicate records when Stripe replays webhook events or fires multiple events for the same payment.
 */
async function insertPaymentIfNew(
  supabase: SupabaseAdmin,
  payment: Record<string, any>
) {
  // Check payment intent dedup
  if (payment.stripe_payment_intent_id) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', payment.stripe_payment_intent_id)
      .maybeSingle()
    if (existing) {
      console.log(`Payment already recorded for intent ${payment.stripe_payment_intent_id}, skipping`)
      return
    }
  }
  // Check invoice dedup (subscription payments route through invoices, payment_intent may be null)
  if (payment.stripe_invoice_id) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_invoice_id', payment.stripe_invoice_id)
      .maybeSingle()
    if (existing) {
      console.log(`Payment already recorded for invoice ${payment.stripe_invoice_id}, skipping`)
      return
    }
  }
  await supabase.from('payments').insert(payment)
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseAdmin,
  stripe: Stripe
) {
  const userId = session.metadata?.user_id
  const productType = session.metadata?.product_type
  const countryCode = session.metadata?.country_code || 'US'
  const amountCents = parseInt(session.metadata?.amount_cents || '0')
  const regionalPrice = (amountCents || 0) / 100

  if (!userId || !productType) {
    console.error('Missing metadata in checkout session')
    return
  }

  console.log(`Checkout completed: ${productType} for user ${userId}`)

  if (productType === 'pro_monthly') {
    // Handle Pro subscription
    const subscriptionId = session.subscription as string
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Get Pro plan ID
    const { data: proPlan } = await supabase
      .from('plans')
      .select('id')
      .eq('type', 'pro')
      .single() as { data: { id: string } | null }

    if (!proPlan) {
      console.error('Pro plan not found')
      return
    }

    // Check free analyses used for welcome bonus
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('analyses_lifetime_used')
      .eq('id', userId)
      .single()
    if (profileError) {
      console.error(`Failed to fetch profile for welcome bonus (user ${userId}):`, profileError)
    }
    const welcomeBonus = Math.min(profileData?.analyses_lifetime_used || 0, 2)
    if (welcomeBonus > 0) {
      console.log(`Welcome bonus for user ${userId}: ${welcomeBonus} analyses restored`)
    }

    // Get subscription period from Stripe
    // API 2025-12-15.clover moved period to items; fall back to top-level for older versions
    const subAny = subscription as any
    const periodStart: number | undefined =
      subAny.current_period_start ??
      subAny.items?.data?.[0]?.current_period_start ??
      undefined
    const periodEnd: number | undefined =
      subAny.current_period_end ??
      subAny.items?.data?.[0]?.current_period_end ??
      undefined

    // Fallback: now + 30 days if period not available
    const now = Math.floor(Date.now() / 1000)
    const safeStart = periodStart || now
    const safeEnd = periodEnd || (now + 30 * 24 * 60 * 60)

    // Update or create subscription record
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_id: proPlan.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId,
        status: 'active' as SubscriptionStatus,
        current_period_start: new Date(safeStart * 1000).toISOString(),
        current_period_end: new Date(safeEnd * 1000).toISOString(),
        analyses_used_this_cycle: 0,
        addon_analyses_remaining: welcomeBonus,
        addon_packs_this_cycle: 0
      }, {
        onConflict: 'user_id'
      })

    if (subError) {
      console.error('Error updating subscription:', subError)
    }

    // Record payment (idempotent — safe on webhook replay)
    await insertPaymentIfNew(supabase, {
      user_id: userId,
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_invoice_id: session.invoice as string || null,
      amount: regionalPrice,
      currency: 'USD',
      status: 'succeeded' as PaymentStatus,
      description: 'Pro Monthly Subscription'
    })

  } else if (productType === 'single') {
    // Handle single analysis purchase
    const { data: singlePlan } = await supabase
      .from('plans')
      .select('id')
      .eq('type', 'single')
      .single()

    if (!singlePlan) {
      console.error('Single plan not found')
      return
    }

    // Create purchase record
    await supabase.from('purchases').insert({
      user_id: userId,
      plan_id: singlePlan.id,
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_checkout_session_id: session.id,
      amount: regionalPrice,
      currency: 'USD',
      country_code: countryCode,
      analyses_granted: 1,
      analyses_used: 0,
      status: 'succeeded' as PaymentStatus
    })

    // Record payment (idempotent — safe on webhook replay)
    await insertPaymentIfNew(supabase, {
      user_id: userId,
      stripe_payment_intent_id: session.payment_intent as string || null,
      amount: regionalPrice,
      currency: 'USD',
      status: 'succeeded' as PaymentStatus,
      description: 'Single Analysis Purchase'
    })

  } else if (productType === 'addon') {
    // Handle addon pack purchase
    const { data: addonPlan } = await supabase
      .from('plans')
      .select('id')
      .eq('type', 'addon')
      .single()

    if (!addonPlan) {
      console.error('Addon plan not found')
      return
    }

    // Get user's subscription
    const { data: userSub } = await supabase
      .from('subscriptions')
      .select('id, current_period_end, addon_analyses_remaining, addon_packs_this_cycle')
      .eq('user_id', userId)
      .single()

    // Create purchase record
    const { data: purchase } = await supabase.from('purchases').insert({
      user_id: userId,
      plan_id: addonPlan.id,
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_checkout_session_id: session.id,
      amount: regionalPrice,
      currency: 'USD',
      country_code: countryCode,
      analyses_granted: 10,
      analyses_used: 0,
      status: 'succeeded' as PaymentStatus,
      subscription_id: userSub?.id || null,
      expires_at: userSub?.current_period_end || null
    }).select('id').single()

    // Update subscription with addon
    if (userSub) {
      await supabase
        .from('subscriptions')
        .update({
          addon_analyses_remaining: (userSub.addon_analyses_remaining || 0) + 10,
          addon_packs_this_cycle: (userSub.addon_packs_this_cycle || 0) + 1
        })
        .eq('id', userSub.id)
    }

    // Record payment (idempotent — safe on webhook replay)
    await insertPaymentIfNew(supabase, {
      user_id: userId,
      stripe_payment_intent_id: session.payment_intent as string || null,
      amount: regionalPrice,
      currency: 'USD',
      status: 'succeeded' as PaymentStatus,
      description: 'Pro Add-on Pack (10 analyses)'
    })
  }
}

/**
 * Handle invoice.paid (subscription renewal)
 */
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: SupabaseAdmin
) {
  // Cast invoice to access properties that may vary by API version
  const invoiceData = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null
    payment_intent?: string | { id: string } | null
  }

  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id

  if (!subscriptionId) return

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error('Subscription not found for invoice:', invoice.id)
    return
  }

  console.log(`Invoice paid for subscription ${subscriptionId}`)

  // Reset cycle counters on renewal
  const periodStart = invoice.lines?.data[0]?.period?.start
  const periodEnd = invoice.lines?.data[0]?.period?.end

  if (periodStart && periodEnd) {
    await supabase
      .from('subscriptions')
      .update({
        analyses_used_this_cycle: 0,
        addon_analyses_remaining: 0,
        addon_packs_this_cycle: 0,
        current_period_start: new Date(periodStart * 1000).toISOString(),
        current_period_end: new Date(periodEnd * 1000).toISOString(),
        status: 'active' as SubscriptionStatus
      })
      .eq('id', subscription.id)
  }

  // Record payment
  const paymentIntentId = typeof invoiceData.payment_intent === 'string'
    ? invoiceData.payment_intent
    : invoiceData.payment_intent?.id || null

  // Record payment (idempotent — safe on webhook replay)
  await insertPaymentIfNew(supabase, {
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: paymentIntentId,
    amount: (invoice.amount_paid || 0) / 100,
    currency: invoice.currency?.toUpperCase() || 'USD',
    status: 'succeeded' as PaymentStatus,
    description: 'Pro Monthly Subscription Renewal',
    receipt_url: invoice.hosted_invoice_url || null
  })
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseAdmin
) {
  // Cast invoice to access properties that may vary by API version
  const invoiceData = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null
  }

  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id

  if (!subscriptionId) return

  console.log(`Invoice payment failed for subscription ${subscriptionId}`)

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' as SubscriptionStatus })
    .eq('stripe_subscription_id', subscriptionId)

  // Record failed payment
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription) {
    // Record failed payment (idempotent — safe on webhook replay)
    await insertPaymentIfNew(supabase, {
      user_id: subscription.user_id,
      stripe_invoice_id: invoice.id,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency?.toUpperCase() || 'USD',
      status: 'failed' as PaymentStatus,
      description: 'Pro Monthly Subscription - Payment Failed',
      failure_message: 'Payment failed - please update your payment method'
    })
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
) {
  console.log(`Subscription deleted: ${subscription.id}`)

  // Get user's subscription record
  const { data: subRecord } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!subRecord) return

  // Get free plan ID
  const { data: freePlan } = await supabase
    .from('plans')
    .select('id')
    .eq('type', 'free')
    .single()

  if (!freePlan) return

  // Downgrade to free plan
  await supabase
    .from('subscriptions')
    .update({
      plan_id: freePlan.id,
      stripe_subscription_id: null,
      status: 'canceled' as SubscriptionStatus,
      canceled_at: new Date().toISOString(),
      analyses_used_this_cycle: 0,
      addon_analyses_remaining: 0,
      addon_packs_this_cycle: 0
    })
    .eq('id', subRecord.id)
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
) {
  console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`)

  // Get period from Stripe — API 2025-12-15.clover moved period to items
  const subAny = subscription as any
  const periodStart: number | undefined =
    subAny.current_period_start ??
    subAny.items?.data?.[0]?.current_period_start ??
    undefined
  const periodEnd: number | undefined =
    subAny.current_period_end ??
    subAny.items?.data?.[0]?.current_period_end ??
    undefined

  // Map Stripe status to our status
  const statusMap: Record<string, SubscriptionStatus> = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'past_due',
    'trialing': 'trialing',
    'paused': 'paused'
  }

  const status = statusMap[subscription.status] || 'active'

  // Build period fields only if available
  const periodFields: Record<string, string> = {}
  if (periodStart) periodFields.current_period_start = new Date(periodStart * 1000).toISOString()
  if (periodEnd) periodFields.current_period_end = new Date(periodEnd * 1000).toISOString()

  await supabase
    .from('subscriptions')
    .update({
      status,
      ...periodFields,
      ...(subscription.cancel_at && {
        canceled_at: new Date(subscription.cancel_at * 1000).toISOString()
      })
    })
    .eq('stripe_subscription_id', subscription.id)
}

/**
 * Handle charge.failed — records failed one-time payments (Single/Addon)
 */
async function handleChargeFailed(
  charge: Stripe.Charge,
  supabase: SupabaseAdmin
) {
  // Only handle one-time payment failures (subscriptions handled by invoice.payment_failed)
  const chargeData = charge as Stripe.Charge & { invoice?: string | null }
  if (chargeData.invoice) {
    console.log(`Charge failed for invoice ${chargeData.invoice}, handled by invoice.payment_failed`)
    return
  }

  const customerId = typeof charge.customer === 'string'
    ? charge.customer
    : (charge.customer as { id: string } | null)?.id

  if (!customerId) {
    console.log('Charge failed with no customer ID, skipping')
    return
  }

  console.log(`One-time charge failed for customer ${customerId}: ${charge.failure_message || 'unknown reason'}`)

  // Look up user by stripe_customer_id
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  const userId = subscription?.user_id || charge.metadata?.user_id

  if (!userId) {
    console.log(`Could not find user for customer ${customerId}`)
    return
  }

  // Record failed payment (idempotent)
  await insertPaymentIfNew(supabase, {
    user_id: userId,
    stripe_payment_intent_id: typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id || null,
    amount: charge.amount / 100,
    currency: charge.currency?.toUpperCase() || 'USD',
    status: 'failed' as PaymentStatus,
    description: `Payment failed: ${charge.metadata?.product_type || 'one-time purchase'}`,
    failure_message: charge.failure_message || 'Payment declined'
  })
}
