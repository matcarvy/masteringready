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

// ORIGINAL: Direct analysis (kept for backward compatibility)
export async function analyzeFile(
  file: File,
  options: {
    lang: 'es' | 'en'
    mode: 'short' | 'write'
    strict: boolean
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
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error instanceof AnalysisApiError) throw error

    if (error.name === 'AbortError') {
      throw new AnalysisApiError('timeout', 'timeout')
    }
    // Network failure (offline, DNS, etc.)
    if (error instanceof TypeError || error.message?.includes('fetch')) {
      throw new AnalysisApiError('Network error', 'offline')
    }
    throw error
  }
}

// NEW: Polling-based analysis for Render Starter
export async function startAnalysisPolling(
  file: File,
  options: {
    lang: 'es' | 'en'
    mode: 'short' | 'write'
    strict: boolean
    originalMetadata?: {
      sampleRate: number
      bitDepth: number
      numberOfChannels: number
      duration: number
      fileSize: number
    }
    isAuthenticated?: boolean  // NEW: Whether user is logged in
  }
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('lang', options.lang)
  formData.append('mode', options.mode)
  formData.append('strict', String(options.strict))
  formData.append('is_authenticated', String(options.isAuthenticated || false))

  // CRITICAL: Add original metadata if provided
  // Backend expects 'original_metadata_json' parameter name
  if (options.originalMetadata) {
    formData.append('original_metadata_json', JSON.stringify(options.originalMetadata))
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}/api/analyze/start`, {
      method: 'POST',
      body: formData,
    })
  } catch (fetchError: any) {
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

// NEW: Get analysis status (for polling)
export async function getAnalysisStatus(jobId: string, lang: 'es' | 'en' = 'es') {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/analyze/status/${jobId}?lang=${lang}`, {
      method: 'GET',
    })
  } catch (fetchError: any) {
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

// ============================================================================
// IP RATE LIMITING
// ============================================================================

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
      // If endpoint not available, deny analysis (fail-closed)
      console.warn('IP check endpoint not available, denying analysis')
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
  } catch (error) {
    // Network error or endpoint not available - deny analysis (fail-closed)
    console.warn('IP check failed, denying analysis:', error)
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
