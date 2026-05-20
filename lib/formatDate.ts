export function formatDate(dateString: string, lang: 'es' | 'en'): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
