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

// ============================================================================
// ENVIRONMENT VARIABLES / VARIABLES DE ENTORNO
// ============================================================================

// Use placeholder values at build time to prevent "supabaseUrl is required" error.
// createClient only validates non-empty strings — it doesn't connect at creation time.
// At runtime, real env vars are always available.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Lazy getters for factory functions (read env vars at call time, not module load)
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey

// ============================================================================
// AUTH STORAGE ADAPTER / ADAPTADOR DE ALMACENAMIENTO DE AUTH
// ============================================================================

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

// One-time recovery: if iOS Safari evicted localStorage under memory pressure
// but sessionStorage still has the auth token (tab stayed alive), copy it back.
// Runs once on module load, BEFORE Supabase client is created.
function recoverEvictedSession(): void {
  if (typeof window === 'undefined') return
  if (isEphemeral()) return
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        if (!localStorage.getItem(key)) {
          const val = sessionStorage.getItem(key)
          if (val) localStorage.setItem(key, val)
        }
      }
    }
  } catch { /* ignore */ }
}
recoverEvictedSession()

const authStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    // Read from primary storage only — recovery already ran on module load
    return isEphemeral() ? sessionStorage.getItem(key) : localStorage.getItem(key)
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    if (isEphemeral()) {
      sessionStorage.setItem(key, value)
    } else {
      // Write to BOTH storages. sessionStorage is a hot backup in case
      // iOS Safari evicts localStorage while the tab is backgrounded.
      // On next page load, recoverEvictedSession() copies it back.
      localStorage.setItem(key, value)
      try { sessionStorage.setItem(key, value) } catch { /* quota or private mode */ }
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
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

// ============================================================================
// CLIENT-SIDE SUPABASE CLIENT / CLIENTE SUPABASE PARA NAVEGADOR
// ============================================================================

/**
 * Supabase client for browser usage (React components)
 * Cliente Supabase para uso en navegador (componentes React)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage
  }
})

/**
 * Create a fresh Supabase client for isolated queries.
 * Use this in pages that navigate from the analyzer — the shared singleton
 * can have stale internal state (auth locks, pending requests) that causes
 * queries to hang on SPA navigation.
 *
 * Cached per access_token to prevent Multiple GoTrueClient instances.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    auth: { persistSession: false, autoRefreshToken: false }
  })
  await fresh.auth.setSession(tokens)
  _cachedFreshClient = fresh
  _cachedAccessToken = tokens.access_token
  return fresh
}

// ============================================================================
// SERVER-SIDE SUPABASE CLIENT / CLIENTE SUPABASE PARA SERVIDOR
// ============================================================================

/**
 * Create a Supabase client for server-side usage
 * Crear un cliente Supabase para uso en servidor
 *
 * Use this in:
 * - API routes
 * - Server components
 * - getServerSideProps
 *
 * Usar esto en:
 * - Rutas de API
 * - Componentes de servidor
 * - getServerSideProps
 */
export function createServerSupabaseClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

// ============================================================================
// ADMIN CLIENT (for backend operations) / CLIENTE ADMIN (para operaciones backend)
// ============================================================================

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

// ============================================================================
// AUTH HELPERS / AYUDANTES DE AUTENTICACIÓN
// ============================================================================

/**
 * Get current user session
 * Obtener sesión del usuario actual
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting user / Error obteniendo usuario:', error)
    return null
  }

  return user
}

/**
 * Get current user's profile
 * Obtener perfil del usuario actual
 */
export async function getCurrentProfile() {
  const user = await getCurrentUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error getting profile / Error obteniendo perfil:', error)
    return null
  }

  return profile
}

/**
 * Get user's current subscription with plan details
 * Obtener suscripción actual del usuario con detalles del plan
 */
