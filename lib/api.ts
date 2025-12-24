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

  const res = await fetch(`${API_URL}/api/analyze/mix`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }

  return res.json()
}
