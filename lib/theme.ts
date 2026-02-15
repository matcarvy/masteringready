'use client'

/**
 * Theme System for MasteringReady
 * ================================
 * Supports 3-way preference: 'system' | 'light' | 'dark'
 * - 'system' follows OS prefers-color-scheme
 * - 'light' / 'dark' are manual overrides
 * - Persists to localStorage('mr-theme')
 * - Sets data-theme attribute on <html> for CSS variable switching
 */

import { useState, useEffect, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  /** User's preference: 'system', 'light', or 'dark' */
  theme: ThemePreference
  /** Actual applied theme after resolving system preference */
  resolvedTheme: ResolvedTheme
  /** Update theme preference */
  setTheme: (theme: ThemePreference) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'mr-theme'

// ============================================================================
// HELPERS
// ============================================================================

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme()
  return preference
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolved)
}

function getSavedPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

// ============================================================================
// HOOK
// ============================================================================

export function useTheme(): ThemeState {
  const [theme, setThemeState] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  // Initialize from localStorage on mount
  useEffect(() => {
    const saved = getSavedPreference()
    const resolved = resolveTheme(saved)
    setThemeState(saved)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  // Listen for OS theme changes when preference is 'system'
  useEffect(() => {
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }

    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((newTheme: ThemePreference) => {
    const resolved = resolveTheme(newTheme)
    setThemeState(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    localStorage.setItem(STORAGE_KEY, newTheme)
  }, [])

  return { theme, resolvedTheme, setTheme }
}
