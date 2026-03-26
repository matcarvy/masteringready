'use client'

import { useRef, useState, useCallback } from 'react'
import html2canvas from 'html2canvas'

// --- ReadyCertifiedBadge ---

interface MetricBar {
  percentage: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  tooltip_es?: string
  tooltip_en?: string
}

interface Analysis {
  id: string
  filename: string
  score: number
  verdict: 'ready' | 'almost_ready' | 'needs_work' | 'critical'
  metrics: {
    lufs: number
    true_peak: number
    plr: number
    headroom: number
    stereo_correlation: number
    crest_factor: number
    frequency_balance: number
    l_r_balance: number
    dc_offset: number
    m_s_ratio: number
  }
  metricsData: {
    user_genre: string
    detected_genre: string
    metrics_bars: Record<string, MetricBar> | null
  }
  created_at: string
}

interface ReadyCertifiedBadgeProps {
  analysis: Analysis
  lang: 'es' | 'en'
}

// --- Helpers ---

function stripExtension(filename: string): string {
  return filename.replace(/\.(wav|mp3|aiff|aif|flac|aac|m4a|ogg)$/i, '')
}

function nbsp(s: string): string {
  return s.replace(/ /g, '\u00A0')
}

function getBarColor(status: string): string {
  switch (status) {
    case 'excellent': return '#10b981'
    case 'good': return '#3b82f6'
    case 'warning': return '#f59e0b'
    case 'critical': return '#ef4444'
    default: return '#6b7280'
  }
}

function getStatusLabel(status: string, lang: 'es' | 'en'): string {
  const labels: Record<string, { es: string; en: string }> = {
    excellent: { es: 'Excelente', en: 'Excellent' },
    good: { es: 'Bueno', en: 'Good' },
    warning: { es: 'Revisar', en: 'Review' },
    critical: { es: 'Atender', en: 'Attention' },
  }
  return labels[status]?.[lang] || status
}

// Metric display labels (bilingual) — same order as ScoreCard
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

const orderedKeys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance']

const dedupeMap: Record<string, string> = {
  tonal_balance: 'frequency_balance',
}

// SVG ring circumference (r=88, C=2*PI*88)
const CIRCUMFERENCE = 2 * Math.PI * 88

// --- Main Component ---

