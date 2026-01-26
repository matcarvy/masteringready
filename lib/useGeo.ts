/**
 * React hook for GeoIP country detection
 *
 * Usage:
 * const { geo, loading, error, refresh } = useGeo()
 *
 * // Access pricing info
 * const proPrice = calculateLocalPrice(PRICING.PRO_MONTHLY, geo)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { detectCountry, getCurrentGeo, clearGeoCache, GeoData } from './geoip'

interface UseGeoResult {
  geo: GeoData
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useGeo(): UseGeoResult {
  const [geo, setGeo] = useState<GeoData>(getCurrentGeo())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchGeo = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const data = await detectCountry(forceRefresh)
      setGeo(data)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to detect country'))
      // Keep using current/default geo on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGeo()
  }, [fetchGeo])

  const refresh = useCallback(async () => {
    clearGeoCache()
    await fetchGeo(true)
  }, [fetchGeo])

  return { geo, loading, error, refresh }
}

export default useGeo
