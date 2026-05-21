/**
 * Stripe Configuration and Utilities
 *
 * This file contains:
 * - Stripe client initialization
 * - Helper functions for checkout and webhooks
 */

import Stripe from 'stripe'

// Initialize Stripe client (server-side only)
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(secretKey)
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