export async function getCurrentSubscription() {
  const user = await getCurrentUser()

  if (!user) return null

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (error) {
    console.error('Error getting subscription / Error obteniendo suscripción:', error)
    return null
  }

  return subscription
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
export async function checkCanAnalyze(): Promise<AnalysisStatus> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      // Anonymous users can analyze (tracked differently via IP)
      return {
        can_analyze: true,
        reason: 'ANONYMOUS',
        analyses_used: 0,
        analyses_limit: 1,
        is_lifetime: false
      }
    }

    const { data, error } = await supabase.rpc('can_user_analyze', {
      p_user_id: user.id
    })

    if (error) {
      console.error('Error checking analysis limit:', error)
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
    console.error('checkCanAnalyze threw unexpectedly:', err)
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
 * Legacy function for backwards compatibility
 * @deprecated Use checkCanAnalyze() instead
 */
export async function canUserAnalyze(): Promise<boolean> {
  const status = await checkCanAnalyze()
  return status.can_analyze
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
}

/**
 * Get complete user analysis status for dashboard
 * Obtener estado completo de análisis del usuario para dashboard
 */
export async function getUserAnalysisStatus(): Promise<UserDashboardStatus | null> {
  const user = await getCurrentUser()

  if (!user) return null

  const { data, error } = await supabase.rpc('get_user_analysis_status', {
    p_user_id: user.id
  })

  if (error) {
    console.error('Error getting user status:', error)
    return null
  }

  // The function returns an array with one row
  const result = Array.isArray(data) ? data[0] : data
  return result || null
}

/**
 * Get user's available single purchases (unused)
 * Obtener compras individuales disponibles del usuario
 */
export async function getAvailablePurchases() {
  const user = await getCurrentUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'succeeded')
    .gt('analyses_granted', supabase.rpc('coalesce', { col: 'analyses_used', default_val: 0 }))

  if (error) {
    // Fallback query without the comparison
    const { data: fallbackData } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'succeeded')

    return (fallbackData || []).filter((p: { analyses_granted: number; analyses_used: number }) =>
      p.analyses_granted > (p.analyses_used || 0)
    )
  }

  return data || []
}

/**
 * Check if Pro user can buy addon pack
 * Verificar si usuario Pro puede comprar paquete adicional
 */
export async function checkCanBuyAddon(): Promise<{
  can_buy: boolean
  reason: string
  packs_this_cycle: number
  max_packs: number
}> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      can_buy: false,
      reason: 'NOT_LOGGED_IN',
      packs_this_cycle: 0,
      max_packs: 0
    }
  }

  const { data, error } = await supabase.rpc('can_buy_addon', {
    p_user_id: user.id
  })

  if (error) {
    console.error('Error checking addon eligibility:', error)
    return {
      can_buy: false,
      reason: 'ERROR',
      packs_this_cycle: 0,
      max_packs: 2
    }
  }

  const result = Array.isArray(data) ? data[0] : data
  return result || {
    can_buy: false,
    reason: 'NO_DATA',
    packs_this_cycle: 0,
    max_packs: 2
  }
}

// ============================================================================
// ANALYSIS HELPERS / AYUDANTES DE ANÁLISIS
// ============================================================================

/**
 * Save analysis to database
 * Guardar análisis en la base de datos
 */
export async function saveAnalysis(analysisData: {
  filename: string
  score: number
  verdict: 'ready' | 'almost_ready' | 'needs_work' | 'critical'
  metrics?: object
  interpretations?: object
  report_short?: string
  report_write?: string
  report_visual?: string
  lang?: 'es' | 'en'
  strict_mode?: boolean
  file_size_bytes?: number
  duration_seconds?: number
  sample_rate?: number
  bit_depth?: number
  channels?: number
  processing_time_seconds?: number
}) {
  const user = await getCurrentUser()

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: user?.id || null,
      filename: analysisData.filename,
      score: analysisData.score,
      verdict: analysisData.verdict,
      metrics: analysisData.metrics || null,
      interpretations: analysisData.interpretations || null,
      report_short: analysisData.report_short || null,
      report_write: analysisData.report_write || null,
      report_visual: analysisData.report_visual || null,
      lang: analysisData.lang || 'es',
      strict_mode: analysisData.strict_mode || false,
      file_size_bytes: analysisData.file_size_bytes || null,
      duration_seconds: analysisData.duration_seconds || null,
      sample_rate: analysisData.sample_rate || null,
      bit_depth: analysisData.bit_depth || null,
      channels: analysisData.channels || null,
      processing_time_seconds: analysisData.processing_time_seconds || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving analysis / Error guardando análisis:', error)
    throw error
  }

  // Increment user's analysis count if logged in
  // Incrementar contador de análisis del usuario si está logueado
  if (user) {
    const { data: incrementResult } = await supabase.rpc('increment_analysis_count', { p_user_id: user.id })
    // incrementResult contains { success: boolean, source: 'free' | 'pro' | 'addon' | 'single' }
    console.log('Analysis count incremented:', incrementResult)
  }

  return data
}

