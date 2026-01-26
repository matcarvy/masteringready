/**
 * GeoIP Country Detection for Regional Pricing
 *
 * Uses multiple methods to detect user's country:
 * 1. ipinfo.io API (with optional token for better accuracy)
 * 2. Cloudflare headers (if behind Cloudflare CDN)
 * 3. Fallback to 'US' for benchmark pricing
 *
 * Results are cached in localStorage for 24 hours.
 */

import { supabase } from './supabase'

// Cache key and duration
const CACHE_KEY = 'mr_geo_country'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface GeoData {
  countryCode: string
  currency: string
  multiplier: number
  tier: number
  paymentProvider: string
  detectedAt: number
}

interface IpInfoResponse {
  ip: string
  city?: string
  region?: string
  country: string
  loc?: string
  org?: string
  postal?: string
  timezone?: string
}

// Default fallback (US benchmark)
const DEFAULT_GEO: GeoData = {
  countryCode: 'US',
  currency: 'USD',
  multiplier: 1.0,
  tier: 1,
  paymentProvider: 'stripe',
  detectedAt: Date.now()
}

/**
 * Get cached geo data from localStorage
 */
function getCachedGeo(): GeoData | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: GeoData = JSON.parse(cached)

    // Check if cache is still valid
    if (Date.now() - data.detectedAt < CACHE_DURATION_MS) {
      return data
    }

    // Cache expired
    localStorage.removeItem(CACHE_KEY)
    return null
  } catch {
    return null
  }
}

/**
 * Save geo data to localStorage cache
 */
function setCachedGeo(data: GeoData): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch country code from ipinfo.io
 */
async function fetchFromIpInfo(): Promise<string | null> {
  try {
    // Note: Token is optional, free tier works without it (50k/month)
    const response = await fetch('https://ipinfo.io/json', {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) return null

    const data: IpInfoResponse = await response.json()
    return data.country || null
  } catch {
    return null
  }
}

/**
 * Get regional pricing data from Supabase
 */
async function getRegionalPricing(countryCode: string): Promise<Omit<GeoData, 'countryCode' | 'detectedAt'> | null> {
  try {
    const { data, error } = await supabase
      .from('regional_pricing')
      .select('currency, multiplier, tier, payment_provider')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // Try default fallback
      const { data: defaultData } = await supabase
        .from('regional_pricing')
        .select('currency, multiplier, tier, payment_provider')
        .eq('country_code', 'US')
        .single()

      if (defaultData) {
        return {
          currency: defaultData.currency,
          multiplier: defaultData.multiplier,
          tier: defaultData.tier,
          paymentProvider: defaultData.payment_provider
        }
      }

      return null
    }

    return {
      currency: data.currency,
      multiplier: data.multiplier,
      tier: data.tier,
      paymentProvider: data.payment_provider
    }
  } catch {
    return null
  }
}

/**
 * Detect user's country and get pricing data
 *
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns GeoData with country, currency, multiplier, etc.
 */
export async function detectCountry(forceRefresh = false): Promise<GeoData> {
  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = getCachedGeo()
    if (cached) return cached
  }

  // Try to detect country
  let countryCode: string | null = null

  // Method 1: ipinfo.io
  countryCode = await fetchFromIpInfo()

  // Fallback to US if detection fails
  if (!countryCode) {
    countryCode = 'US'
  }

  // Get pricing data for this country
  const pricing = await getRegionalPricing(countryCode)

  const geoData: GeoData = {
    countryCode,
    currency: pricing?.currency || 'USD',
    multiplier: pricing?.multiplier || 1.0,
    tier: pricing?.tier || 1,
    paymentProvider: pricing?.paymentProvider || 'stripe',
    detectedAt: Date.now()
  }

  // Cache the result
  setCachedGeo(geoData)

  return geoData
}

/**
 * Get the current geo data (from cache or default)
 * Does not make network requests - use detectCountry() for fresh data
 */
export function getCurrentGeo(): GeoData {
  const cached = getCachedGeo()
  return cached || DEFAULT_GEO
}

/**
 * Clear geo cache (useful for testing or when user requests different region)
 */
export function clearGeoCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Calculate localized price based on geo data
 *
 * @param baseUsdPrice - Price in USD (benchmark)
 * @param geo - GeoData from detectCountry()
 * @returns Localized price (still in USD for Stripe, but adjusted)
 */
export function calculateLocalPrice(baseUsdPrice: number, geo: GeoData): number {
  const localPrice = baseUsdPrice * geo.multiplier
  // Round to 2 decimal places
  return Math.round(localPrice * 100) / 100
}

/**
 * Format price for display
 *
 * @param price - Price amount
 * @param currency - Currency code (USD, EUR, etc.)
 * @param locale - Locale for formatting (optional, defaults based on currency)
 */
export function formatPrice(price: number, currency: string, locale?: string): string {
  // Map currency to typical locale if not provided
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'MXN': 'es-MX',
    'COP': 'es-CO',
    'BRL': 'pt-BR',
    'ARS': 'es-AR',
    'CLP': 'es-CL',
    'PEN': 'es-PE'
  }

  const displayLocale = locale || localeMap[currency] || 'en-US'

  try {
    return new Intl.NumberFormat(displayLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'COP' || currency === 'CLP' || currency === 'PYG' ? 0 : 2,
      maximumFractionDigits: currency === 'COP' || currency === 'CLP' || currency === 'PYG' ? 0 : 2
    }).format(price)
  } catch {
    // Fallback to simple format
    return `${currency} ${price.toFixed(2)}`
  }
}

