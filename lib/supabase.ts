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
import { Database } from './database.types'

// ============================================================================
// ENVIRONMENT VARIABLES / VARIABLES DE ENTORNO
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables / Validar variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.\n' +
    'Faltan variables de entorno de Supabase. Por favor revisa tu archivo .env.local.'
  )
}

// ============================================================================
// CLIENT-SIDE SUPABASE CLIENT / CLIENTE SUPABASE PARA NAVEGADOR
// ============================================================================

/**
 * Supabase client for browser usage (React components)
 * Cliente Supabase para uso en navegador (componentes React)
 *
 * Use this in:
 * - React components
 * - Client-side hooks
 * - Browser-only code
 *
 * Usar esto en:
 * - Componentes React
 * - Hooks del lado del cliente
 * - Código solo para navegador
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

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
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
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
 * Check if user can perform analysis (within limits)
 * Verificar si el usuario puede realizar análisis (dentro de límites)
 */
export async function canUserAnalyze(): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    // Anonymous users can analyze (tracked differently)
    // Usuarios anónimos pueden analizar (rastreados de manera diferente)
    return true
  }

  const { data, error } = await supabase.rpc('can_user_analyze' as any, {
    p_user_id: user.id
  }) as { data: boolean | null; error: any }

  if (error) {
    console.error('Error checking analysis limit / Error verificando límite de análisis:', error)
    return false
  }

  return data ?? false
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
    await supabase.rpc('increment_analysis_count' as any, { p_user_id: user.id })
  }

  return data
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
