const API_BASE = process.env.NEXT_PUBLIC_API_URL

export async function analyzeFile(file: File, options: any) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('lang', options.lang)
  formData.append('mode', options.mode)
  formData.append('strict', String(options.strict))

  const res = await fetch(`${API_BASE}/api/analyze/mix`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`API error ${res.status}`)
  }

  return res.json()
}
