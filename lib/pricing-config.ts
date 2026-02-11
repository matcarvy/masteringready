/**
 * Regional Pricing Configuration
 *
 * Defines prices per country in local currency.
 * Tier 1: Local currency (EUR, GBP, CAD, AUD)
 * Tier 2-6: USD with PPP multiplier (displayed in local currency)
 *
 * All amounts are in CENTS (999 = $9.99)
 */

import { EXCHANGE_RATES, formatLocalCurrencyPrice } from './geoip'

// Country code → local currency code (for USD-tier countries)
const COUNTRY_TO_LOCAL_CURRENCY: Record<string, string> = {
  'MX': 'MXN',
  'BR': 'BRL',
  'CO': 'COP',
  'PE': 'PEN',
  'EC': 'USD',  // Ecuador uses USD
  'AR': 'ARS',
  'CL': 'CLP',
  'UY': 'UYU',
  'GT': 'GTQ',
  'CR': 'CRC',
  'HN': 'HNL',
  'NI': 'NIO',
  'DO': 'DOP',
  'VE': 'VES',
  'BO': 'BOB',
  'PA': 'USD',  // Panama uses USD
}

export interface PricingConfig {
  currency: string
  pro_monthly: number
  pro_yearly: number
  single: number
  addon: number
}

// Eurozone countries that use EUR
export const EUROZONE_COUNTRIES = [
  'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI',
  'GR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY', 'HR'
] as const

// Pricing by country (amounts in cents)
export const PRICING_BY_COUNTRY: Record<string, PricingConfig> = {
  // ═══════════════════════════════════════════════════════════
  // TIER 1: Local currency, full price
  // ═══════════════════════════════════════════════════════════

  // United States (base)
  'US': { currency: 'usd', pro_monthly: 999, pro_yearly: 9900, single: 599, addon: 399 },

  // United Kingdom
  'GB': { currency: 'gbp', pro_monthly: 1000, pro_yearly: 9900, single: 600, addon: 400 },

  // Canada
  'CA': { currency: 'cad', pro_monthly: 1399, pro_yearly: 13900, single: 799, addon: 499 },

  // Australia
  'AU': { currency: 'aud', pro_monthly: 1499, pro_yearly: 14900, single: 899, addon: 599 },

  // ═══════════════════════════════════════════════════════════
  // TIER 2: 0.75x - Chile, Uruguay
  // ═══════════════════════════════════════════════════════════
  'CL': { currency: 'usd', pro_monthly: 749, pro_yearly: 7490, single: 449, addon: 299 },
  'UY': { currency: 'usd', pro_monthly: 749, pro_yearly: 7490, single: 449, addon: 299 },

  // ═══════════════════════════════════════════════════════════
  // TIER 3: 0.70x - Mexico
  // ═══════════════════════════════════════════════════════════
  'MX': { currency: 'usd', pro_monthly: 699, pro_yearly: 6990, single: 419, addon: 279 },

  // ═══════════════════════════════════════════════════════════
  // TIER 4: 0.60x - Brazil
  // ═══════════════════════════════════════════════════════════
  'BR': { currency: 'usd', pro_monthly: 599, pro_yearly: 5990, single: 359, addon: 239 },

  // ═══════════════════════════════════════════════════════════
  // TIER 5: 0.55x - Colombia, Peru, Ecuador
  // ═══════════════════════════════════════════════════════════
  'CO': { currency: 'usd', pro_monthly: 549, pro_yearly: 5490, single: 329, addon: 219 },
  'PE': { currency: 'usd', pro_monthly: 549, pro_yearly: 5490, single: 329, addon: 219 },
  'EC': { currency: 'usd', pro_monthly: 549, pro_yearly: 5490, single: 329, addon: 219 },

  // ═══════════════════════════════════════════════════════════
  // TIER 6: 0.40x - Argentina
  // ═══════════════════════════════════════════════════════════
  'AR': { currency: 'usd', pro_monthly: 399, pro_yearly: 3990, single: 239, addon: 159 },
}

// EUR pricing for all Eurozone countries
const EUR_PRICING: PricingConfig = {
  currency: 'eur',
  pro_monthly: 1000,  // €10.00
  pro_yearly: 9900,   // €99.00
  single: 600,        // €6.00
  addon: 400          // €4.00
}

