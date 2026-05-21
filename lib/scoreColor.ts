export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'var(--mr-text-primary)'
  if (score >= 85) return 'var(--mr-green)'
  if (score >= 60) return 'var(--mr-amber)'
  return 'var(--mr-red)'
}

export function getScoreHex(score: number): string {
  if (score >= 85) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function getScoreBg(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'var(--mr-bg-elevated)'
  if (score >= 85) return 'var(--mr-green-bg)'
  if (score >= 60) return 'var(--mr-amber-bg)'
  return 'var(--mr-red-bg)'
}

export function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'ready': return 'var(--mr-green)'
    case 'almost_ready': return 'var(--mr-blue)'
    case 'needs_work': return 'var(--mr-amber)'
    case 'critical': return 'var(--mr-red)'
    default: return 'var(--mr-text-secondary)'
  }
}

export type VerdictEnum = 'ready' | 'almost_ready' | 'needs_work' | 'critical'

export function scoreToVerdictEnum(score: number): VerdictEnum {
  if (score >= 85) return 'ready'
  if (score >= 60) return 'almost_ready'
  if (score >= 40) return 'needs_work'
  return 'critical'
}

export function scoreToVerdictLabel(score: number, lang: 'es' | 'en'): string {
  if (lang === 'es') {
    if (score >= 95) return '✅ Margen óptimo para mastering'
    if (score >= 85) return '✅ Lista para mastering'
    if (score >= 75) return '⚠️ Margen suficiente (revisar sugerencias)'
    if (score >= 60) return '⚠️ Margen reducido - revisar antes de mastering'
    if (score >= 40) return '⚠️ Margen limitado - ajustes recomendados'
    if (score >= 20) return '❌ Margen comprometido para mastering'
    if (score >= 5) return '❌ Requiere revisión'
    return '❌ Sin margen para procesamiento adicional'
  }
  if (score >= 95) return '✅ Optimal margin for mastering'
  if (score >= 85) return '✅ Ready for mastering'
  if (score >= 75) return '⚠️ Sufficient margin (review suggestions)'
  if (score >= 60) return '⚠️ Reduced margin - review before mastering'
  if (score >= 40) return '⚠️ Limited margin - adjustments recommended'
  if (score >= 20) return '❌ Compromised margin for mastering'
  if (score >= 5) return '❌ Requires review'
  return '❌ No margin for additional processing'
}
