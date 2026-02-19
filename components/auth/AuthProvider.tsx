'use client'

/**
 * AuthProvider - Authentication Context
 * Proveedor de Autenticación - Contexto de Autenticación
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, setSignOutInProgress } from '@/lib/supabase'

// ============================================================================
// TYPES / TIPOS
// ============================================================================

type SaveAnalysisResult = 'saved' | 'quota_exceeded' | 'no_pending' | 'error'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  savePendingAnalysis: () => Promise<SaveAnalysisResult>
  pendingAnalysisQuotaExceeded: boolean
  clearPendingAnalysisQuotaExceeded: () => void
  pendingAnalysisSaved: boolean
  clearPendingAnalysisSaved: () => void
}

interface AuthProviderProps {
  children: ReactNode
}

// ============================================================================
// CONTEXT / CONTEXTO
// ============================================================================

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  savePendingAnalysis: async () => 'no_pending',
  pendingAnalysisQuotaExceeded: false,
  clearPendingAnalysisQuotaExceeded: () => {},
  pendingAnalysisSaved: false,
  clearPendingAnalysisSaved: () => {}
})

// ============================================================================
// PROVIDER / PROVEEDOR
// ============================================================================

// Map score to database verdict enum (deterministic, mirrors backend score_report)
function scoreToVerdictEnum(score: number): 'ready' | 'almost_ready' | 'needs_work' | 'critical' {
  if (score >= 85) return 'ready'
  if (score >= 60) return 'almost_ready'
  if (score >= 40) return 'needs_work'
  return 'critical'
}

// Save pending analysis from localStorage to database
async function savePendingAnalysisForUser(userId: string, userIsAdmin: boolean = false): Promise<SaveAnalysisResult> {
  try {
    const pendingData = localStorage.getItem('pendingAnalysis')
    if (!pendingData) {
      return 'no_pending'
    }

    // IMPORTANT: Remove from localStorage IMMEDIATELY to prevent race condition.
    // Both AuthProvider.onAuthStateChange and AuthModal.onSuccess can call this
    // concurrently — the first caller claims the data, the second finds nothing.
    localStorage.removeItem('pendingAnalysis')

    const analysis = JSON.parse(pendingData)

    // QUOTA CHECK: Verify user has remaining analyses before saving
    const { data: quotaData, error: quotaError } = await supabase.rpc('can_user_analyze', {
      p_user_id: userId
    })

    if (quotaError) {
      console.error('[SaveAnalysis] Quota check failed, DENYING save:', quotaError.message)
      return 'error'
    }

    const quotaResult = Array.isArray(quotaData) ? quotaData[0] : quotaData
    if (!quotaResult || !quotaResult.can_analyze) {
      return 'quota_exceeded'
    }

    // Prepare the insert data
    const mappedVerdict = scoreToVerdictEnum(analysis.score)

    // Handle report fields - API might return 'report' or specific fields
    const reportShort = analysis.report_short || analysis.report || null
    const reportWrite = analysis.report_write || analysis.report || null
    const reportVisual = analysis.report_visual || analysis.report_short || analysis.report || null

    // Extract file info from API response (stored in localStorage as part of analysis data)
    const fileInfo = analysis.file || {}
    const fileExtension = (analysis.filename || '').split('.').pop()?.toLowerCase() || null

    const insertData: Record<string, any> = {
      user_id: userId,
      filename: analysis.filename || 'Unknown',
      score: analysis.score,
      verdict: mappedVerdict,
      lang: analysis.lang || 'es',
      strict_mode: analysis.strict || false,
      report_mode: 'write',
      metrics: {
        metrics: analysis.metrics || [],
        metrics_bars: analysis.metrics_bars || null
      },
      interpretations: analysis.interpretations || null,
      report_short: reportShort,
      report_write: reportWrite,
      report_visual: reportVisual,
      created_at: analysis.created_at || new Date().toISOString(),
      // File metadata (from API response file object)
      file_size_bytes: fileInfo.size || null,
      file_format: fileExtension,
      duration_seconds: fileInfo.duration || null,
      sample_rate: fileInfo.sample_rate || null,
      bit_depth: fileInfo.bit_depth || null,
      channels: fileInfo.channels || null,
      // Analysis metadata
      processing_time_seconds: analysis.analysis_time_seconds || null,
      analysis_version: analysis.analysis_version || null,
      is_chunked_analysis: analysis.is_chunked_analysis || false,
      chunk_count: analysis.chunk_count || null,
      // Data capture fields
      spectral_6band: analysis.spectral_6band || null,
      energy_analysis: analysis.energy_analysis || null,
      categorical_flags: analysis.categorical_flags || null,
      // Client context
      client_timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      // Admin test flag
      is_test_analysis: userIsAdmin
    }

    // Save to analyses table
    const { data: insertedData, error } = await supabase
      .from('analyses')
      .insert(insertData)
      .select()

    if (error) {
      console.error('[SaveAnalysis] INSERT ERROR:', error.message, error.details, error.hint)
      return 'error'
    }

    // Update profile counters
    const { data: rpcData, error: rpcError } = await supabase.rpc('increment_analysis_count', { p_user_id: userId })

    if (rpcError) {
      console.error('[SaveAnalysis] RPC ERROR:', rpcError.message, rpcError.details)

      // Fallback: Direct profile update if RPC doesn't exist

      // First get current values
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_analyses, analyses_this_month')
        .eq('id', userId)
        .single()

      if (fetchError) {
        console.error('[SaveAnalysis] Profile fetch error:', fetchError.message)
      } else if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            total_analyses: (profile.total_analyses || 0) + 1,
            analyses_this_month: (profile.analyses_this_month || 0) + 1,
            last_analysis_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[SaveAnalysis] Profile update failed:', updateError.message)
        }
      }
    }

    return 'saved'

  } catch (err) {
    console.error('[SaveAnalysis] EXCEPTION:', err)
    return 'error'
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, _setIsAdmin] = useState(() => {
    // Hydrate from localStorage — survives GoTrueClient abort errors
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mr_is_admin') === 'true'
    }
    return false
  })
  // Only persist to localStorage on definitive answers — not on query failures
  const setIsAdmin = (val: boolean, definitive = true) => {
    if (!definitive && !val) return // Don't clear cache on failed/aborted queries
    _setIsAdmin(val)
    if (typeof window !== 'undefined') {
      if (val) localStorage.setItem('mr_is_admin', 'true')
      else localStorage.removeItem('mr_is_admin')
    }
  }
  const [pendingAnalysisQuotaExceeded, setPendingAnalysisQuotaExceeded] = useState(false)
  const [pendingAnalysisSaved, setPendingAnalysisSaved] = useState(false)

  const clearPendingAnalysisQuotaExceeded = () => setPendingAnalysisQuotaExceeded(false)
  const clearPendingAnalysisSaved = () => setPendingAnalysisSaved(false)

  // Exposed function to save pending analysis (can be called from components)
  const savePendingAnalysis = async (): Promise<SaveAnalysisResult> => {
    // Small delay to ensure auth state is settled after login
    await new Promise(resolve => setTimeout(resolve, 500))

    // Always fetch fresh user from supabase to ensure we have the latest
    const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Error getting user for save:', userError)
      return 'error'
    }

    if (freshUser) {
      const result = await savePendingAnalysisForUser(freshUser.id, isAdmin)

      if (result === 'saved') {
        setPendingAnalysisSaved(true)
      } else if (result === 'quota_exceeded' || result === 'error') {
        setPendingAnalysisQuotaExceeded(true)
      }

      return result
    } else {
      return 'error'
    }
  }

  useEffect(() => {
    // Supabase storage key — derived from project URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    let storageKey = 'sb-auth-token'
    try { storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token` } catch {}

    // Restore session from storage when GoTrueClient's internal state is cleared
    // (happens when _recoverAndRefresh fails with AbortError on page reload)
    const restoreFromStorage = async (): Promise<boolean> => {
      try {
        const raw = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey)
        if (!raw) return false
        const parsed = JSON.parse(raw)
        if (!parsed?.access_token || !parsed?.refresh_token) return false

        // Try official setSession first (validates + refreshes if needed)
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          })
          if (!error && data.session) {
            setSession(data.session)
            if (data.session.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', data.session.user.id)
                .single()
              setIsAdmin(profile?.is_admin === true, profile !== null)
            }
            setUser(data.session.user ?? null)
            return true
          }
        } catch {
          // setSession failed (AbortError during refresh) — fall through to manual restore
        }

        // Manual restore: decode JWT and set user state directly.
        // The token may be expired but user will see logged-in state.
        // First API call will trigger a proper refresh or re-login.
        try {
          const payload = JSON.parse(atob(parsed.access_token.split('.')[1]))
          if (payload?.sub) {
            const manualUser = {
              id: payload.sub,
              email: payload.email || '',
              app_metadata: payload.app_metadata || {},
              user_metadata: payload.user_metadata || {},
              aud: payload.aud || 'authenticated',
              created_at: '',
            } as any
            const manualSession = {
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
              expires_at: parsed.expires_at || 0,
              expires_in: 0,
              token_type: 'bearer',
              user: manualUser,
            } as any
            setSession(manualSession)
            // Load admin from localStorage cache (profile query may also fail)
            const cachedAdmin = localStorage.getItem('mr_is_admin') === 'true'
            setIsAdmin(cachedAdmin, false)
            setUser(manualUser)
            return true
          }
        } catch {
          // JWT decode failed
        }

        return false
      } catch {
        return false
      }
    }

    // Get initial session / Obtener sesión inicial
    const getSession = async (attempt = 1) => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
        }

        // GoTrueClient returned null but tokens may still be in storage
        // (internal state cleared by failed _recoverAndRefresh, our removeItem guard kept tokens)
        if (!session) {
          const restored = await restoreFromStorage()
          if (restored) return
        }

        if (!error) {
          setSession(session)

          // Load admin status BEFORE setting user and clearing loading
          // — prevents race condition where page.tsx renders with user but isAdmin=false
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single()
            // Only update if query succeeded (profile !== null) — don't clear cache on abort
            setIsAdmin(profile?.is_admin === true, profile !== null)
          }

          setUser(session?.user ?? null)
        }
      } catch (err) {
        // GoTrueClient abort — retry up to 3 times with increasing delay
        if (attempt < 3 && err instanceof DOMException && err.name === 'AbortError') {
          await new Promise(r => setTimeout(r, attempt * 500))
          return getSession(attempt + 1)
        }
        console.error('Auth error:', err)
        // Last resort: restore from storage directly
        const restored = await restoreFromStorage()
        if (!restored) {
          // Truly failed — page renders as logged out, user can click Sign In
        }
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes / Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION with null session = GoTrueClient init failed (AbortError).
        // Don't clear user state — let getSession()/restoreFromStorage() handle it.
        // Only SIGNED_OUT should explicitly clear the user.
        if (event === 'INITIAL_SESSION' && !session) {
          return
        }

        setSession(session)

        // For SIGNED_IN/USER_UPDATED, defer setUser until after admin status is loaded
        // — prevents race condition where page.tsx renders with user but isAdmin=false
        if (!((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user)) {
          setUser(session?.user ?? null)
          setLoading(false)
        }

        // Ensure profile + subscription exist on sign in (handles trigger bypass)
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          const u = session.user
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, is_admin')
            .eq('id', u.id)
            .single()

          if (!existingProfile) {
            // Read UTM attribution from sessionStorage (captured on landing page)
            let utmData: Record<string, string | null> = {}
            try {
              const utmRaw = sessionStorage.getItem('mr_utm')
              if (utmRaw) {
                utmData = JSON.parse(utmRaw)
                sessionStorage.removeItem('mr_utm')
              }
            } catch { /* ignore */ }

            // Create profile
            await supabase.from('profiles').insert({
              id: u.id,
              email: u.email || '',
              full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
              avatar_url: u.user_metadata?.avatar_url || null,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '1.0',
              ...(utmData.utm_source ? {
                utm_source: utmData.utm_source,
                utm_medium: utmData.utm_medium,
                utm_campaign: utmData.utm_campaign,
                utm_content: utmData.utm_content,
                utm_term: utmData.utm_term,
              } : {})
            })

            // Anti-abuse: Check if this email was previously deleted
            // Carry over lifetime usage so users can't delete/recreate for fresh free analyses
            const { data: deletedRecord } = await supabase
              .from('deleted_accounts')
              .select('analyses_lifetime_used, total_analyses')
              .eq('email', u.email || '')
              .order('deleted_at', { ascending: false })
              .limit(1)
              .single()

            if (deletedRecord && deletedRecord.analyses_lifetime_used > 0) {
              await supabase
                .from('profiles')
                .update({
                  analyses_lifetime_used: deletedRecord.analyses_lifetime_used,
                  total_analyses: deletedRecord.total_analyses || 0
                })
                .eq('id', u.id)
            }

            // Create free subscription
            const { data: freePlan } = await supabase
              .from('plans')
              .select('id')
              .eq('type', 'free')
              .single()

            if (freePlan) {
              await supabase.from('subscriptions').insert({
                user_id: u.id,
                plan_id: freePlan.id,
                current_period_end: new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString()
              })
            }
          }

          // Set admin status from profile, THEN set user — so page.tsx useEffects
          // see isAdmin=true on their first run (prevents purchase modal flash)
          const adminStatus = existingProfile?.is_admin === true
          setIsAdmin(adminStatus, existingProfile !== null)
          setUser(session?.user ?? null)
          setLoading(false)

          // Check for pending analysis after login/signup
          const saveResult = await savePendingAnalysisForUser(u.id, adminStatus)
          if (saveResult === 'saved') {
            setPendingAnalysisSaved(true)
          } else if (saveResult === 'quota_exceeded' || saveResult === 'error') {
            // Both quota exhausted and RPC errors must clear results
            // — never show unpaid analysis results on failure
            setPendingAnalysisQuotaExceeded(true)
          }

          // Link anonymous analyses to this user (fire-and-forget)
          try {
            const anonSessionId = typeof window !== 'undefined' ? sessionStorage.getItem('mr_anon_session') : null
            if (anonSessionId) {
              supabase.from('anonymous_analyses')
                .update({ converted_to_user: true, user_id: u.id })
                .eq('session_id', anonSessionId)
                .eq('converted_to_user', false)
                .then(() => {
                  sessionStorage.removeItem('mr_anon_session')
                })
            }
          } catch {
            // Non-blocking
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sign out function / Función de cerrar sesión
  // Clear state immediately for instant UI response (hamburger, menus)
  // then revoke session in background
  const signOut = async () => {
    setUser(null)
    setSession(null)
    setIsAdmin(false)
    setSignOutInProgress(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setSignOutInProgress(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut, savePendingAnalysis, pendingAnalysisQuotaExceeded, clearPendingAnalysisQuotaExceeded, pendingAnalysisSaved, clearPendingAnalysisSaved }}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export default AuthProvider