/**
 * Get display price for a plan based on user's location
 *
 * @param baseUsdPrice - Base price in USD
 * @param geo - GeoData from detectCountry()
 * @returns Object with price amount and formatted strings
 */
export function getPlanDisplayPrice(baseUsdPrice: number, geo: GeoData): {
  amount: number
  formatted: string
  formattedLocal: string
  currency: string
  localCurrency: string
  showLocal: boolean
} {
  const adjustedUsdPrice = calculateLocalPrice(baseUsdPrice, geo)
  const localCurrency = geo.currency || 'USD'
  const showLocal = localCurrency !== 'USD' && EXCHANGE_RATES[localCurrency] !== undefined

  return {
    amount: adjustedUsdPrice,
    formatted: formatPrice(adjustedUsdPrice, 'USD'),
    formattedLocal: showLocal ? formatLocalCurrencyPrice(adjustedUsdPrice, localCurrency) : formatPrice(adjustedUsdPrice, 'USD'),
    currency: 'USD',
    localCurrency: localCurrency,
    showLocal: showLocal
  }
}

// Pricing constants from spec (USD benchmarks)
export const PRICING = {
  FREE: 0,
  SINGLE: 5.99,
  PRO_MONTHLY: 9.99,
  ADDON_PACK: 3.99
} as const

// ============================================================================
// EXCHANGE RATES (Static - Updated Monthly)
// ============================================================================
// Last updated: January 2025
// These are approximate rates for display purposes only
// Actual charge is always in USD via Stripe

export const EXCHANGE_RATES: Record<string, number> = {
  // North America
  'USD': 1,
  'CAD': 1.35,
  'MXN': 17.50,

  // Europe
  'EUR': 0.92,
  'GBP': 0.79,

  // South America
  'COP': 4200,    // Colombian Peso
  'BRL': 5.00,    // Brazilian Real
  'ARS': 850,     // Argentine Peso (volatile)
  'CLP': 900,     // Chilean Peso
  'PEN': 3.80,    // Peruvian Sol
  'UYU': 40,      // Uruguayan Peso
  'PYG': 7500,    // Paraguayan Guarani
  'BOB': 6.90,    // Bolivian Boliviano
  'VES': 36,      // Venezuelan Bolivar

  // Central America
  'GTQ': 7.80,    // Guatemalan Quetzal
  'HNL': 25,      // Honduran Lempira
  'NIO': 36.70,   // Nicaraguan Cordoba
  'CRC': 530,     // Costa Rican Colon
  'PAB': 1,       // Panamanian Balboa (pegged to USD)
  'DOP': 58,      // Dominican Peso
}

// Currency symbols for display
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'CAD': 'CA$',
  'MXN': 'MX$',
  'EUR': '€',
  'GBP': '£',
  'COP': '$',
  'BRL': 'R$',
  'ARS': '$',
  'CLP': '$',
  'PEN': 'S/',
  'UYU': '$',
  'PYG': '₲',
  'BOB': 'Bs',
  'VES': 'Bs',
  'GTQ': 'Q',
  'HNL': 'L',
  'NIO': 'C$',
  'CRC': '₡',
  'PAB': 'B/.',
  'DOP': 'RD$',
}

/**
 * Convert USD price to local currency
 *
 * @param usdPrice - Price in USD
 * @param currency - Target currency code
 * @returns Price in local currency
 */
export function convertToLocalCurrency(usdPrice: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1
  return usdPrice * rate
}

/**
 * Format price in local currency for display
 *
 * @param usdPrice - Price in USD (after PPP adjustment)
 * @param currency - Local currency code
 * @returns Formatted string with local currency
 */
export function formatLocalCurrencyPrice(usdPrice: number, currency: string): string {
  const localPrice = convertToLocalCurrency(usdPrice, currency)

  // Currencies that don't use decimals
  const noDecimalCurrencies = ['COP', 'CLP', 'PYG', 'VES', 'HNL', 'NIO', 'CRC']
  const decimals = noDecimalCurrencies.includes(currency) ? 0 : 2

  // Round appropriately
  let displayPrice: number
  if (decimals === 0) {
    // Round to nearest 100 for large currencies like COP
    if (currency === 'COP' || currency === 'PYG') {
      displayPrice = Math.round(localPrice / 100) * 100
    } else if (currency === 'CLP' || currency === 'CRC') {
      displayPrice = Math.round(localPrice / 10) * 10
    } else {
      displayPrice = Math.round(localPrice)
    }
  } else {
    displayPrice = Math.round(localPrice * 100) / 100
  }

  // Format with locale
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'MXN': 'es-MX',
    'COP': 'es-CO',
    'BRL': 'pt-BR',
    'ARS': 'es-AR',
    'CLP': 'es-CL',
    'PEN': 'es-PE',
    'UYU': 'es-UY',
    'PYG': 'es-PY',
  }

  const locale = localeMap[currency] || 'en-US'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(displayPrice)
  } catch {
    // Fallback
    const symbol = CURRENCY_SYMBOLS[currency] || '$'
    return `${symbol}${displayPrice.toLocaleString()}`
  }
}
