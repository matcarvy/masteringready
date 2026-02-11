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
 * Detect language from timezone and browser settings (client-side).
 * Returns the cookie value if one exists; otherwise detects via
 * timezone → browser language → default English, and persists to cookie.
 */
export function detectLanguage(): Lang {
  // 1. Cookie (user's previous choice or previous detection)
  const cookie = getLanguageCookie()
  if (cookie) return cookie

  // 2. Timezone-based detection
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    const englishRegions = [
      'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage',
      'America/Honolulu', 'America/Toronto', 'America/Vancouver',
      'America/Montreal', 'America/Halifax', 'America/Winnipeg',
      'America/Edmonton'
    ]

    const portugueseRegions = [
      'America/Sao_Paulo', 'America/Rio_Branco', 'America/Manaus',
      'America/Belem', 'America/Fortaleza', 'America/Recife',
      'America/Bahia', 'America/Cuiaba', 'America/Campo_Grande',
      'America/Porto_Velho', 'America/Boa_Vista', 'America/Santarem',
      'America/Araguaina', 'America/Maceio', 'America/Noronha'
    ]

    const isEnglish = englishRegions.some(r => tz === r)
    const isPortuguese = portugueseRegions.some(r => tz === r)

    let detected: Lang = 'en'

    if (isEnglish || isPortuguese) {
      detected = 'en'
    } else {
      const spanishRegions = ['America/', 'Europe/Madrid', 'Atlantic/Canary', 'Africa/Ceuta']
      const isSpanish = spanishRegions.some(r => tz.startsWith(r))
      const browserLang = (typeof navigator !== 'undefined')
        ? (navigator.language || navigator.languages?.[0] || '')
        : ''
      const isSpanishLang = browserLang.toLowerCase().startsWith('es')

      detected = (isSpanish || isSpanishLang) ? 'es' : 'en'
    }

    setLanguageCookie(detected)
    return detected
  } catch {
    // If detection fails, fall back to browser language
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0]
      const detected: Lang = browserLang === 'es' ? 'es' : 'en'
      setLanguageCookie(detected)
      return detected
    }
    return 'es'
  }
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
