/**
 * Stripe Configuration and Utilities
 *
 * This file contains:
 * - Stripe client initialization
 * - Product/Price definitions
 * - Helper functions for checkout and webhooks
 */

import Stripe from 'stripe'
import { PRICING } from './geoip'

// Initialize Stripe client (server-side only)
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(secretKey)
}

// Product IDs (set after creating products in Stripe)
// These will be stored in environment variables or database
export const STRIPE_PRODUCTS = {
  PRO_MONTHLY: process.env.STRIPE_PRODUCT_PRO_MONTHLY || '',
  SINGLE_ANALYSIS: process.env.STRIPE_PRODUCT_SINGLE || '',
  ADDON_PACK: process.env.STRIPE_PRODUCT_ADDON || ''
} as const

// Price configuration for regional pricing
// Maps country tier to price multiplier
export interface StripePriceConfig {
  productId: string
  basePriceUsd: number
  currency: string
  recurring?: {
    interval: 'month' | 'year'
    interval_count: number
  }
}

// Product definitions for setup
export const PRODUCT_DEFINITIONS = {
  PRO_MONTHLY: {
    name: 'MasteringReady Pro',
    description: 'Professional audio analysis with 30 analyses per month',
    basePriceUsd: PRICING.PRO_MONTHLY,
    features: [
      '30 analyses per month',
      'Complete analysis with PDF',
      'Priority processing',
      'Full history access'
    ],
    recurring: { interval: 'month' as const, interval_count: 1 }
  },
  SINGLE_ANALYSIS: {
    name: 'Single Analysis',
    description: 'One complete audio analysis',
    basePriceUsd: PRICING.SINGLE,
    features: [
      '1 complete analysis',
      'PDF download included',
      'Permanently saved',
      'Priority processing'
    ]
  },
  ADDON_PACK: {
    name: 'Pro Add-on Pack',
    description: '10 extra analyses for Pro subscribers',
    basePriceUsd: PRICING.ADDON_PACK,
    features: [
      '10 additional analyses',
      'Valid until end of billing cycle',
      'Maximum 2 packs per month'
    ]
  }
} as const

// Regional price tiers (multipliers)
export const PRICE_TIERS = {
  // Tier 1: Benchmark (1.0x)
  TIER_1: { multiplier: 1.0, countries: ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL'] },
  // Tier 2: LATAM (varies)
  TIER_2_MX: { multiplier: 0.70, countries: ['MX'] },
  TIER_2_CL: { multiplier: 0.75, countries: ['CL', 'UY'] },
  TIER_2_BR: { multiplier: 0.60, countries: ['BR'] },
  TIER_2_CO: { multiplier: 0.50, countries: ['CO', 'PY'] },
  TIER_2_PE: { multiplier: 0.55, countries: ['PE', 'EC', 'SV'] },
  TIER_2_PA: { multiplier: 0.65, countries: ['PA'] },
  TIER_2_AR: { multiplier: 0.40, countries: ['AR'] }
} as const

/**
 * Calculate price with regional multiplier
 */
export function calculateRegionalPrice(baseUsd: number, multiplier: number): number {
  const price = baseUsd * multiplier
  // Round to nearest cent
  return Math.round(price * 100) / 100
}

/**
 * Convert USD price to Stripe amount (cents)
 */
export function toStripeAmount(usdPrice: number): number {
  return Math.round(usdPrice * 100)
}

/**
 * Create Stripe checkout session configuration
 */
export interface CreateCheckoutParams {
  userId: string
  userEmail: string
  productType: 'pro_monthly' | 'single' | 'addon'
  priceId: string
  countryCode: string
  successUrl: string
  cancelUrl: string
  subscriptionId?: string // For addon packs
}

/**
 * Create checkout session for a product
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient()

  const isSubscription = params.productType === 'pro_monthly'

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: isSubscription ? 'subscription' : 'payment',
    customer_email: params.userEmail,
    line_items: [
      {
        price: params.priceId,
        quantity: 1
      }
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      user_id: params.userId,
      product_type: params.productType,
      country_code: params.countryCode,
      ...(params.subscriptionId && { subscription_id: params.subscriptionId })
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto'
  }

  // For subscriptions, add subscription-specific config
  if (isSubscription) {
    sessionConfig.subscription_data = {
      metadata: {
        user_id: params.userId,
        country_code: params.countryCode
      }
    }
  }

  // For one-time payments, add payment intent config
  if (!isSubscription) {
    sessionConfig.payment_intent_data = {
      metadata: {
        user_id: params.userId,
        product_type: params.productType,
        country_code: params.countryCode
      }
    }
  }

  return stripe.checkout.sessions.create(sessionConfig)
}

/**
 * Create customer portal session
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeClient()

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  })
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Get or create Stripe customer for user
 */
export async function getOrCreateCustomer(userId: string, email: string): Promise<Stripe.Customer> {
  const stripe = getStripeClient()

  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1
  })

  if (existingCustomers.data.length > 0) {
    const customer = existingCustomers.data[0]
    // Update metadata if needed
    if (customer.metadata.user_id !== userId) {
      return stripe.customers.update(customer.id, {
        metadata: { user_id: userId }
      })
    }
    return customer
  }

  // Create new customer
  return stripe.customers.create({
    email: email,
    metadata: { user_id: userId }
  })
}

/**
 * Retrieve subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()
  return stripe.subscriptions.retrieve(subscriptionId)
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId)
  }

  // Cancel at period end (user keeps access until end of billing cycle)
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  })
}
