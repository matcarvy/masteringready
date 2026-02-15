'use client'

/**
 * ThemeToggle — Sun/Moon toggle button
 * =====================================
 * Placed next to language toggle in headers.
 * Toggles between light and dark. Long-press or settings page for 'system'.
 */

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'

interface ThemeToggleProps {
  lang?: 'es' | 'en'
}

export function ThemeToggle({ lang = 'es' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

  const handleClick = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      onClick={handleClick}
      aria-label={lang === 'es'
        ? (isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro')
        : (isDark ? 'Switch to light mode' : 'Switch to dark mode')
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--mr-text-secondary)',
        transition: 'color 0.2s, background 0.2s',
        padding: 0,
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--mr-bg-hover)'
        e.currentTarget.style.color = 'var(--mr-text-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--mr-text-secondary)'
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default ThemeToggle
