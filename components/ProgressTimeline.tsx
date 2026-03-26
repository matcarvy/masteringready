'use client'

/**
 * ProgressTimeline - Score evolution chart with trend line and narrative stats.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, Activity } from 'lucide-react'
import Select from '@/components/Select'

// --- Types ---

interface Analysis {
  id: string
  filename: string
  score: number
  created_at: string
}

interface ProgressTimelineProps {
  analyses: Analysis[]
  lang: 'es' | 'en'
  isMobile: boolean
}

// --- Translations ---

const t = {
  es: {
    title: 'Tu progreso',
    singleAnalysis: 'Analiza otra mezcla para ver tu progreso a lo largo del tiempo.',
    noAnalyses: 'Analiza tu primera mezcla para empezar a ver tu progreso.',
    bestMix: 'Tu mejor mezcla',
    avgScore: 'Puntuación promedio',
    totalAnalyses: (n: number) => `${n} ${n === 1 ? 'análisis' : 'análisis'} en total`,
    totalVersions: (n: number) => `${n} ${n === 1 ? 'versión analizada' : 'versiones analizadas'}`,
    improved: (from: number, to: number) => `Tu promedio mejoró de ${from} a ${to}`,
    score: 'Puntuación',
    track: 'Pista',
    date: 'Fecha',
    trend: 'Tendencia',
    at: 'con',
    allTracks: 'Todas las pistas',
    bestScoreFor: (name: string) => `Tu mejor puntuación para ${name}`,
    singleAnalysisFiltered: 'Analiza otra versión de esta pista para ver su progreso.',
  },
  en: {
    title: 'Your progress',
    singleAnalysis: 'Analyze another mix to see your progress over time.',
    noAnalyses: 'Analyze your first mix to start tracking your progress.',
    bestMix: 'Your best mix',
    avgScore: 'Average score',
    totalAnalyses: (n: number) => `${n} ${n === 1 ? 'analysis' : 'analyses'} total`,
    totalVersions: (n: number) => `${n} ${n === 1 ? 'version analyzed' : 'versions analyzed'}`,
    improved: (from: number, to: number) => `Your average improved from ${from} to ${to}`,
    score: 'Score',
    track: 'Track',
    date: 'Date',
    trend: 'Trend',
    at: 'at',
    allTracks: 'All tracks',
    bestScoreFor: (name: string) => `Your best score for ${name}`,
    singleAnalysisFiltered: 'Analyze another version of this track to see its progress.',
  },
}

// --- Helpers ---

function getScoreColor(score: number): string {
  if (score >= 85) return '#10b981' // green
  if (score >= 60) return '#f59e0b' // amber
  if (score >= 40) return '#f97316' // orange
  return '#ef4444' // red
}

function formatShortDate(dateString: string, lang: 'es' | 'en'): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
  })
}

function formatFullDate(dateString: string, lang: 'es' | 'en'): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Simple moving average with window of n */
function movingAverage(data: { score: number }[], windowSize: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < windowSize - 1) return null
    const window = data.slice(i - windowSize + 1, i + 1)
    return Math.round(window.reduce((sum, d) => sum + d.score, 0) / window.length)
  })
}

/** Normalize filename for grouping: strip extension, trim, collapse whitespace */
function normalizeFilename(filename: string): string {
  if (!filename) return ''
  return filename
    .replace(/\.(wav|mp3|aiff|aif|flac|aac|m4a|ogg)$/i, '')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Truncate filename for display */
function truncateFilename(filename: string, maxLen: number): string {
  if (!filename) return ''
  // Remove extension
  const name = filename.replace(/\.(wav|mp3|aiff|aif|flac|aac|m4a|ogg)$/i, '')
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 3) + '...'
}

// --- Custom Dot ---

// Dot hover state setter is passed via a module-level ref so CustomDot
// (which must be a stable component for Recharts) can access it.
let _setHoveredDot: ((dot: { cx: number; cy: number; data: any } | null) => void) | null = null

function CustomDot(props: any) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null

  const color = getScoreColor(payload.score)
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={color}
      stroke="var(--mr-bg-card)"
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => _setHoveredDot?.({ cx, cy, data: payload })}
      onMouseLeave={() => _setHoveredDot?.(null)}
    />
  )
}

// --- Narrative Stat Line ---

