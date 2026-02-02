// Centralized bilingual error messages for analysis errors
// 6 standardized categories covering all user-facing error scenarios

export const ERROR_MESSAGES = {
  file_too_large: {
    es: 'El archivo es muy grande. El limite es 500MB. Intenta comprimir el audio o usa un formato mas ligero como MP3.',
    en: 'File is too large. The limit is 500MB. Try compressing the audio or use a lighter format like MP3.',
  },
  format_not_supported: {
    es: 'Este formato no es compatible. Por favor sube un archivo WAV, MP3, AIFF, AAC o M4A.',
    en: 'This format is not supported. Please upload a WAV, MP3, AIFF, AAC or M4A file.',
  },
  corrupt_file: {
    es: 'No pudimos leer este archivo. Puede estar corrupto o danado. Intenta exportarlo de nuevo desde tu DAW.',
    en: "We couldn't read this file. It may be corrupt or damaged. Try exporting it again from your DAW.",
  },
  timeout: {
    es: 'El analisis esta tardando mas de lo esperado. Esto puede pasar con archivos muy largos. Intenta de nuevo o prueba con un archivo mas corto.',
    en: 'The analysis is taking longer than expected. This can happen with very long files. Try again or use a shorter file.',
  },
  server_error: {
    es: 'Algo salio mal en nuestro servidor. Por favor intenta de nuevo en unos minutos. Si el problema persiste, escribenos a mat@matcarvy.com',
    en: 'Something went wrong on our server. Please try again in a few minutes. If the problem persists, contact us at mat@matcarvy.com',
  },
  offline: {
    es: 'Parece que perdiste la conexion. Verifica tu internet e intenta de nuevo.',
    en: 'It looks like you lost connection. Check your internet and try again.',
  },
} as const

export type ErrorCategory = keyof typeof ERROR_MESSAGES

/**
 * Classify an error into one of 6 categories based on its properties and message.
 * Priority order matters — more specific categories are checked first.
 */
export function classifyError(error: unknown): ErrorCategory {
  // Check if it's an AnalysisApiError with a pre-set category
  if (error && typeof error === 'object' && 'category' in error) {
    const cat = (error as { category: string }).category
    if (cat && cat in ERROR_MESSAGES) {
      return cat as ErrorCategory
    }
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  const name = error instanceof Error ? error.name : ''

  // 1. Offline / network errors
  if (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    name === 'TypeError' && (message.includes('fetch') || message.includes('network') || message.includes('load failed')) ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('network')
  ) {
    return 'offline'
  }

  // 2. Timeout
  if (
    name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('tardando m') ||
    message.includes('taking longer')
  ) {
    return 'timeout'
  }

  // 3. Corrupt / unreadable file
  if (
    message.includes('corrupto') ||
    message.includes('corrupt') ||
    message.includes('leyendo archivo') ||
    message.includes('cargando audio') ||
    message.includes('couldn\'t read') ||
    message.includes('no pudimos leer') ||
    message.includes('librosa') ||
    message.includes('soundfile') ||
    message.includes('demasiado corto') ||
    message.includes('too short') ||
    message.includes('archivo vac') ||
    message.includes('empty file') ||
    message.includes('comprimir el archivo') ||
    message.includes('compressing file')
  ) {
    return 'corrupt_file'
  }

  // 4. File too large
  if (
    message.includes('too large') ||
    message.includes('demasiado grande') ||
    message.includes('muy grande') ||
    message.includes('max') && message.includes('mb')
  ) {
    return 'file_too_large'
  }

  // 5. Format not supported
  if (
    message.includes('formato no soportado') ||
    message.includes('formato no es compatible') ||
    message.includes('format') && message.includes('not supported') ||
    message.includes('invalid file type') ||
    message.includes('formato no compatible')
  ) {
    return 'format_not_supported'
  }

  // 6. Server error (default fallback)
  return 'server_error'
}

/**
 * Get the appropriate bilingual error message for any error.
 * Classifies the error and returns the message in the specified language.
 */
export function getErrorMessage(error: unknown, lang: 'es' | 'en'): string {
  const category = classifyError(error)
  return ERROR_MESSAGES[category][lang]
}
