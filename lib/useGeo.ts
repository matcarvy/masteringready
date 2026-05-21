/**
 * React hook for GeoIP country detection
 *
 * Usage:
 * const { geo, loading, error, refresh } = useGeo()
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { detectCountry, clearGeoCache, GeoData, DEFAULT_GEO } from './geoip'

interface UseGeoResult {
  geo: GeoData
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useGeo(): UseGeoResult {
  // Always start from DEFAULT_GEO so server and client first render match.
  // The effect below resolves the real country (and reads the localStorage cache).
  const [geo, setGeo] = useState<GeoData>(DEFAULT_GEO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchGeo = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const data = await detectCountry(forceRefresh)
      setGeo(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to detect country'))
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
