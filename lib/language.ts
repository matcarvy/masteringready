/**
 * Language Persistence Utility
 * Utilidad de Persistencia de Idioma
 *
 * Cookie-based language persistence for both anonymous and logged-in users.
 * Golden rule: Language ONLY changes if user explicitly changes it.
 */

const LANG_COOKIE_NAME = 'mr-lang'
const LANG_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year in seconds

export type Lang = 'es' | 'en'

/**
 * Read language preference from cookie (client-side)
 */
export function getLanguageCookie(): Lang | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE_NAME}=([^;]+)`))
  const value = match?.[1]

  if (value === 'es' || value === 'en') return value
  return null
}

/**
 * Set language preference cookie (client-side)
 */
export function setLanguageCookie(lang: Lang): void {
  if (typeof document === 'undefined') return

  document.cookie = `${LANG_COOKIE_NAME}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`
}

/**
 * Read language from cookie header string (server-side, for route handlers)
 */
export function getLanguageFromCookieHeader(cookieHeader: string | null): Lang | null {
  if (!cookieHeader) return null

  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE_NAME}=([^;]+)`))
  const value = match?.[1]

  if (value === 'es' || value === 'en') return value
  return null
}