/**
 * Use a single purchase credit for analysis
 * Usar un crédito de compra individual para análisis
 */
export async function useSinglePurchase(purchaseId: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) return false

  const { data, error } = await supabase.rpc('use_single_purchase', {
    p_user_id: user.id,
    p_purchase_id: purchaseId
  })

  if (error) {
    console.error('Error using single purchase:', error)
    return false
  }

  return data ?? false
}

/**
 * Get user's analysis history
 * Obtener historial de análisis del usuario
 */
export async function getAnalysisHistory(limit = 20) {
  const user = await getCurrentUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error getting history / Error obteniendo historial:', error)
    return []
  }

  return data
}

// ============================================================================
// FEEDBACK HELPERS / AYUDANTES DE RETROALIMENTACIÓN
// ============================================================================

/**
 * Submit user feedback
 * Enviar retroalimentación de usuario
 */
export async function submitFeedback(feedbackData: {
  subject: string
  message: string
  category?: 'bug' | 'feature' | 'improvement' | 'praise' | 'question' | 'other'
  lang?: 'es' | 'en'
  satisfaction?: '1' | '2' | '3' | '4' | '5'
  analysis_id?: string
  contact_email?: string
  wants_response?: boolean
}) {
  const user = await getCurrentUser()

  const { data, error } = await supabase
    .from('user_feedback')
    .insert({
      user_id: user?.id || null,
      subject: feedbackData.subject,
      message: feedbackData.message,
      category: feedbackData.category || 'other',
      lang: feedbackData.lang || 'es',
      satisfaction: feedbackData.satisfaction || null,
      analysis_id: feedbackData.analysis_id || null,
      contact_email: feedbackData.contact_email || null,
      wants_response: feedbackData.wants_response || false,
      source: 'web_app',
      page_url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting feedback / Error enviando retroalimentación:', error)
    throw error
  }

  return data
}

/**
 * Get public feature requests
 * Obtener solicitudes de funciones públicas
 */
export async function getPublicFeatureRequests(limit = 20) {
  const { data, error } = await supabase
    .from('public_feature_requests')
    .select('*')
    .limit(limit)

  if (error) {
    console.error('Error getting feature requests / Error obteniendo solicitudes:', error)
    return []
  }

  return data
}

/**
 * Vote on a feature request
 * Votar en una solicitud de función
 */
export async function voteOnFeature(feedbackId: string, voteType: 'upvote' | 'downvote' = 'upvote') {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Must be logged in to vote / Debe iniciar sesión para votar')
  }

  // Upsert vote (update if exists, insert if not)
  const { data, error } = await supabase
    .from('feedback_votes')
    .upsert({
      feedback_id: feedbackId,
      user_id: user.id,
      vote_type: voteType
    }, {
      onConflict: 'feedback_id,user_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error voting / Error votando:', error)
    throw error
  }

  return data
}

// ============================================================================
// PLANS HELPER / AYUDANTE DE PLANES
// ============================================================================

/**
 * Get all active plans
 * Obtener todos los planes activos
 */
export async function getPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error getting plans / Error obteniendo planes:', error)
    return []
  }

  return data
}
