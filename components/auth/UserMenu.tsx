'use client'

/**
 * UserMenu - Header User Menu Component
 * Menú de Usuario para el Header
 *
 * Shows login button when logged out, user avatar + menu when logged in
 * Muestra botón de login cuando no hay sesión, avatar + menú cuando hay sesión
 */

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { User, LogOut, ChevronDown, History, CreditCard, Settings } from 'lucide-react'

// ============================================================================
// TYPES / TIPOS
// ============================================================================

interface UserMenuProps {
  lang?: 'es' | 'en'
  isMobile?: boolean
}

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    login: 'Iniciar Sesión',
    signUp: 'Registrarse',
    myAccount: 'Mis Análisis',
    history: 'Historial',
    subscription: 'Suscripción',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    loading: 'Cargando...'
  },
  en: {
    login: 'Sign In',
    signUp: 'Sign Up',
    myAccount: 'My Analyses',
    history: 'History',
    subscription: 'Subscription',
    settings: 'Settings',
    logout: 'Log out',
    loading: 'Loading...'
  }
}

// ============================================================================
// COMPONENT / COMPONENTE
// ============================================================================

export function UserMenu({ lang = 'es', isMobile = false }: UserMenuProps) {
  const { user, loading, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const t = translations[lang]

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Not logged in (or still loading — show login/signup as default to avoid blank flash)
  if (!user) {
    // On mobile, login/signup is handled by hamburger menu in page.tsx
    if (isMobile) return null

    // Desktop: show login/signup buttons
    return (
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Link
          href={`/auth/login?lang=${lang}`}
          style={{
            padding: '0.5rem 1rem',
            minWidth: '6.5rem',
            textAlign: 'center',
            color: 'var(--mr-text-secondary)',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: '500',
            borderRadius: '0.5rem',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--mr-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mr-text-secondary)'}
        >
          {t.login}
        </Link>
        <Link
          href={`/auth/signup?lang=${lang}`}
          style={{
            padding: '0.5rem 1rem',
            minWidth: '6rem',
            textAlign: 'center',
            background: 'var(--mr-bg-card)',
            color: 'var(--mr-primary)',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: '600',
            borderRadius: '0.5rem',
            border: '2px solid var(--mr-primary)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--mr-primary)'
            e.currentTarget.style.color = 'var(--mr-text-inverse)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--mr-bg-card)'
            e.currentTarget.style.color = 'var(--mr-primary)'
          }}
        >
          {t.signUp}
        </Link>
      </div>
    )
  }

  // Logged in - show user menu
  const avatarUrl = user.user_metadata?.avatar_url
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
  // Get actual initials (first letter of each word)
  const initials = displayName
    ?.split(' ')
    .map((word: string) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const handleLogout = async () => {
    setIsOpen(false)
    // Fire signOut in background (cleans server-side session)
    signOut().catch(() => {})
    // Clear local Supabase session immediately so redirected page sees no session
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })
    window.location.href = `/?lang=${lang}`
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: '9999px',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--mr-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            {initials}
          </div>
        )}

        {/* Name — hidden on mobile to save header space */}
        {!isMobile && (
          <span style={{
            color: 'var(--mr-text-primary)',
            fontSize: '0.875rem',
            fontWeight: '500',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {displayName}
          </span>
        )}

        <ChevronDown
          size={16}
          color="var(--mr-text-primary)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s'
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          right: 0,
          background: 'var(--mr-bg-card)',
          borderRadius: '0.75rem',
          boxShadow: 'var(--mr-shadow-lg)',
          minWidth: 'min(200px, 80vw)',
          overflow: 'hidden',
          zIndex: 50
        }}>
          {/* User Info Header */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--mr-border)'
          }}>
            <div style={{
              fontWeight: '600',
              color: 'var(--mr-text-primary)',
              marginBottom: '0.25rem'
            }}>
              {displayName}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--mr-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user.email}
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: '0.5rem 0' }}>
            {([
              { href: '/dashboard', icon: User, label: t.myAccount },
              { href: '/history', icon: History, label: t.history },
              { href: '/subscription', icon: CreditCard, label: t.subscription },
              { href: '/settings', icon: Settings, label: t.settings },
            ] as const).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  color: 'var(--mr-text-primary)',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--mr-bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <item.icon size={18} color="var(--mr-text-secondary)" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Logout */}
          <div style={{
            borderTop: '1px solid var(--mr-border)',
            padding: '0.5rem 0'
          }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                color: 'var(--mr-red)',
                background: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--mr-red-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={18} />
              {t.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
