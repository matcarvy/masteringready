'use client'

/**
 * ProgressTimeline — Score evolution chart
 * =========================================
 * Line/area chart showing score history over time.
 * Color-coded points by score range, optional trend line,
 * motivational narrative stat line above the chart.
 *
 * Uses Recharts (lightweight, React-native).
 * All text bilingual (ES LATAM Neutro / US EN).
 * All colors via var(--mr-*) CSS tokens.
 */

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, Activity } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// TRANSLATIONS
// ============================================================================

const t = {
  es: {
    title: 'Tu progreso',
    singleAnalysis: 'Analiza otra mezcla para ver tu progreso a lo largo del tiempo.',
    noAnalyses: 'Analiza tu primera mezcla para empezar a ver tu progreso.',
    bestMix: 'Tu mejor mezcla',
    avgScore: 'Puntuación promedio',
    totalAnalyses: (n: number) => `${n} ${n === 1 ? 'análisis' : 'análisis'} en total`,
    improved: (from: number, to: number) => `Tu promedio mejoró de ${from} a ${to}`,
    score: 'Puntuación',
    track: 'Pista',
    date: 'Fecha',
    trend: 'Tendencia',
    at: 'con',
  },
  en: {
    title: 'Your progress',
    singleAnalysis: 'Analyze another mix to see your progress over time.',
    noAnalyses: 'Analyze your first mix to start tracking your progress.',
    bestMix: 'Your best mix',
    avgScore: 'Average score',
    totalAnalyses: (n: number) => `${n} ${n === 1 ? 'analysis' : 'analyses'} total`,
    improved: (from: number, to: number) => `Your average improved from ${from} to ${to}`,
    score: 'Score',
    track: 'Track',
    date: 'Date',
    trend: 'Trend',
    at: 'at',
  },
}

// ============================================================================
// HELPERS
// ============================================================================

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

/** Truncate filename for display */
function truncateFilename(filename: string, maxLen: number): string {
  if (!filename) return ''
  // Remove extension
  const name = filename.replace(/\.(wav|mp3|aiff|aif|flac|aac|m4a|ogg)$/i, '')
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 3) + '...'
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

function CustomTooltip({ active, payload, lang }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0]?.payload
  if (!data) return null

  const labels = t[lang as 'es' | 'en']
  const color = getScoreColor(data.score)

  return (
    <div style={{
      background: 'var(--mr-bg-card)',
      border: '1px solid var(--mr-border)',
      borderRadius: '0.5rem',
      padding: '0.75rem 1rem',
      boxShadow: 'var(--mr-shadow-lg)',
      maxWidth: '220px',
    }}>
      <div style={{
        fontSize: '0.8125rem',
        color: 'var(--mr-text-secondary)',
        marginBottom: '0.25rem',
      }}>
        {data.fullDate}
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
        {data.displayName}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}>
        <span style={{
          fontSize: '1.125rem',
          fontWeight: 700,
          color,
        }}>
          {data.score}
        </span>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--mr-text-tertiary)',
        }}>
          / 100
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// CUSTOM DOT
// ============================================================================

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
    />
  )
}

function CustomActiveDot(props: any) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null

  const color = getScoreColor(payload.score)
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.2} />
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="var(--mr-bg-card)" strokeWidth={2} />
    </g>
  )
}

// ============================================================================
// NARRATIVE STAT LINE
// ============================================================================

function NarrativeLine({
  analyses,
  lang,
}: {
  analyses: Analysis[]
  lang: 'es' | 'en'
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
      {/* Best mix */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.8125rem',
        color: 'var(--mr-text-secondary)',
      }}>
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
        {labels.totalAnalyses(stats.total)}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProgressTimeline({ analyses, lang, isMobile }: ProgressTimelineProps) {
  const labels = t[lang]

  // Sort analyses oldest → newest for chart
  const chartData = useMemo(() => {
    if (analyses.length === 0) return []

    const sorted = [...analyses].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const trendValues = analyses.length >= 5 ? movingAverage(sorted, 3) : null

    return sorted.map((a, i) => ({
      id: a.id,
      score: a.score,
      displayName: truncateFilename(a.filename, 25),
      shortDate: formatShortDate(a.created_at, lang),
      fullDate: formatFullDate(a.created_at, lang),
      trend: trendValues ? trendValues[i] : null,
    }))
  }, [analyses, lang])

  // Single analysis — show friendly message
  if (analyses.length <= 1) {
    return (
      <div style={{
        background: 'var(--mr-bg-card)',
        borderRadius: '1rem',
        padding: isMobile ? '1.25rem' : '1.5rem',
        boxShadow: 'var(--mr-shadow)',
        marginBottom: '1.5rem',
        opacity: 0,
        animation: 'cardFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 300ms forwards',
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

  // Chart height adapts to screen
  const chartHeight = isMobile ? 200 : 260

  return (
    <div style={{
      background: 'var(--mr-bg-card)',
      borderRadius: '1rem',
      padding: isMobile ? '1rem' : '1.5rem',
      boxShadow: 'var(--mr-shadow)',
      marginBottom: '1.5rem',
      opacity: 0,
      animation: 'cardFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 300ms forwards',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
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

      {/* Narrative stats */}
      <NarrativeLine analyses={analyses} lang={lang} />

      {/* Chart */}
      <div style={{ width: '100%', height: chartHeight }}>
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

            <Tooltip
              content={<CustomTooltip lang={lang} />}
              cursor={{
                stroke: 'var(--mr-border)',
                strokeDasharray: '4 4',
              }}
            />

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

            {/* Main score area */}
            <Area
              type="monotone"
              dataKey="score"
              stroke="#667eea"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              dot={<CustomDot />}
              activeDot={<CustomActiveDot />}
              animationDuration={800}
              animationEasing="ease-out"
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
                animationDuration={1000}
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
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
    </div>
  )
}
