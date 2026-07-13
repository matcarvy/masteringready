/**
 * MasteringReady - Supabase Client Configuration
 * Configuración del Cliente de Supabase
 *
 * This file provides Supabase client instances for both
 * client-side and server-side usage.
 *
 * Este archivo proporciona instancias del cliente Supabase
 * para uso tanto en cliente como en servidor.
 */

import { createClient } from '@supabase/supabase-js'
// Types are available in ./database.types for reference
// Los tipos están disponibles en ./database.types como referencia

// --- Environment Variables ---

// Use placeholder values at build time to prevent "supabaseUrl is required" error.
// createClient only validates non-empty strings; it doesn't connect at creation time.
// At runtime, real env vars are always available.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Lazy getter for factory functions (read env vars at call time, not module load)
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl

// --- Auth Storage Adapter ---

/**
 * Custom storage that delegates to localStorage or sessionStorage
 * based on the "remember device" preference.
 *
 * - No flag (default): localStorage → session persists across browser restarts
 * - Flag set: sessionStorage → session clears when browser closes
 */
const EPHEMERAL_FLAG = 'mr_session_ephemeral'

function isEphemeral(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(EPHEMERAL_FLAG) === 'true'
}

// Guard: only allow token removal during explicit signOut().
// GoTrueClient's internal _recoverAndRefresh() calls removeItem() on AbortError,
// which was deleting valid tokens on page reload (force or regular).
let _signOutInProgress = false
export function setSignOutInProgress(v: boolean) { _signOutInProgress = v }
export function isSignOutInProgress(): boolean { return _signOutInProgress }

const authStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    const preferred = isEphemeral() ? sessionStorage.getItem(key) : localStorage.getItem(key)
    if (preferred !== null) return preferred
    // Fallback: check the other storage (handles ephemeral flag changes between sessions)
    return isEphemeral() ? localStorage.getItem(key) : sessionStorage.getItem(key)
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    if (isEphemeral()) {
      sessionStorage.setItem(key, value)
    } else {
      localStorage.setItem(key, value)
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    // Only remove tokens during explicit signOut; block GoTrueClient's
    // internal cleanup that fires on AbortError during page reload
    if (!_signOutInProgress) return
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

/**
 * Set whether the current session should be ephemeral (not remembered).
 * Call BEFORE signIn so the session is stored in the correct place.
 */
export function setRememberDevice(remember: boolean): void {
  if (typeof window === 'undefined') return
  if (remember) {
    localStorage.removeItem(EPHEMERAL_FLAG)
  } else {
    localStorage.setItem(EPHEMERAL_FLAG, 'true')
  }
}

/**
 * Check if "remember device" is currently enabled.
 */
export function getRememberDevice(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(EPHEMERAL_FLAG) !== 'true'
}

// --- Client-Side Supabase Client ---

/**
 * Supabase client for browser usage (React components)
 * Cliente Supabase para uso en navegador (componentes React)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
    // @ts-expect-error; prevent Navigator Lock from blocking all session access during long operations (compression, analysis)
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => await fn(),
  }
})

/**
 * Create a fresh Supabase client for isolated queries.
 * Use this in pages that navigate from the analyzer; the shared singleton
 * can have stale internal state (auth locks, pending requests) that causes
 * queries to hang on SPA navigation.
 *
 * Cached per access_token to prevent Multiple GoTrueClient instances.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type varies by generics; caching requires any
let _cachedFreshClient: any = null
let _cachedAccessToken: string | null = null

export async function createFreshQueryClient(sessionTokens?: { access_token: string; refresh_token: string }) {
  let tokens = sessionTokens
  if (!tokens) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    tokens = { access_token: session.access_token, refresh_token: session.refresh_token }
  }

  // Reuse cached client if same access_token (prevents GoTrueClient accumulation)
  if (_cachedFreshClient && _cachedAccessToken === tokens.access_token) {
    return _cachedFreshClient
  }

  const fresh = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'sb-fresh-query-token',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GoTrueClient lock shim requires any cast to bypass internal type mismatch
      lock: (async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn()) as any,
    }
  })
  await fresh.auth.setSession(tokens)
  _cachedFreshClient = fresh
  _cachedAccessToken = tokens.access_token
  return fresh
}

// --- Admin Client ---

/**
 * Create an admin Supabase client with service role key
 * Crear un cliente Supabase admin con clave de rol de servicio
 *
 * WARNING: Only use on the server! Never expose service role key to client.
 * ADVERTENCIA: ¡Solo usar en el servidor! Nunca exponer la clave de servicio al cliente.
 */
export function createAdminSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. This function should only be called server-side.\n' +
      'Falta SUPABASE_SERVICE_ROLE_KEY. Esta función solo debe llamarse en el servidor.'
    )
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

/**
 * Analysis status result from database function
 */
export interface AnalysisStatus {
  can_analyze: boolean
  reason: string
  analyses_used: number
  analyses_limit: number
  is_lifetime: boolean
}

/**
 * Check if user can perform analysis (within limits)
 * Returns detailed status including reason and limits
 * Verificar si el usuario puede realizar análisis (dentro de límites)
 */
export async function checkCanAnalyze(attempt = 1, sessionTokens?: { access_token: string; refresh_token: string }): Promise<AnalysisStatus> {
  try {
    // Use fresh client when session tokens provided (avoids GoTrueClient lock contention on singleton)
    const client = sessionTokens ? await createFreshQueryClient(sessionTokens) : null
    const effectiveClient = client || supabase

    const { data: { user }, error: userError } = await effectiveClient.auth.getUser()

    if (userError || !user) {
      // Anonymous users can analyze (tracked differently via IP)
      return {
        can_analyze: true,
        reason: 'ANONYMOUS',
        analyses_used: 0,
        analyses_limit: 1,
        is_lifetime: false
      }
    }

    const { data, error } = await effectiveClient.rpc('can_user_analyze', {
      p_user_id: user.id
    })

    if (error) {
      return {
        can_analyze: false,
        reason: 'ERROR',
        analyses_used: 0,
        analyses_limit: 0,
        is_lifetime: false
      }
    }

    // The function returns an array with one row
    const result = Array.isArray(data) ? data[0] : data
    return result || {
      can_analyze: false,
      reason: 'NO_DATA',
      analyses_used: 0,
      analyses_limit: 0,
      is_lifetime: false
    }
  } catch (err) {
    // GoTrueClient abort; retry once after short delay
    if (attempt < 2 && err instanceof DOMException && (err as DOMException).name === 'AbortError') {
      await new Promise(r => setTimeout(r, 500))
      return checkCanAnalyze(attempt + 1)
    }
    return {
      can_analyze: false,
      reason: 'ERROR',
      analyses_used: 0,
      analyses_limit: 0,
      is_lifetime: false
    }
  }
}

/**
 * User analysis status for dashboard display
 */
export interface UserDashboardStatus {
  plan_type: string
  plan_name: string
  is_lifetime: boolean
  analyses_used: number
  analyses_limit: number
  addon_remaining: number
  addon_packs_available: number
  can_analyze: boolean
  subscription_status: string
  current_period_end: string | null
  purchased_remaining: number
}