export default function ReadyCertifiedBadge({ analysis, lang }: ReadyCertifiedBadgeProps) {
  const feedRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState<'feed' | 'icon' | null>(null)
  const [copied, setCopied] = useState(false)

  const isCertified = analysis.score >= 85
  const trackName = stripExtension(analysis.filename)
  const dateStr = new Date(analysis.created_at).toLocaleDateString(
    lang === 'es' ? 'es-ES' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  )

  const metricsBars = analysis.metricsData?.metrics_bars || null

  // Deduplicated metrics for display
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

  // Count passed metrics (excellent or good)
  const passedCount = displayedMetrics.filter(
    m => m.bar.status === 'excellent' || m.bar.status === 'good'
  ).length

  const handleDownload = useCallback(async (format: 'feed' | 'icon') => {
    const ref = format === 'feed' ? feedRef : iconRef
    if (!ref.current) return

    setGenerating(format)
    try {
      const el = ref.current
      el.style.position = 'fixed'
      el.style.left = '-99999px'
      el.style.top = '0'
      el.style.display = 'flex'
      el.style.opacity = '1'
      el.style.pointerEvents = 'none'

      await new Promise(r => setTimeout(r, 100))

      const size = format === 'feed' ? 1080 : 500
      const canvas = await html2canvas(el, {
        width: size,
        height: size,
        scale: 2,
        backgroundColor: '#0D0D14',
        useCORS: true,
        logging: false,
      })

      el.style.display = 'none'
      el.style.position = ''
      el.style.left = ''
      el.style.top = ''

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `mastering-ready-certified-${format}-${trackName || 'track'}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
    } finally {
      setGenerating(null)
    }
  }, [trackName])

  const handleCopyToClipboard = useCallback(async () => {
    if (!feedRef.current) return

    setGenerating('feed')
    try {
      const el = feedRef.current
      el.style.position = 'fixed'
      el.style.left = '-99999px'
      el.style.top = '0'
      el.style.display = 'flex'
      el.style.opacity = '1'
      el.style.pointerEvents = 'none'

      await new Promise(r => setTimeout(r, 100))

      const canvas = await html2canvas(el, {
        width: 1080,
        height: 1080,
        scale: 2,
        backgroundColor: '#0D0D14',
        useCORS: true,
        logging: false,
      })

      el.style.display = 'none'
      el.style.position = ''
      el.style.left = ''
      el.style.top = ''

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ])
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } catch {
            // Clipboard API may not be available — fallback to download
            handleDownload('feed')
          }
        }
      }, 'image/png')
    } catch {
    } finally {
      setGenerating(null)
    }
  }, [handleDownload])

  // --- Not certified: show threshold info ---
  if (!isCertified) {
    const failingMetrics = displayedMetrics.filter(
      m => m.bar.status === 'warning' || m.bar.status === 'critical'
    )

    return (
      <div style={{
        background: 'var(--mr-bg-card)',
        borderRadius: 'var(--mr-radius)',
        padding: '1.5rem',
        border: '1px solid var(--mr-border)',
      }}>
        <h3 style={{
          fontSize: 'clamp(1rem, 3vw, 1.125rem)',
          fontWeight: 700,
          color: 'var(--mr-text-primary)',
          margin: '0 0 0.75rem',
        }}>
          {lang === 'es' ? 'Ready Certified' : 'Ready Certified'}
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--mr-text-secondary)',
          margin: '0 0 1rem',
          lineHeight: 1.6,
        }}>
          {lang === 'es'
            ? 'Esta pista obtuvo una puntuación de ' + analysis.score + '/100. El sello Ready Certified requiere una puntuación de 85 o superior.'
            : 'This track scored ' + analysis.score + '/100. The Ready Certified badge requires a score of 85 or above.'}
        </p>

        {failingMetrics.length > 0 && (
          <div style={{
            background: 'var(--mr-bg-elevated)',
            borderRadius: 'var(--mr-radius-sm)',
            padding: '1rem',
            border: '1px solid var(--mr-border)',
          }}>
            <p style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--mr-text-primary)',
              margin: '0 0 0.625rem',
            }}>
              {lang === 'es'
                ? 'Métricas que conviene revisar:'
                : 'Metrics that could use attention:'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {failingMetrics.map(({ key, label, bar }) => (
                <div key={key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8125rem',
                }}>
                  <span style={{ color: 'var(--mr-text-secondary)' }}>
                    {lang === 'es' ? label.es : label.en}
                  </span>
                  <span style={{
                    color: getBarColor(bar.status),
                    fontWeight: 600,
                  }}>
                    {bar.percentage}% ({getStatusLabel(bar.status, lang)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- Seal SVG ---
  const renderSeal = (size: number, scoreFont: string, denomFont: string) => {
    const ringRadius = size * 0.38
    const circumference = 2 * Math.PI * ringRadius

    return (
      <div style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Outer glow ring */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={ringRadius}
            fill="none"
            stroke="#2a2520"
            strokeWidth={size * 0.04}
          />
          {/* Gold score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={ringRadius}
            fill="none"
            stroke="#d4a853"
            strokeWidth={size * 0.04}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference * (1 - analysis.score / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          {/* Inner decorative circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={ringRadius - size * 0.05}
            fill="none"
            stroke="#c4983d"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          {/* Outer decorative circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={ringRadius + size * 0.04}
            fill="none"
            stroke="#c4983d"
            strokeWidth={1}
            strokeOpacity={0.2}
          />
        </svg>

        {/* Score number */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          zIndex: 1,
        }}>
          <span style={{
            fontWeight: 900,
            fontSize: scoreFont,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: '#d4a853',
          }}>
            {analysis.score}
          </span>
          <span style={{
            fontWeight: 500,
            fontSize: denomFont,
            color: 'rgba(212, 168, 83, 0.6)',
            marginLeft: '4px',
            whiteSpace: 'pre' as const,
          }}>
            /100
          </span>
        </div>
      </div>
    )
  }

  // --- Feed card (1080x1080) ---
  const renderFeedCard = () => (
    <div style={{
      width: '1080px',
      height: '1080px',
      background: '#0D0D14',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '56px 64px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#f5f5f7',
      wordSpacing: '0.25em',
    }}>
      {/* Top gold gradient line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: 'linear-gradient(135deg, #c4983d 0%, #d4a853 50%, #c4983d 100%)',
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
          fontSize: '18px',
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
          color: '#d4a853',
          background: '#1E1E2A',
          padding: '5px 12px',
          borderRadius: '6px',
          whiteSpace: 'pre' as const,
        }}>
          {nbsp('READY CERTIFIED')}
        </span>
      </div>

      {/* Seal */}
      {renderSeal(220, analysis.score >= 100 ? '64px' : '80px', '26px')}

      {/* Certified text */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{
          fontWeight: 700,
          fontSize: '22px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: '#d4a853',
          whiteSpace: 'pre' as const,
        }}>
          {nbsp('READY CERTIFIED')}
        </span>
        <span style={{
          fontSize: '14px',
          color: '#a0a0b2',
          whiteSpace: 'pre' as const,
        }}>
          {nbsp(lang === 'es'
            ? 'Esta pista cumplió todos los umbrales de mastering'
            : 'This track met all mastering thresholds')}
        </span>
      </div>

      {/* Metrics breakdown */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: '#6b6b7e',
          marginBottom: '4px',
          whiteSpace: 'pre' as const,
        }}>
          {nbsp(lang === 'es'
            ? `${passedCount}/${displayedMetrics.length} métricas aprobadas`
            : `${passedCount}/${displayedMetrics.length} metrics passed`)}
        </div>
        {displayedMetrics.map(({ key, label, bar }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              width: '120px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#a0a0b2',
              textAlign: 'right' as const,
              flexShrink: 0,
              whiteSpace: 'pre' as const,
            }}>
              {nbsp(lang === 'es' ? label.es : label.en)}
            </span>
            <div style={{
              flex: 1,
              height: '8px',
              background: '#1E1E2A',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${bar.percentage}%`,
                height: '100%',
                background: getBarColor(bar.status),
                borderRadius: '4px',
              }} />
            </div>
            <span style={{
              width: '38px',
              fontSize: '13px',
              fontWeight: 700,
              color: getBarColor(bar.status),
              textAlign: 'left' as const,
              flexShrink: 0,
            }}>
              {bar.percentage}%
            </span>
          </div>
        ))}
      </div>

      {/* Track info + Footer */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{
          fontWeight: 600,
          fontSize: '16px',
          color: '#f5f5f7',
          textAlign: 'center' as const,
          maxWidth: '90%',
          whiteSpace: 'pre-wrap' as const,
        }}>
          {nbsp(trackName || (lang === 'es' ? 'Sin nombre' : 'Untitled'))}
        </span>
        <span style={{ fontSize: '11px', color: '#6b6b7e', whiteSpace: 'pre' as const }}>
          {nbsp(dateStr)}
        </span>

        {/* Footer */}
        <div style={{ marginTop: '8px' }}>
          <span style={{
            fontWeight: 700,
            fontSize: '14px',
            color: '#ffffff',
            background: 'linear-gradient(135deg, #c4983d 0%, #d4a853 100%)',
            padding: '6px 20px',
            borderRadius: '20px',
            letterSpacing: '-0.01em',
          }}>
            masteringready.com
          </span>
        </div>
      </div>
    </div>
  )

  // --- Icon card (500x500) ---
  const renderIconCard = () => (
    <div style={{
      width: '500px',
      height: '500px',
      background: '#0D0D14',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      padding: '32px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#f5f5f7',
      wordSpacing: '0.25em',
    }}>
      {/* Top gold gradient line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: 'linear-gradient(135deg, #c4983d 0%, #d4a853 50%, #c4983d 100%)',
      }} />

      {/* Seal */}
      {renderSeal(180, analysis.score >= 100 ? '50px' : '64px', '20px')}

      {/* Certified label */}
      <span style={{
        fontWeight: 700,
        fontSize: '16px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: '#d4a853',
        whiteSpace: 'pre' as const,
      }}>
        {nbsp('READY CERTIFIED')}
      </span>

      {/* Track name */}
      <span style={{
        fontWeight: 600,
        fontSize: '14px',
        color: '#a0a0b2',
        textAlign: 'center' as const,
        maxWidth: '90%',
        whiteSpace: 'pre-wrap' as const,
      }}>
        {nbsp(trackName || (lang === 'es' ? 'Sin nombre' : 'Untitled'))}
      </span>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}>
        <span style={{
          fontSize: '10px',
          color: '#6b6b7e',
          whiteSpace: 'pre' as const,
        }}>
          {nbsp(dateStr)}
        </span>
        <span style={{
          fontWeight: 600,
          fontSize: '11px',
          color: '#6b6b7e',
          whiteSpace: 'pre' as const,
        }}>
          {nbsp('masteringready.com')}
        </span>
      </div>
    </div>
  )

  // --- UI Render ---
  return (
    <>
      {/* Buttons */}
      <div style={{
        background: 'var(--mr-bg-card)',
        borderRadius: 'var(--mr-radius)',
        padding: '1.5rem',
        border: '1px solid var(--mr-border)',
      }}>
        <h3 style={{
          fontSize: 'clamp(1rem, 3vw, 1.125rem)',
          fontWeight: 700,
          color: 'var(--mr-text-primary)',
          margin: '0 0 0.5rem',
        }}>
          Ready Certified
        </h3>
        <p style={{
          fontSize: '0.8125rem',
          color: 'var(--mr-text-secondary)',
          margin: '0 0 1rem',
          lineHeight: 1.5,
        }}>
          {lang === 'es'
            ? 'Esta pista cumplió todos los umbrales de mastering. Descarga el sello para compartir.'
            : 'This track met all mastering thresholds. Download the badge to share.'}
        </p>

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          {/* Feed (1080x1080) */}
          <button
            onClick={() => handleDownload('feed')}
            disabled={generating !== null}
            style={{
              flex: 1,
              minWidth: '120px',
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
              opacity: generating === 'icon' ? 0.5 : 1,
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
                Feed (1080x1080)
              </>
            )}
          </button>

          {/* Icon (500x500) */}
          <button
            onClick={() => handleDownload('icon')}
            disabled={generating !== null}
            style={{
              flex: 1,
              minWidth: '120px',
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
            {generating === 'icon' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                {lang === 'es' ? 'Generando...' : 'Generating...'}
              </span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Icon (500x500)
              </>
            )}
          </button>

          {/* Copy to clipboard */}
          <button
            onClick={handleCopyToClipboard}
            disabled={generating !== null}
            style={{
              flex: 1,
              minWidth: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: copied ? 'var(--mr-green-bg)' : 'var(--mr-bg-card)',
              color: copied ? 'var(--mr-green)' : 'var(--mr-text-secondary)',
              border: copied ? '2px solid var(--mr-green)' : '2px solid var(--mr-border)',
              borderRadius: '0.75rem',
              fontWeight: '600',
              fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
              cursor: generating ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!generating && !copied) {
                e.currentTarget.style.background = 'var(--mr-bg-elevated)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) e.currentTarget.style.background = 'var(--mr-bg-card)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {lang === 'es' ? 'Copiado' : 'Copied'}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {lang === 'es' ? 'Copiar' : 'Copy'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden card containers for html2canvas capture */}
      <div
        ref={feedRef}
        style={{ display: 'none', position: 'absolute', left: '-99999px', top: 0 }}
        aria-hidden="true"
      >
        {renderFeedCard()}
      </div>
      <div
        ref={iconRef}
        style={{ display: 'none', position: 'absolute', left: '-99999px', top: 0 }}
        aria-hidden="true"
      >
        {renderIconCard()}
      </div>
    </>
  )
}
