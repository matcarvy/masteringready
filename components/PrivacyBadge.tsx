'use client'

import { useState } from 'react'
import { ShieldCheck, Info } from 'lucide-react'
import Link from 'next/link'

interface PrivacyBadgeProps {
  lang?: 'es' | 'en'
  variant?: 'full' | 'compact' | 'inline'
}

const translations = {
  es: {
    title: 'Privacidad Primero',
    shortText: 'Tu audio se analiza solo en memoria y se elimina inmediatamente.',
    tooltip: {
      title: 'Tu privacidad es nuestra prioridad',
      points: [
        'Los archivos se procesan en memoria (RAM)',
        'Se eliminan automáticamente después del análisis',
        'Nunca guardamos copias de tu audio',
        'Solo almacenamos los resultados del análisis'
      ],
      learnMore: 'Más información'
    }
  },
  en: {
    title: 'Privacy First',
    shortText: 'Your audio is analyzed in memory only and deleted immediately.',
    tooltip: {
      title: 'Your privacy is our priority',
      points: [
        'Files are processed in memory (RAM)',
        'Automatically deleted after analysis',
        'We never store copies of your audio',
        'We only save the analysis results'
      ],
      learnMore: 'Learn more'
    }
  }
}

export default function PrivacyBadge({ lang = 'es', variant = 'full' }: PrivacyBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const t = translations[lang]

  // Inline variant - used in upload area
  if (variant === 'inline') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#f0fdf4',
          borderRadius: '0.5rem',
          border: '1px solid #86efac',
          position: 'relative'
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <ShieldCheck size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
        <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0 }}>
          {t.shortText}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowTooltip(!showTooltip)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label={t.tooltip.learnMore}
        >
          <Info size={14} style={{ color: '#16a34a' }} />
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              borderRadius: '0.75rem',
              padding: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
              width: '280px',
              zIndex: 100,
              textAlign: 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <ShieldCheck size={18} style={{ color: '#16a34a' }} />
              <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.875rem' }}>
                {t.tooltip.title}
              </span>
            </div>
            <ul style={{
              margin: '0 0 0.75rem 0',
              padding: '0 0 0 1.25rem',
              listStyleType: 'disc'
            }}>
              {t.tooltip.points.map((point, i) => (
                <li key={i} style={{
                  fontSize: '0.8rem',
                  color: '#4b5563',
                  marginBottom: '0.25rem',
                  lineHeight: '1.4'
                }}>
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/privacy"
              style={{
                fontSize: '0.75rem',
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {t.tooltip.learnMore} →
            </Link>
            {/* Arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '12px',
              height: '12px',
              background: 'white',
              borderRight: '1px solid #e5e7eb',
              borderBottom: '1px solid #e5e7eb'
            }} />
          </div>
        )}
      </div>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        background: '#f0fdf4',
        borderRadius: '9999px',
        border: '1px solid #86efac'
      }}>
        <ShieldCheck size={14} style={{ color: '#16a34a' }} />
        <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '500' }}>
          {t.title}
        </span>
      </div>
    )
  }

  // Full variant (default)
  return (
    <div style={{
      background: '#f0fdf4',
      border: '1px solid #86efac',
      borderRadius: '0.75rem',
      padding: '1rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <ShieldCheck size={20} style={{ color: '#16a34a' }} />
        <span style={{ fontWeight: '600', color: '#166534' }}>
          {t.title}
        </span>
      </div>
      <p style={{ fontSize: '0.875rem', color: '#15803d', margin: 0, lineHeight: '1.5' }}>
        {t.shortText}
      </p>
      <Link
        href="/privacy"
        style={{
          display: 'inline-block',
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#667eea',
          textDecoration: 'none'
        }}
      >
        {t.tooltip.learnMore} →
      </Link>
    </div>
  )
}