function NarrativeLine({
  analyses,
  lang,
  trackName,
}: {
  analyses: Analysis[]
  lang: 'es' | 'en'
  trackName?: string | null
}) {
  const labels = t[lang]

  const stats = useMemo(() => {
    if (analyses.length === 0) return null

    const sorted = [...analyses].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const best = sorted.reduce((max, a) => (a.score > max.score ? a : max), sorted[0])
    const avgAll = Math.round(sorted.reduce((sum, a) => sum + a.score, 0) / sorted.length)

    // Check if average improved between first half and second half
    let improved = false
    let avgFirst = 0
    let avgSecond = 0
    if (sorted.length >= 4) {
      const mid = Math.floor(sorted.length / 2)
      const firstHalf = sorted.slice(0, mid)
      const secondHalf = sorted.slice(mid)
      avgFirst = Math.round(firstHalf.reduce((s, a) => s + a.score, 0) / firstHalf.length)
      avgSecond = Math.round(secondHalf.reduce((s, a) => s + a.score, 0) / secondHalf.length)
      improved = avgSecond > avgFirst
    }

    return { best, avgAll, improved, avgFirst, avgSecond, total: sorted.length }
  }, [analyses])

  if (!stats) return null

  // Pick the most relevant narrative
  const bestName = truncateFilename(stats.best.filename, 30)

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.75rem 1.5rem',
      marginBottom: '1rem',
    }}>
      {/* Best mix / Best score for track */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.8125rem',
        color: 'var(--mr-text-secondary)',
      }}>
        {trackName ? (
          <>
            <span>{lang === 'es' ? 'Mejor puntuación' : 'Best score'}:</span>
            <span style={{ color: 'var(--mr-green)', fontWeight: 600 }}>
              {stats.best.score}
            </span>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--mr-green)', fontWeight: 600 }}>
              {stats.best.score}
            </span>
            <span>{labels.at}</span>
            <span style={{
              color: 'var(--mr-text-primary)',
              fontWeight: 500,
              maxWidth: '150px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {bestName}
            </span>
          </>
        )}
      </div>

      {/* Average */}
      <div style={{
        fontSize: '0.8125rem',
        color: 'var(--mr-text-secondary)',
      }}>
        {labels.avgScore}:{' '}
        <span style={{ color: getScoreColor(stats.avgAll), fontWeight: 600 }}>
          {stats.avgAll}
        </span>
      </div>

      {/* Total */}
      <div style={{
        fontSize: '0.8125rem',
        color: 'var(--mr-text-secondary)',
      }}>
        {trackName ? labels.totalVersions(stats.total) : labels.totalAnalyses(stats.total)}
      </div>

      {/* Improvement */}
      {stats.improved && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.8125rem',
          color: 'var(--mr-green)',
          fontWeight: 500,
        }}>
          <TrendingUp size={14} />
          {labels.improved(stats.avgFirst, stats.avgSecond)}
        </div>
      )}
    </div>
  )
}

// --- Main Component ---

