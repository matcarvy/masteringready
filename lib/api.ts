const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined')
}

export async function analyzeFile(
  file: File,
  options: {
    lang: 'es' | 'en'
    mode: 'short' | 'write'
    strict: boolean
  }
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('lang', options.lang)
  formData.append('mode', options.mode)
  formData.append('strict', String(options.strict))

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
