'use client'

import { useRef, useState, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { X, Download } from 'lucide-react'

// --- InfographicRenderer ---

interface InfographicRendererProps {
  content: string          // The raw infographic content text
  onClose?: () => void     // Close the renderer overlay
}

// --- Parsing ---

interface InfographicData {
  headline: string
  before: string
  after: string
  fixLine: string
  bottom: string
}

function parseInfographic(content: string): InfographicData | null {
  const lines = content.split('\n')
  const data: Record<string, string> = {}
  for (const line of lines) {
    const match = line.match(/^(HEADLINE|BEFORE|AFTER|FIX LINE|BOTTOM):\s*(.+)$/i)
    if (match) {
      data[match[1].toUpperCase()] = match[2].trim()
    }
  }

  // Must have at least headline to count as structured
  if (!data['HEADLINE']) return null

  return {
    headline: data['HEADLINE'] || '',
    before: data['BEFORE'] || '',
    after: data['AFTER'] || '',
    fixLine: data['FIX LINE'] || '',
    bottom: data['BOTTOM'] || '',
  }
}

// Replace spaces with non-breaking spaces — html2canvas collapses regular spaces
function nbsp(s: string): string {
  return s.replace(/ /g, '\u00A0')
}

// --- Component ---

const FEED_SIZE = 1080
const STORY_HEIGHT = 1350
const FEED_CIRCLE = 160
const STORY_CIRCLE = 190
const OVERLAY_Z_INDEX = 1000

export default function InfographicRenderer({ content, onClose }: InfographicRendererProps) {
  const feedRef = useRef<HTMLDivElement>(null)
  const portraitRef = useRef<HTMLDivElement>(null)
  const [format, setFormat] = useState<'feed' | 'portrait'>('feed')
  const [generating, setGenerating] = useState<'feed' | 'portrait' | null>(null)

  const parsed = parseInfographic(content)

  const handleDownload = useCallback(async (fmt: 'feed' | 'portrait') => {
    const ref = fmt === 'feed' ? feedRef : portraitRef
    if (!ref.current) return

    setGenerating(fmt)
    try {
      const el = ref.current
      el.style.position = 'fixed'
      el.style.left = '-99999px'
      el.style.top = '0'
      el.style.display = 'flex'
      el.style.opacity = '1'
      el.style.pointerEvents = 'none'

      // Wait for fonts + layout to settle
      await new Promise(r => setTimeout(r, 100))

      const canvas = await html2canvas(el, {
        width: FEED_SIZE,
        height: fmt === 'feed' ? FEED_SIZE : STORY_HEIGHT,
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
      link.download = `mr-infographic-${Date.now()}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
    } finally {
      setGenerating(null)
    }
  }, [])

  // --- Card content renderer (hardcoded colors for html2canvas) ---

  const renderCardContent = (fmt: 'feed' | 'portrait') => {
    const isFeed = fmt === 'feed'
    const width = FEED_SIZE
    const height = isFeed ? FEED_SIZE : STORY_HEIGHT

    // Sizing
    const padding = isFeed ? '64px 72px' : '72px 80px'
    const headlineFont = isFeed ? '46px' : '52px'
    const circleSize = isFeed ? FEED_CIRCLE : STORY_CIRCLE
    const scoreFont = isFeed ? '56px' : '64px'
    const labelFont = isFeed ? '16px' : '18px'
    const arrowFont = isFeed ? '36px' : '42px'
    const fixLineFont = isFeed ? '20px' : '22px'
    const bottomFont = isFeed ? '18px' : '20px'
    const wordmarkFont = isFeed ? '15px' : '16px'
    const circleStroke = 4

    if (parsed) {
      // --- Structured Layout ---
      return (
        <div style={{
          width: `${width}px`,
          height: `${height}px`,
          background: '#0D0D14',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          color: '#f5f5f7',
          wordSpacing: '0.25em',
        }}>
          {/* Top gradient bar */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '4px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }} />

          {/* HEADLINE */}
          <div style={{
            marginTop: isFeed ? '16px' : '24px',
          }}>
            <div style={{
              fontWeight: 800,
              fontSize: headlineFont,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: '#f5f5f7',
              whiteSpace: 'pre-wrap' as const,
            }}>
              {nbsp(parsed.headline)}
            </div>
          </div>

          {/* BEFORE / AFTER circles */}
          {(parsed.before || parsed.after) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isFeed ? '40px' : '48px',
              marginTop: isFeed ? '0' : '16px',
            }}>
              {/* BEFORE */}
              {parsed.before && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{
                    width: `${circleSize}px`,
                    height: `${circleSize}px`,
                    borderRadius: '50%',
                    border: `${circleStroke}px solid #ef4444`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      fontWeight: 900,
                      fontSize: scoreFont,
                      color: '#ef4444',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}>
                      {parsed.before}
                    </span>
                  </div>
                  <span style={{
                    fontSize: labelFont,
                    fontWeight: 600,
                    color: '#6b6b7e',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    whiteSpace: 'pre' as const,
                  }}>
                    {nbsp('ANTES')}
                  </span>
                </div>
              )}

              {/* Arrow */}
              {parsed.before && parsed.after && (
                <span style={{
                  fontSize: arrowFont,
                  color: '#6b6b7e',
                  fontWeight: 300,
                  marginBottom: isFeed ? '28px' : '32px',
                }}>
                  {'\u2192'}
                </span>
              )}

              {/* AFTER */}
              {parsed.after && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{
                    width: `${circleSize}px`,
                    height: `${circleSize}px`,
                    borderRadius: '50%',
                    border: `${circleStroke}px solid #10b981`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      fontWeight: 900,
                      fontSize: scoreFont,
                      color: '#10b981',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}>
                      {parsed.after}
                    </span>
                  </div>
                  <span style={{
                    fontSize: labelFont,
                    fontWeight: 600,
                    color: '#6b6b7e',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    whiteSpace: 'pre' as const,
                  }}>
                    {nbsp('DESPUÉS')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FIX LINE */}
          {parsed.fixLine && (
            <div style={{
              background: '#161620',
              borderRadius: '12px',
              padding: isFeed ? '20px 24px' : '24px 28px',
              borderLeft: '4px solid #667eea',
              marginTop: isFeed ? '0' : '16px',
            }}>
              <span style={{
                fontSize: fixLineFont,
                fontWeight: 500,
                color: '#a0a0b2',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap' as const,
              }}>
                {nbsp(parsed.fixLine)}
              </span>
            </div>
          )}

          {/* BOTTOM + wordmark */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            marginTop: isFeed ? '0' : '16px',
          }}>
            {parsed.bottom && (
              <span style={{
                fontSize: bottomFont,
                fontWeight: 600,
                color: '#f5f5f7',
                textAlign: 'center' as const,
                whiteSpace: 'pre-wrap' as const,
              }}>
                {nbsp(parsed.bottom)}
              </span>
            )}
            <span style={{
              fontSize: wordmarkFont,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#6b6b7e',
              whiteSpace: 'pre' as const,
            }}>
              {nbsp('Mastering Ready')}
            </span>
          </div>
        </div>
      )
    }

    // --- Fallback: Raw text in branded card ---
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        background: '#0D0D14',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#f5f5f7',
        wordSpacing: '0.25em',
      }}>
        {/* Top gradient bar */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '4px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }} />

        {/* Raw content */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0',
        }}>
          <div style={{
            background: '#161620',
            borderRadius: '12px',
            padding: '32px 36px',
            borderLeft: '4px solid #667eea',
            maxWidth: '90%',
          }}>
            <span style={{
              fontSize: '22px',
              fontWeight: 500,
              color: '#a0a0b2',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap' as const,
            }}>
              {nbsp(content)}
            </span>
          </div>
        </div>

        {/* Wordmark */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: wordmarkFont,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#6b6b7e',
            whiteSpace: 'pre' as const,
          }}>
            {nbsp('Mastering Ready')}
          </span>
        </div>
      </div>
    )
  }

  // --- Preview renderer ---

  const renderPreview = () => {
    const isFeed = format === 'feed'
    const aspectRatio = isFeed ? '1 / 1' : '1080 / 1350'

    if (parsed) {
      return (
        <div style={{
          width: '100%',
          aspectRatio,
          background: 'var(--mr-bg-base, #0D0D14)',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isFeed ? '24px 28px' : '28px 32px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          border: '1px solid var(--mr-border, rgba(255,255,255,0.08))',
        }}>
          {/* Top gradient bar */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '3px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }} />

          {/* HEADLINE */}
          <div style={{ marginTop: '4px' }}>
            <div style={{
              fontWeight: 800,
              fontSize: isFeed ? 'clamp(14px, 3.5vw, 20px)' : 'clamp(15px, 3.5vw, 22px)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--mr-text-primary, #f5f5f7)',
            }}>
              {parsed.headline}
            </div>
          </div>

          {/* BEFORE / AFTER circles */}
          {(parsed.before || parsed.after) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isFeed ? '16px' : '20px',
            }}>
              {parsed.before && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <div style={{
                    width: isFeed ? '60px' : '72px',
                    height: isFeed ? '60px' : '72px',
                    borderRadius: '50%',
                    border: '3px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      fontWeight: 900,
                      fontSize: isFeed ? '22px' : '26px',
                      color: '#ef4444',
                      lineHeight: 1,
                    }}>
                      {parsed.before}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color: 'var(--mr-text-tertiary, #6b6b7e)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                  }}>
                    ANTES
                  </span>
                </div>
              )}

              {parsed.before && parsed.after && (
                <span style={{
                  fontSize: isFeed ? '16px' : '18px',
                  color: 'var(--mr-text-tertiary, #6b6b7e)',
                  fontWeight: 300,
                  marginBottom: isFeed ? '16px' : '20px',
                }}>
                  {'\u2192'}
                </span>
              )}

              {parsed.after && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <div style={{
                    width: isFeed ? '60px' : '72px',
                    height: isFeed ? '60px' : '72px',
                    borderRadius: '50%',
                    border: '3px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      fontWeight: 900,
                      fontSize: isFeed ? '22px' : '26px',
                      color: '#10b981',
                      lineHeight: 1,
                    }}>
                      {parsed.after}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color: 'var(--mr-text-tertiary, #6b6b7e)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                  }}>
                    DESPUÉS
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FIX LINE */}
          {parsed.fixLine && (
            <div style={{
              background: 'var(--mr-bg-card, #161620)',
              borderRadius: '8px',
              padding: isFeed ? '10px 14px' : '12px 16px',
              borderLeft: '3px solid #667eea',
            }}>
              <span style={{
                fontSize: isFeed ? 'clamp(10px, 2.5vw, 13px)' : 'clamp(11px, 2.5vw, 14px)',
                fontWeight: 500,
                color: 'var(--mr-text-secondary, #a0a0b2)',
                lineHeight: 1.5,
              }}>
                {parsed.fixLine}
              </span>
            </div>
          )}

          {/* BOTTOM + wordmark */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}>
            {parsed.bottom && (
              <span style={{
                fontSize: isFeed ? '11px' : '12px',
                fontWeight: 600,
                color: 'var(--mr-text-primary, #f5f5f7)',
                textAlign: 'center' as const,
              }}>
                {parsed.bottom}
              </span>
            )}
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--mr-text-tertiary, #6b6b7e)',
            }}>
              Mastering Ready
            </span>
          </div>
        </div>
      )
    }

    // Fallback preview
    return (
      <div style={{
        width: '100%',
        aspectRatio,
        background: 'var(--mr-bg-base, #0D0D14)',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 28px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        border: '1px solid var(--mr-border, rgba(255,255,255,0.08))',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }} />
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 0',
        }}>
          <div style={{
            background: 'var(--mr-bg-card, #161620)',
            borderRadius: '8px',
            padding: '16px 20px',
            borderLeft: '3px solid #667eea',
            maxWidth: '90%',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--mr-text-secondary, #a0a0b2)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap' as const,
            }}>
              {content}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--mr-text-tertiary, #6b6b7e)',
          }}>
            Mastering Ready
          </span>
        </div>
      </div>
    )
  }

  // --- Modal overlay UI ---

  return (
    <>
      {/* Modal overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: OVERLAY_Z_INDEX,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--mr-bg-card, #161620)',
            borderRadius: '12px',
            border: '1px solid var(--mr-border, rgba(255,255,255,0.08))',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'var(--mr-bg-elevated, #1E1E2A)',
              color: 'var(--mr-text-secondary, #a0a0b2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mr-bg-hover, #282836)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mr-bg-elevated, #1E1E2A)' }}
          >
            <X size={18} />
          </button>

          {/* Title */}
          <div style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--mr-text-primary, #f5f5f7)',
            marginBottom: '1rem',
          }}>
            Infographic
          </div>

          {/* Format toggle */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            {(['feed', 'portrait'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: `2px solid ${format === fmt ? '#667eea' : 'var(--mr-border, rgba(255,255,255,0.08))'}`,
                  background: format === fmt
                    ? 'rgba(102, 126, 234, 0.1)'
                    : 'var(--mr-bg-elevated, #1E1E2A)',
                  color: format === fmt
                    ? '#667eea'
                    : 'var(--mr-text-secondary, #a0a0b2)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {fmt === 'feed' ? '1080 \u00D7 1080' : '1080 \u00D7 1350'}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div style={{
            marginBottom: '1rem',
          }}>
            {renderPreview()}
          </div>

          {/* Download button */}
          <button
            onClick={() => handleDownload(format)}
            disabled={generating !== null}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: generating ? '#3d3d52' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9375rem',
              cursor: generating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'transform 0.15s, box-shadow 0.15s',
              opacity: generating ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!generating) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {generating ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <Download size={16} />
                Download PNG
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden capture containers — rendered off-screen for html2canvas */}
      <div
        ref={feedRef}
        style={{ display: 'none', position: 'absolute', left: '-99999px', top: 0 }}
        aria-hidden="true"
      >
        {renderCardContent('feed')}
      </div>
      <div
        ref={portraitRef}
        style={{ display: 'none', position: 'absolute', left: '-99999px', top: 0 }}
        aria-hidden="true"
      >
        {renderCardContent('portrait')}
      </div>
    </>
  )
}