export default function ProgressTimeline({ analyses, lang, isMobile }: ProgressTimelineProps) {
  const labels = t[lang]
  const [selectedTrack, setSelectedTrack] = useState<string>('__all__')
  const [hoveredDot, setHoveredDot] = useState<{ cx: number; cy: number; data: any } | null>(null)

  // Expose state setter to CustomDot via module-level ref
  useEffect(() => {
    _setHoveredDot = setHoveredDot
    return () => { _setHoveredDot = null }
  }, [])

  // Group analyses by normalized filename — only include songs with 2+ analyses
  const trackOptions = useMemo(() => {
    const groups: Record<string, number> = {}
    for (const a of analyses) {
      const key = normalizeFilename(a.filename)
      if (key) {
        groups[key] = (groups[key] || 0) + 1
      }
    }
    return Object.entries(groups)
      .filter(([, count]) => count >= 2)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name]) => name)
  }, [analyses])

  // Build Select options
  const selectOptions = useMemo(() => {
    const opts = [{ value: '__all__', label: labels.allTracks }]
    for (const name of trackOptions) {
      opts.push({ value: name, label: truncateFilename(name, 40) })
    }
    return opts
  }, [trackOptions, labels.allTracks])

  // Reset selected track if it's no longer in the options (e.g., analyses changed)
  useEffect(() => {
    if (selectedTrack !== '__all__' && !trackOptions.includes(selectedTrack)) {
      setSelectedTrack('__all__')
    }
  }, [selectedTrack, trackOptions])

  // Filter analyses based on selected track
  const filteredAnalyses = useMemo(() => {
    if (selectedTrack === '__all__') return analyses
    return analyses.filter(a => normalizeFilename(a.filename) === selectedTrack)
  }, [analyses, selectedTrack])

  // Sort analyses oldest → newest for chart
  const chartData = useMemo(() => {
    if (filteredAnalyses.length === 0) return []

    const sorted = [...filteredAnalyses].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const trendValues = sorted.length >= 5 ? movingAverage(sorted, 3) : null

    // Deduplicate x-axis labels: only show date on first occurrence of each day
    let lastDate = ''
    return sorted.map((a, i) => {
      const date = formatShortDate(a.created_at, lang)
      const showDate = date !== lastDate
      lastDate = date
      return {
        id: a.id,
        score: a.score,
        displayName: truncateFilename(a.filename, 25),
        shortDate: showDate ? date : '',
        fullDate: formatFullDate(a.created_at, lang),
        trend: trendValues ? trendValues[i] : null,
      }
    })
  }, [filteredAnalyses, lang])

  // Single analysis — show friendly message
  if (analyses.length <= 1) {
    return (
      <div style={{
        background: 'var(--mr-bg-card)',
        borderRadius: '1rem',
        padding: isMobile ? '1.25rem' : '1.5rem',
        boxShadow: 'var(--mr-shadow)',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}>
          <Activity size={18} style={{ color: 'var(--mr-primary)' }} />
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--mr-text-primary)',
            margin: 0,
          }}>
            {labels.title}
          </h3>
        </div>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--mr-text-secondary)',
          margin: 0,
          lineHeight: 1.6,
        }}>
          {analyses.length === 0 ? labels.noAnalyses : labels.singleAnalysis}
        </p>
      </div>
    )
  }

  // When filtered to a track with only 1 data point (shouldn't happen due to dropdown logic, but safety)
  const showAnalyzeMoreMessage = selectedTrack !== '__all__' && filteredAnalyses.length <= 1

  // Chart height adapts to screen
  const chartHeight = isMobile ? 200 : 260

  // Track name for narrative (null when showing all)
  const activeTrackName = selectedTrack !== '__all__' ? selectedTrack : null

  return (
    <div style={{
      background: 'var(--mr-bg-card)',
      borderRadius: '1rem',
      padding: isMobile ? '1rem' : '1.5rem',
      boxShadow: 'var(--mr-shadow)',
      marginBottom: '1.5rem',
    }}>
      {/* Header + Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
      }}>
        <Activity size={18} style={{ color: 'var(--mr-primary)', flexShrink: 0 }} />
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--mr-text-primary)',
          margin: 0,
          flex: 1,
        }}>
          {labels.title}
        </h3>
        {trackOptions.length > 0 && (
          <div style={{ width: isMobile ? '140px' : '200px', flexShrink: 0 }}>
            <Select
              value={selectedTrack}
              onChange={setSelectedTrack}
              options={selectOptions}
              compact
            />
          </div>
        )}
      </div>

      {/* Narrative stats */}
      <NarrativeLine analyses={filteredAnalyses} lang={lang} trackName={activeTrackName} />

      {/* Chart or "analyze more" message */}
      {showAnalyzeMoreMessage ? (
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--mr-text-secondary)',
          margin: 0,
          lineHeight: 1.6,
        }}>
          {labels.singleAnalysisFiltered}
        </p>
      ) : (
        <>
          <div style={{ width: '100%', height: chartHeight, position: 'relative', overflow: 'visible' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 8,
                  right: isMobile ? 8 : 16,
                  left: isMobile ? -20 : 0,
                  bottom: 4,
                }}
              >
                {/* Gradient fill for area */}
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="shortDate"
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: 'var(--mr-text-tertiary)',
                  }}
                  axisLine={{ stroke: 'var(--mr-border)' }}
                  tickLine={false}
                  interval={isMobile && chartData.length > 6 ? Math.floor(chartData.length / 4) : 'preserveStartEnd'}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: 'var(--mr-text-tertiary)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 30 : 40}
                  ticks={[0, 25, 50, 75, 100]}
                />

                {/* No built-in Tooltip — custom dot-hover tooltip below */}

                {/* Reference lines at score thresholds */}
                <ReferenceLine
                  y={85}
                  stroke="#10b981"
                  strokeDasharray="6 4"
                  strokeOpacity={0.3}
                />
                <ReferenceLine
                  y={60}
                  stroke="#f59e0b"
                  strokeDasharray="6 4"
                  strokeOpacity={0.3}
                />

                {/* Main score area — tooltip triggers only on direct dot hover */}
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#667eea"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                  dot={<CustomDot />}
                  activeDot={false}
                  isAnimationActive={false}
                />

                {/* Trend line (moving average) — only if 5+ data points */}
                {chartData.length >= 5 && chartData.some(d => d.trend !== null) && (
                  <Area
                    type="monotone"
                    dataKey="trend"
                    stroke="#764ba2"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    fill="none"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    connectNulls
                    tooltipType="none"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            {/* Custom tooltip — only appears on direct dot hover, clamped to chart bounds */}
            {hoveredDot && (
              <div style={{
                position: 'absolute',
                left: `clamp(108px, ${hoveredDot.cx}px, calc(100% - 108px))`,
                top: hoveredDot.cy - 10,
                transform: 'translate(-50%, -100%)',
                background: 'var(--mr-bg-card)',
                border: '1px solid var(--mr-border)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                boxShadow: 'var(--mr-shadow-lg)',
                width: '200px',
                pointerEvents: 'none',
                zIndex: 10,
              }}>
                <div style={{
                  fontSize: '0.8125rem',
                  color: 'var(--mr-text-secondary)',
                  marginBottom: '0.25rem',
                }}>
                  {hoveredDot.data.fullDate}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--mr-text-primary)',
                  marginBottom: '0.375rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {hoveredDot.data.displayName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: getScoreColor(hoveredDot.data.score),
                  }}>
                    {hoveredDot.data.score}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)' }}>
                    / 100
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Legend — only show when trend line is visible */}
          {chartData.length >= 5 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.25rem',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--mr-text-tertiary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{
                  width: 16,
                  height: 2,
                  background: '#667eea',
                  borderRadius: 1,
                }} />
                {labels.score}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{
                  width: 16,
                  height: 2,
                  background: '#764ba2',
                  borderRadius: 1,
                  backgroundImage: 'repeating-linear-gradient(90deg, #764ba2 0px, #764ba2 4px, transparent 4px, transparent 7px)',
                  backgroundSize: '7px 2px',
                }} />
                {labels.trend}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
