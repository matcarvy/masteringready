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

/**
 * Which rubric an analysis was scored against. Analyses written before v7.5.0
 * carry no profile; they were all scored as mixes, so 'mix' is the fallback.
 */
export type AnalysisProfile = 'mix' | 'mix_strict' | 'master'

export function isMasterProfile(profile?: string | null): boolean {
  return profile === 'master'
}

/**
 * Mirrors verdict_for_score() in analyzer.py. The bands are the same in every
 * profile; the question they answer is not. A mix is asked whether it still has
 * margin to be mastered. A master is asked whether it is ready to release.
 */
export function scoreToVerdictLabel(
  score: number,
  lang: 'es' | 'en',
  profile?: string | null
): string {
  if (isMasterProfile(profile)) {
    if (lang === 'es') {
      if (score >= 95) return '✅ Máster listo para publicar'
      if (score >= 85) return '✅ Máster sólido'
      if (score >= 75) return '⚠️ Publicable, con detalles por revisar'
      if (score >= 60) return '⚠️ Máster con puntos que conviene revisar'
      if (score >= 40) return '⚠️ Máster con defectos claros'
      if (score >= 20) return '❌ Máster comprometido'
      return '❌ Requiere revisión antes de publicar'
    }
    if (score >= 95) return '✅ Master ready to release'
    if (score >= 85) return '✅ Solid master'
    if (score >= 75) return '⚠️ Releasable, with details to review'
    if (score >= 60) return '⚠️ Master has points worth reviewing'
    if (score >= 40) return '⚠️ Master has clear defects'
    if (score >= 20) return '❌ Compromised master'
    return '❌ Requires review before release'
  }

  if (lang === 'es') {
    if (score >= 95) return '✅ Margen óptimo para mastering'
    if (score >= 85) return '✅ Lista para mastering'
    if (score >= 75) return '⚠️ Margen suficiente (revisar sugerencias)'
    if (score >= 60) return '⚠️ Margen reducido, conviene revisar antes de mastering'
    if (score >= 40) return '⚠️ Margen limitado, se recomiendan ajustes'
    if (score >= 20) return '❌ Margen comprometido para mastering'
    if (score >= 5) return '❌ Requiere revisión antes de mastering'
    return '❌ Sin margen para procesamiento adicional'
  }
  if (score >= 95) return '✅ Optimal margin for mastering'
  if (score >= 85) return '✅ Ready for mastering'
  if (score >= 75) return '⚠️ Sufficient margin (review suggestions)'
  if (score >= 60) return '⚠️ Reduced margin, worth reviewing before mastering'
  if (score >= 40) return '⚠️ Limited margin, adjustments recommended'
  if (score >= 20) return '❌ Compromised margin for mastering'
  if (score >= 5) return '❌ Requires review before mastering'
  return '❌ No margin for additional processing'
}
