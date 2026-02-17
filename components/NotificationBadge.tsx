'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, BarChart3 } from 'lucide-react'

interface NotificationBadgeProps {
  lang: 'es' | 'en'
  isMobile: boolean
}

// Session storage key for notification
const NOTIF_KEY = 'mr_notif'

// Notification data shape
interface NotifData {
  type: 'analysis_ready' | 'has_analyses'
  message_es: string
  message_en: string
  href: string
}

/**
 * Set a notification (call from anywhere)
 */
export function setNotification(data: NotifData) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(NOTIF_KEY, JSON.stringify(data))
  }
}

/**
 * Clear the notification (call when user visits dashboard)
 */
export function clearNotification() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(NOTIF_KEY)
  }
}

/**
 * Check if a notification exists
 */
export function hasNotification(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(NOTIF_KEY) !== null
}

export function NotificationBadge({ lang, isMobile }: NotificationBadgeProps) {
  const router = useRouter()
  const [notif, setNotif] = useState<NotifData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Check sessionStorage on mount and listen for changes
  useEffect(() => {
    const check = () => {
      const raw = sessionStorage.getItem(NOTIF_KEY)
      if (raw) {
        try {
          const data = JSON.parse(raw) as NotifData
          setNotif(data)
          // Small delay for entrance animation
          requestAnimationFrame(() => setIsVisible(true))
        } catch {
          setNotif(null)
          setIsVisible(false)
        }
      } else {
        setNotif(null)
        setIsVisible(false)
      }
    }

    check()

    // Poll every 2s to catch notifications set by other code paths
    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [])

  if (!notif) return null

  const message = lang === 'es' ? notif.message_es : notif.message_en

  const handleClick = () => {
    clearNotification()
    setNotif(null)
    setIsVisible(false)
    router.push(notif.href)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsVisible(false)
    setTimeout(() => {
      clearNotification()
      setNotif(null)
    }, 200)
  }

  // Mobile: compact icon-only with dot indicator + X dismiss
  // Desktop: full pill with text + X dismiss
  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 0.2s ease'
      }}>
        <button
          onClick={handleClick}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            background: 'rgba(102, 126, 234, 0.15)',
            color: 'var(--mr-primary)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'background 0.15s',
            padding: 0
          }}
          aria-label={message}
        >
          <BarChart3 size={16} />
          {/* Notification dot */}
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '8px',
            height: '8px',
            background: '#667eea',
            borderRadius: '50%',
            border: '1.5px solid var(--mr-bg-card)'
          }} />
        </button>
        <button
          onClick={handleDismiss}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'rgba(102, 126, 234, 0.15)',
            border: 'none',
            color: 'var(--mr-primary)',
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.15s'
          }}
          aria-label={lang === 'es' ? 'Cerrar notificación' : 'Dismiss notification'}
        >
          <X size={10} />
        </button>
      </div>
    )
  }

  // Desktop: full pill with text
  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        background: 'rgba(102, 126, 234, 0.15)',
        color: 'var(--mr-primary)',
        border: '1px solid rgba(102, 126, 234, 0.3)',
        borderRadius: '9999px',
        padding: '0.35rem 0.6rem 0.35rem 0.75rem',
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.95)',
        minHeight: '32px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(102, 126, 234, 0.25)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)'
      }}
      aria-label={message}
    >
      <BarChart3 size={14} style={{ flexShrink: 0 }} />
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {message}
      </span>
      <span
        role="button"
        tabIndex={0}
        onClick={handleDismiss}
        onKeyDown={(e) => { if (e.key === 'Enter') handleDismiss(e as any) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'rgba(102, 126, 234, 0.2)',
          flexShrink: 0,
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'
        }}
        aria-label={lang === 'es' ? 'Cerrar notificación' : 'Dismiss notification'}
      >
        <X size={11} />
      </span>
    </button>
  )
}
