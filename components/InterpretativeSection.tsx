'use client'

interface InterpretativeSectionProps {
  title: string
  interpretation: string
  recommendation: string
  metrics: {
    [key: string]: any
    status: 'excellent' | 'good' | 'warning' | 'error'
  }
  lang: 'es' | 'en'
}

export default function InterpretativeSection({ title, interpretation, recommendation, metrics, lang }: InterpretativeSectionProps) {
  const statusColors = {
    excellent: { border: 'var(--mr-green)', bg: 'var(--mr-green-bg)', text: 'var(--mr-green-text)' },
    good: { border: 'var(--mr-blue)', bg: 'var(--mr-blue-bg)', text: 'var(--mr-blue-text)' },
    warning: { border: 'var(--mr-amber)', bg: 'var(--mr-amber-bg)', text: 'var(--mr-amber-text)' },
    error: { border: 'var(--mr-red)', bg: 'var(--mr-red-bg)', text: 'var(--mr-red-text)' }
  }

  const colors = statusColors[metrics.status] || statusColors.good

  return (
    <div style={{
      border: `2px solid ${colors.border}`,
      borderRadius: '1rem',
      padding: '1.5rem',
      background: 'var(--mr-bg-card)',
      marginBottom: '1.5rem'
    }}>
      {/* Title */}
      <h4 style={{
        fontSize: '1.25rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {title}
      </h4>

      {/* 1. TECHNICAL METRICS FIRST */}
      <div style={{
        background: 'var(--mr-bg-base)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.25rem',
        border: '1px solid var(--mr-border)'
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: 'var(--mr-text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {Object.entries(metrics).map(([key, value]) => {
            if (key === 'status') return null

            // Format key names with correct capitalization
            let formattedKey = key

            // Handle specific cases first
            if (key === 'headroom_dbfs') {
              formattedKey = 'Headroom dBFS'
            } else if (key === 'true_peak_dbtp') {
              formattedKey = 'True Peak dBTP'
            } else if (key === 'plr' || key === 'dr_lu') {
              formattedKey = 'PLR'
            } else if (key === 'balance_l_r' || key === 'balance_lr') {
              formattedKey = 'Balance L/R'
            } else if (key === 'ms_ratio') {
              formattedKey = lang === 'es' ? 'Relación M/S' : 'M/S Ratio'
            } else if (key === 'correlation') {
              formattedKey = lang === 'es' ? 'Correlación' : 'Correlation'
            } else if (key === 'lufs') {
              formattedKey = 'LUFS'
            } else if (key === 'crest_factor_db') {
              formattedKey = lang === 'es' ? 'Factor de Cresta' : 'Crest Factor'
            } else {
              // Generic formatting for other keys
              formattedKey = key
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }

            // Format the value with proper signs and units
            let formattedValue: string
            if (typeof value === 'number') {
              if (key === 'balance_l_r' || key === 'balance_lr') {
                formattedValue = `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`
              } else {
                formattedValue = value.toFixed(2)
              }
            } else {
              formattedValue = String(value)
            }

            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{formattedKey}:</strong>
                <span>{formattedValue}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. INTERPRETATION TEXT SECOND */}
      <p style={{
        fontSize: '1rem',
        lineHeight: '1.7',
        marginBottom: '1.25rem',
        color: 'var(--mr-text-primary)'
      }}>
        {interpretation}
      </p>

      {/* 3. RECOMMENDATION THIRD */}
      <div style={{
        background: 'var(--mr-blue-bg)',
        borderLeft: '4px solid var(--mr-blue)',
        padding: '0.75rem 1rem',
        borderRadius: '0.25rem'
      }}>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--mr-blue-text)',
          margin: 0,
          lineHeight: '1.6'
        }}>
          <strong>{lang === 'es' ? 'Recomendación' : 'Recommendation'}:</strong> {recommendation}
        </p>
      </div>
    </div>
  )
}
