'use client'

import { useRef, useState, useCallback } from 'react'
import html2canvas from 'html2canvas'

// ============================================================================
// ScoreCard — Generates branded PNG score cards for sharing
// Two formats: 1080x1080 (feed) and 1080x1920 (story)
// Uses html2canvas to render a hidden div as a PNG image
// ============================================================================

interface MetricBar {
  percentage: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  tooltip_es?: string
  tooltip_en?: string
}

interface ScoreCardProps {
  score: number
  verdict: string
  filename: string
  metricsBars: Record<string, MetricBar> | null
  genre: string | null
  lang: 'es' | 'en'
}

// Score color logic — matches app getScoreColor thresholds
function getScoreHex(score: number): string {
  if (score >= 85) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

// Bar solid color by status — html2canvas renders gradients unreliably
// (Bug 2: gradients cause color bleed artifacts, e.g., red at start of green bar)
function getBarColor(status: string): string {
  switch (status) {
    case 'excellent': return '#10b981'
    case 'good': return '#3b82f6'
    case 'warning': return '#f59e0b'
    case 'critical': return '#ef4444'
    default: return '#6b7280'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'excellent': return '#10b981'
    case 'good': return '#3b82f6'
    case 'warning': return '#f59e0b'
    case 'critical': return '#ef4444'
    default: return '#6b7280'
  }
}

// Strip file extension from filename
function stripExtension(filename: string): string {
  return filename.replace(/\.(wav|mp3|aiff|aif|flac|aac|m4a|ogg)$/i, '')
}

// Replace spaces with non-breaking spaces — html2canvas collapses regular spaces
function nbsp(s: string): string {
  return s.replace(/ /g, '\u00A0')
}

// Score-based bilingual verdict for PNG cards (always matches current lang)
function getCardVerdict(score: number, lang: 'es' | 'en'): string {
  if (lang === 'es') {
    if (score >= 95) return '✅ Margen óptimo para mastering'
    if (score >= 85) return '✅ Lista para mastering'
    if (score >= 75) return '⚠️ Margen suficiente'
    if (score >= 60) return '⚠️ Margen reducido'
    if (score >= 40) return '⚠️ Margen limitado'
    if (score >= 20) return '⚠️ Margen comprometido'
    return '❌ Requiere revisión'
  }
  if (score >= 95) return '✅ Optimal margin for mastering'
  if (score >= 85) return '✅ Ready for mastering'
  if (score >= 75) return '⚠️ Sufficient margin'
  if (score >= 60) return '⚠️ Reduced margin'
  if (score >= 40) return '⚠️ Limited margin'
  if (score >= 20) return '⚠️ Compromised margin'
  return '❌ Requires review'
}

// Genre display labels (bilingual)
const genreLabels: Record<string, { es: string; en: string }> = {
  'Pop/Balada': { es: 'Pop / Balada', en: 'Pop / Ballad' },
  'Rock': { es: 'Rock', en: 'Rock' },
  'Hip-Hop/Trap': { es: 'Hip-Hop / Trap', en: 'Hip-Hop / Trap' },
  'EDM/Electrónica': { es: 'EDM / Electrónica', en: 'EDM / Electronic' },
  'R&B/Soul': { es: 'R&B / Soul', en: 'R&B / Soul' },
  'Latin/Reggaeton': { es: 'Latino / Reggaeton', en: 'Latin / Reggaeton' },
  'Metal': { es: 'Metal', en: 'Metal' },
  'Jazz/Acústico': { es: 'Jazz / Acústica', en: 'Jazz / Acoustic' },
  'Clásica': { es: 'Clásica', en: 'Classical' },
  'Country': { es: 'Country', en: 'Country' },
}

// Metric display labels (bilingual) — same order as the app bars
const metricLabels: Record<string, { es: string; en: string }> = {
  headroom: { es: 'Headroom', en: 'Headroom' },
  true_peak: { es: 'True Peak', en: 'True Peak' },
  plr: { es: 'PLR', en: 'PLR' },
  dynamic_range: { es: 'Rango Dinámico', en: 'Dynamic Range' },
  stereo_width: { es: 'Imagen Estéreo', en: 'Stereo Image' },
  stereo_correlation: { es: 'Correlación', en: 'Correlation' },
  frequency_balance: { es: 'Freq. Balance', en: 'Freq. Balance' },
  tonal_balance: { es: 'Freq. Balance', en: 'Freq. Balance' },
}

// Ordered keys for consistent bar display
const orderedKeys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance']

// Metric keys that represent the same thing — only show one
const dedupeMap: Record<string, string> = {
  tonal_balance: 'frequency_balance',
}

// SVG ring circumference (r=88, C=2*PI*88)
const CIRCUMFERENCE = 2 * Math.PI * 88

export default function ScoreCard({ score, verdict, filename, metricsBars, genre, lang }: ScoreCardProps) {
  const feedRef = useRef<HTMLDivElement>(null)
  const storyRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState<'feed' | 'story' | null>(null)

  const displayedMetrics = (() => {
    if (!metricsBars) return []
    const seen = new Set<string>()
    return orderedKeys
      .filter(key => {
        if (!metricsBars[key]) return false
        const canonical = dedupeMap[key] || key
        if (seen.has(canonical)) return false
        seen.add(canonical)
        return true
      })
      .map(key => ({
        key,
        label: metricLabels[key] || { es: key, en: key },
        bar: metricsBars[key],
      }))
  })()

  const scoreColor = getScoreHex(score)
  const dashOffset = CIRCUMFERENCE * (1 - score / 100)
  const trackName = stripExtension(filename)
  // Derive verdict from score + lang (always matches current language, not API response language)
  const verdictText = getCardVerdict(score, lang)
  const genreDisplay = genre && genreLabels[genre]
    ? (lang === 'es' ? genreLabels[genre].es : genreLabels[genre].en)
    : genre || null
  const dateStr = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const handleDownload = useCallback(async (format: 'feed' | 'story') => {
    const ref = format === 'feed' ? feedRef : storyRef
    if (!ref.current) return

    setGenerating(format)
    try {
      // Make the hidden card visible for capture
      const el = ref.current
      el.style.position = 'fixed'
      el.style.left = '-99999px'
      el.style.top = '0'
      el.style.display = 'flex'
      el.style.opacity = '1'
      el.style.pointerEvents = 'none'

      // Wait for fonts + images to settle
      await new Promise(r => setTimeout(r, 100))

      const canvas = await html2canvas(el, {
        width: format === 'feed' ? 1080 : 1080,
        height: format === 'feed' ? 1080 : 1920,
        scale: 2,
        backgroundColor: '#0D0D14',
        useCORS: true,
        logging: false,
      })

      // Hide it again
      el.style.display = 'none'
      el.style.position = ''
      el.style.left = ''
      el.style.top = ''

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `masteringready-${format === 'feed' ? 'feed' : 'story'}-${trackName || 'score'}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Score card generation failed:', err)
    } finally {
      setGenerating(null)
    }
  }, [trackName])

  // ============================================================================
  // Shared card content renderer
  // ============================================================================
  const renderCardContent = (format: 'feed' | 'story') => {
    const isFeed = format === 'feed'
    // Sizing constants per format
    const padding = isFeed ? '56px 64px' : '48px 64px 36px'
    const ringSize = isFeed ? 200 : 240
    const scoreFont = isFeed
      ? (score >= 100 ? '60px' : '72px')
      : (score >= 100 ? '78px' : '96px')
    const denomFont = isFeed ? '24px' : '30px'
    const verdictFont = isFeed ? '18px' : '22px'
    const metricNameWidth = isFeed ? '120px' : '140px'
    const metricFont = isFeed ? '14px' : '16px'
    const barHeight = isFeed ? '10px' : '12px'
    const valueWidth = isFeed ? '44px' : '50px'
    const metricGap = isFeed ? '14px' : '16px'
    const trackFont = isFeed ? '16px' : '20px'
    const wordmarkFont = isFeed ? '18px' : '20px'
    const footerUrlFont = isFeed ? '16px' : '18px'
    const footerCtaFont = isFeed ? '12px' : '13px'
    const trackPadTop = isFeed ? '20px' : '14px'
    const verdictMargin = isFeed ? '12px' : '8px'

    const middleContent = (
      <>
        {/* Score Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Ring */}
          <div style={{
            position: 'relative',
            width: `${ringSize}px`,
            height: `${ringSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width={ringSize} height={ringSize} viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="#1E1E2A" strokeWidth={isFeed ? 10 : 12} />
              <circle cx="100" cy="100" r="88" fill="none" stroke={scoreColor} strokeWidth={isFeed ? 10 : 12}
                strokeLinecap="round" strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={dashOffset}
                transform="rotate(-90 100 100)" />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', alignItems: 'baseline', justifyContent: 'center', width: '100%', textAlign: 'center' as const }}>
              <span style={{ fontWeight: 900, fontSize: scoreFont, lineHeight: 1, letterSpacing: '-0.04em', color: scoreColor }}>{score}</span>
              <span style={{ fontWeight: 500, fontSize: denomFont, color: 'rgba(255,255,255,0.55)', marginLeft: isFeed ? '4px' : '6px', whiteSpace: 'pre' as const }}>/100</span>
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: verdictFont, textAlign: 'center' as const, color: '#a0a0b2', marginTop: verdictMargin, whiteSpace: 'pre' as const }}>
            {nbsp(verdictText)}
          </div>
        </div>

        {/* Metrics Bars */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: metricGap, marginTop: isFeed ? '0' : '28px' }}>
          {displayedMetrics.map(({ key, label, bar }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: metricNameWidth, fontSize: metricFont, fontWeight: 500, color: '#a0a0b2', textAlign: 'right' as const, flexShrink: 0, whiteSpace: 'pre' as const }}>
                {nbsp(lang === 'es' ? label.es : label.en)}
              </span>
              <div style={{ flex: 1, height: barHeight, background: '#1E1E2A', borderRadius: `${parseInt(barHeight) / 2}px`, overflow: 'hidden' }}>
                <div style={{ width: `${bar.percentage}%`, height: '100%', background: getBarColor(bar.status), borderRadius: `${parseInt(barHeight) / 2}px` }} />
              </div>
              <span style={{ width: valueWidth, fontSize: metricFont, fontWeight: 700, color: getStatusColor(bar.status), textAlign: 'left' as const, flexShrink: 0 }}>
                {bar.percentage}%
              </span>
            </div>
          ))}
        </div>

        {/* Track Info */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isFeed ? '8px' : '6px', borderTop: '1px solid #1E1E2A', paddingTop: trackPadTop, marginTop: isFeed ? '0' : '28px' }}>
          <span style={{ fontWeight: 600, fontSize: trackFont, color: '#f5f5f7', textAlign: 'center' as const, maxWidth: '90%', whiteSpace: 'pre-wrap' as const }}>
            {nbsp(trackName || (lang === 'es' ? 'Sin nombre' : 'Untitled'))}
          </span>
          {genreDisplay && (
            <span style={{ fontSize: isFeed ? '12px' : '14px', fontWeight: 500, color: '#a0a0b2', background: '#1E1E2A', padding: isFeed ? '4px 14px' : '6px 18px', borderRadius: '20px', letterSpacing: '0.02em', whiteSpace: 'pre' as const }}>
              {nbsp(genreDisplay)}
            </span>
          )}
          <span style={{ fontSize: '11px', color: '#6b6b7e', whiteSpace: 'pre' as const }}>
            {nbsp(dateStr)}
          </span>
        </div>
      </>
    )

    return (
      <div style={{
        width: '1080px',
        height: isFeed ? '1080px' : '1920px',
        background: '#0D0D14',
        borderRadius: '0px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#f5f5f7',
        // html2canvas collapses spaces — wordSpacing forces visible gaps between words
        wordSpacing: '0.25em',
      }}>
        {/* Top gradient line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }} />

        {/* Header */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontWeight: 700,
            fontSize: wordmarkFont,
            letterSpacing: '-0.02em',
            color: '#6b6b7e',
            whiteSpace: 'pre' as const,
          }}>
            {nbsp('Mastering Ready')}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: '#a0a0b2',
            background: '#1E1E2A',
            padding: '5px 12px',
            borderRadius: '6px',
            whiteSpace: 'pre' as const,
          }}>
            {nbsp(lang === 'es' ? 'Análisis de Mezcla' : 'Mix Analysis')}
          </span>
        </div>

        {/* Story: flex-1 wrapper centers content between header and footer */}
        {!isFeed ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {middleContent}
          </div>
        ) : (
          middleContent
        )}

        {/* Footer */}
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{
            fontWeight: 700,
            fontSize: footerUrlFont,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '8px 28px',
            borderRadius: '24px',
            letterSpacing: '-0.01em',
          }}>
            masteringready.com
          </span>
          <span style={{
            fontSize: footerCtaFont,
            color: '#6b6b7e',
            textAlign: 'center' as const,
            marginTop: '4px',
            whiteSpace: 'pre' as const,
          }}>
            {nbsp(lang === 'es' ? 'Analiza tu mezcla gratis' : 'Analyze your mix free')}
          </span>

          {/* Story-only: swipe hint */}
          {!isFeed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              color: '#6b6b7e',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.06em',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6b7e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <span style={{ whiteSpace: 'pre' as const }}>{nbsp(lang === 'es' ? 'Link en bio' : 'Link in bio')}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Download Buttons — visible in the UI */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        {/* Feed (1080x1080) button */}
        <button
          onClick={() => handleDownload('feed')}
          disabled={generating !== null}
          style={{
            flex: 1,
            minWidth: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'var(--mr-bg-card)',
            color: 'var(--mr-primary)',
            border: '2px solid var(--mr-primary)',
            borderRadius: '0.75rem',
            fontWeight: '600',
            fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
            cursor: generating ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            opacity: generating === 'story' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!generating) {
              e.currentTarget.style.background = 'var(--mr-bg-elevated)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--mr-bg-card)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {generating === 'feed' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              {lang === 'es' ? 'Generando...' : 'Generating...'}
            </span>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {lang === 'es' ? 'Feed (1080x1080)' : 'Feed (1080x1080)'}
            </>
          )}
        </button>

        {/* Story (1080x1920) button */}
        <button
          onClick={() => handleDownload('story')}
          disabled={generating !== null}
          style={{
            flex: 1,
            minWidth: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'var(--mr-bg-card)',
            color: 'var(--mr-primary)',
            border: '2px solid var(--mr-primary)',
            borderRadius: '0.75rem',
            fontWeight: '600',
            fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
            cursor: generating ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            opacity: generating === 'feed' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!generating) {
              e.currentTarget.style.background = 'var(--mr-bg-elevated)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--mr-bg-card)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {generating === 'story' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              {lang === 'es' ? 'Generando...' : 'Generating...'}
            </span>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="14" />
                <line x1="9" y1="11" x2="15" y2="11" />
              </svg>
              {lang === 'es' ? 'Story (1080x1920)' : 'Story (1080x1920)'}
            </>
          )}
        </button>
      </div>

      {/* Hidden card containers — rendered off-screen for html2canvas capture */}
      <div
        ref={feedRef}
        style={{ display: 'none', position: 'absolute', left: '-99999px', top: 0 }}
        aria-hidden="true"
      >
        {renderCardContent('feed')}
      </div>
      <div
        ref={storyRef}
        style={{ display: 'none', position: 'absolute', left: '-99999px', top: 0 }}
        aria-hidden="true"
      >
        {renderCardContent('story')}
      </div>
    </>
  )
}
