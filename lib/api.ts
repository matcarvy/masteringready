const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined')
}

// Custom error class that carries a pre-classified category
export class AnalysisApiError extends Error {
  category: string
  statusCode?: number

  constructor(message: string, category: string, statusCode?: number) {
    super(message)
    this.name = 'AnalysisApiError'
    this.category = category
    this.statusCode = statusCode
  }
}

/**
 * Fetch a short-lived signed token from /api/analyze-token before calling
 * the analysis backend.
 *
 * Returns null ONLY when the endpoint explicitly reports the token system is
 * disabled (200 with token:null, i.e. ANALYZE_TOKEN_SECRET unset) — in that
 * case the backend skips validation and a tokenless request is legitimate.
 *
 * A 403 means the server-side quota gate refused: throws a 'quota_exceeded'
 * error so the caller surfaces the limit modal instead of proceeding tokenless
 * and hitting an opaque backend 401. Transient failures (5xx, network, timeout)
 * are retried; if they persist it throws 'token_unavailable' rather than
 * proceeding tokenless, because in production the backend would reject a missing
 * token with a misleading 401.
 */
async function fetchAnalyzeToken(accessToken?: string): Promise<string | null> {
  const maxAttempts = 3
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)
      const res = await fetch('/api/analyze-token', {
        method: 'POST',
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.status === 403) {
        throw new AnalysisApiError('quota_exceeded', 'quota_exceeded', 403)
      }
      if (!res.ok) {
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 400 * attempt))
          continue
        }
        break
      }
      const data = await res.json()
      return data.token ?? null
    } catch (err) {
      if (err instanceof AnalysisApiError) throw err
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 400 * attempt))
        continue
      }
    }
  }

  throw new AnalysisApiError('token_unavailable', 'token_unavailable')
}

// ORIGINAL: Direct analysis (kept for backward compatibility)
export async function analyzeFile(
  file: File,
  options: {
    lang: 'es' | 'en'
    mode: 'short' | 'write'
    strict: boolean
    accessToken?: string  // Supabase session token, exchanged for a signed analyze token
    originalMetadata?: {  // NEW: Optional original metadata
      sampleRate: number
      bitDepth: number
      numberOfChannels: number
      duration: number
      fileSize: number
    }
  }
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('lang', options.lang)
  formData.append('mode', options.mode)
  formData.append('strict', String(options.strict))

  const signedToken = await fetchAnalyzeToken(options.accessToken)
  if (signedToken) {
    formData.append('signed_token', signedToken)
  }

  // NEW: Add original metadata if provided
  if (options.originalMetadata) {
    formData.append('original_metadata_json', JSON.stringify(options.originalMetadata))
  }

  // Create AbortController with 3-minute timeout for large files
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes

  try {
    const res = await fetch(`${API_URL}/api/analyze/mix`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text()
      throw new AnalysisApiError(
        text,
        res.status >= 500 ? 'server_error' : '',
        res.status
      )
    }

    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof AnalysisApiError) throw err

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AnalysisApiError('timeout', 'timeout')
    }
    if (err instanceof TypeError || (err instanceof Error && err.message?.includes('fetch'))) {
      throw new AnalysisApiError('Network error', 'offline')
    }
    throw err
  }
}

// NEW: Polling-based analysis for Render Starter
export async function startAnalysisPolling(
  file: File,
  options: {
    lang: 'es' | 'en'
    mode: 'short' | 'write'
    strict: boolean
    genre?: string | null
    originalMetadata?: {
      sampleRate: number
      bitDepth: number
      numberOfChannels: number
      duration: number
      fileSize: number
    }
    isAuthenticated?: boolean  // NEW: Whether user is logged in
    accessToken?: string  // Supabase session token, exchanged for a signed analyze token
  }
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('lang', options.lang)
  formData.append('mode', options.mode)
  formData.append('strict', String(options.strict))
  if (options.genre) {
    formData.append('genre', options.genre)
  }
  formData.append('is_authenticated', String(options.isAuthenticated || false))

  const signedToken = await fetchAnalyzeToken(options.accessToken)
  if (signedToken) {
    formData.append('signed_token', signedToken)
  }

  // CRITICAL: Add original metadata if provided
  // Backend expects 'original_metadata_json' parameter name
  if (options.originalMetadata) {
    formData.append('original_metadata_json', JSON.stringify(options.originalMetadata))
  }

  // 2-minute timeout on upload; prevents indefinite hang on slow connections
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)

  let res: Response
  try {
    res = await fetch(`${API_URL}/api/analyze/start`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AnalysisApiError('Upload timeout', 'timeout')
    }
    throw new AnalysisApiError('Network error', 'offline')
  }

  clearTimeout(timeoutId)

  if (!res.ok) {
    const text = await res.text()
    throw new AnalysisApiError(
      text,
      res.status >= 500 ? 'server_error' : '',
      res.status
    )
  }

  return res.json()
}

// NEW: Get analysis status (for polling)
export async function getAnalysisStatus(jobId: string, lang: 'es' | 'en' = 'es') {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/analyze/status/${jobId}?lang=${lang}`, {
      method: 'GET',
    })
  } catch {
    throw new AnalysisApiError('Network error', 'offline')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new AnalysisApiError(
      text,
      res.status >= 500 ? 'server_error' : '',
      res.status
    )
  }

  return res.json()
}

// --- IP Rate Limiting ---

export interface IpCheckResult {
  can_analyze: boolean
  reason: 'OK' | 'LIMIT_REACHED' | 'VPN_DETECTED' | 'DISABLED' | 'AUTHENTICATED' | 'IP_CHECK_UNAVAILABLE'
  analyses_used: number
  max_analyses: number
  is_vpn: boolean
  vpn_service?: string
  ip_limit_enabled: boolean
}

/**
 * Check if the current IP can perform an analysis.
 * Should be called BEFORE starting analysis for anonymous users.
 *
 * @param isAuthenticated - Whether the user is logged in
 * @returns IpCheckResult with can_analyze and reason
 */
export async function checkIpLimit(isAuthenticated: boolean = false): Promise<IpCheckResult> {
  try {
    const res = await fetch(`${API_URL}/api/check-ip?is_authenticated=${isAuthenticated}`, {
      method: 'GET',
    })

    if (!res.ok) {
      return {
        can_analyze: false,
        reason: 'IP_CHECK_UNAVAILABLE',
        analyses_used: 0,
        max_analyses: 2,
        is_vpn: false,
        ip_limit_enabled: false
      }
    }

    return res.json()
  } catch {
    return {
      can_analyze: false,
      reason: 'IP_CHECK_UNAVAILABLE',
      analyses_used: 0,
      max_analyses: 2,
      is_vpn: false,
      ip_limit_enabled: false
    }
  }
}
