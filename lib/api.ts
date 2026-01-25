const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined')
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
      throw new Error(`API error ${res.status}: ${text}`)
    }

    return res.json()
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    // Better error messages for users
    if (error.name === 'AbortError') {
      throw new Error('Analysis timeout - file may be too large or complex. Try compressing the file first.')
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

  const res = await fetch(`${API_URL}/api/analyze/start`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }

  return res.json()
}

// NEW: Get analysis status (for polling)
export async function getAnalysisStatus(jobId: string) {
  const res = await fetch(`${API_URL}/api/analyze/status/${jobId}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }

  return res.json()
}

// ============================================================================
// IP RATE LIMITING
// ============================================================================

export interface IpCheckResult {
  can_analyze: boolean
  reason: 'OK' | 'LIMIT_REACHED' | 'VPN_DETECTED' | 'DISABLED' | 'AUTHENTICATED'
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
      // If endpoint not available, allow analysis (feature not deployed yet)
      console.warn('IP check endpoint not available, allowing analysis')
      return {
        can_analyze: true,
        reason: 'DISABLED',
        analyses_used: 0,
        max_analyses: 1,
        is_vpn: false,
        ip_limit_enabled: false
      }
    }

    return res.json()
  } catch (error) {
    // Network error or endpoint not available - allow analysis
    console.warn('IP check failed, allowing analysis:', error)
    return {
      can_analyze: true,
      reason: 'DISABLED',
      analyses_used: 0,
      max_analyses: 1,
      is_vpn: false,
      ip_limit_enabled: false
    }
  }
}
