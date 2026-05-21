export function formatDate(dateString: string, lang: 'es' | 'en', esLocale: string = 'es-ES'): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(lang === 'es' ? esLocale : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