// Add Eurozone countries to pricing map
EUROZONE_COUNTRIES.forEach(countryCode => {
  PRICING_BY_COUNTRY[countryCode] = EUR_PRICING
})

// Default pricing (USD, full price)
export const DEFAULT_PRICING: PricingConfig = {
  currency: 'usd',
  pro_monthly: 999,
  pro_yearly: 9900,
  single: 599,
  addon: 399
}

/**
 * Get pricing configuration for a country
 */
export function getPricingForCountry(countryCode: string): PricingConfig {
  return PRICING_BY_COUNTRY[countryCode.toUpperCase()] || DEFAULT_PRICING
}

/**
 * Get price for a specific product type
 */
export function getProductPrice(
  countryCode: string,
  productType: 'pro_monthly' | 'pro_yearly' | 'single' | 'addon'
): { currency: string; amount: number } {
  const config = getPricingForCountry(countryCode)
  return {
    currency: config.currency,
    amount: config[productType]
  }
}

/**
 * Format price for display (e.g., "$9.99", "€10.00", "£9.00")
 */
export function formatPriceForDisplay(
  amount: number,
  currency: string
): string {
  const symbols: Record<string, string> = {
    'usd': '$',
    'eur': '€',
    'gbp': '£',
    'cad': 'CA$',
    'aud': 'A$'
  }

  const symbol = symbols[currency.toLowerCase()] || '$'
  const price = (amount / 100).toFixed(2)

  // EUR and GBP symbol goes before the number
  // CAD and AUD show currency code after
  if (currency.toLowerCase() === 'cad') {
    return `$${price} CAD`
  }
  if (currency.toLowerCase() === 'aud') {
    return `$${price} AUD`
  }

  return `${symbol}${price}`
}

/**
 * Get all prices for a country (for UI display)
 *
 * Tier 1 (EUR, GBP, CAD, AUD): Shows exact local price (what Stripe charges)
 * Tier 2-6 (USD): Converts to local currency for display (Stripe charges USD)
 */
export function getAllPricesForCountry(countryCode: string): {
  currency: string
  symbol: string
  pro_monthly: string
  pro_yearly: string
  single: string
  addon: string
  pro_monthly_raw: number
  pro_yearly_raw: number
  single_raw: number
  addon_raw: number
} {
  const config = getPricingForCountry(countryCode)
  const upperCountry = countryCode.toUpperCase()

  // For USD-tier countries with a different local currency, show local currency
  const localCurrency = COUNTRY_TO_LOCAL_CURRENCY[upperCountry]
  const showLocal = config.currency === 'usd'
    && localCurrency
    && localCurrency !== 'USD'
    && EXCHANGE_RATES[localCurrency] !== undefined

  if (showLocal) {
    // Convert USD cents to local currency display
    const formatLocal = (cents: number) => formatLocalCurrencyPrice(cents / 100, localCurrency)

    return {
      currency: localCurrency,
      symbol: '',
      pro_monthly: formatLocal(config.pro_monthly),
      pro_yearly: formatLocal(config.pro_yearly),
      single: formatLocal(config.single),
      addon: formatLocal(config.addon),
      pro_monthly_raw: config.pro_monthly,
      pro_yearly_raw: config.pro_yearly,
      single_raw: config.single,
      addon_raw: config.addon
    }
  }

  // Tier 1 or USD countries (US, EC, PA): show exact price in charging currency
  const symbols: Record<string, string> = {
    'usd': '$',
    'eur': '€',
    'gbp': '£',
    'cad': '$',
    'aud': '$'
  }

  const suffix = config.currency === 'cad' ? ' CAD' : config.currency === 'aud' ? ' AUD' : ''
  const symbol = symbols[config.currency] || '$'

  const format = (cents: number) => {
    const price = (cents / 100).toFixed(2)
    // Remove .00 for round numbers
    const clean = price.endsWith('.00') ? price.slice(0, -3) : price
    return `${symbol}${clean}${suffix}`
  }

  return {
    currency: config.currency.toUpperCase(),
    symbol,
    pro_monthly: format(config.pro_monthly),
    pro_yearly: format(config.pro_yearly),
    single: format(config.single),
    addon: format(config.addon),
    pro_monthly_raw: config.pro_monthly,
    pro_yearly_raw: config.pro_yearly,
    single_raw: config.single,
    addon_raw: config.addon
  }
}
