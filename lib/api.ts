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

  // ============================================================
  // CRITICAL: Add original metadata if provided
  // Backend expects 'original_metadata_json' parameter name
  // ============================================================
  if (options.originalMetadata) {
    formData.append('original_metadata_json', JSON.stringify(options.originalMetadata))
    console.log('📊 Sending original metadata:', options.originalMetadata)
  } else {
    console.warn('⚠️ No original metadata provided - will use compressed file metadata')
  }
  // ============================================================

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
