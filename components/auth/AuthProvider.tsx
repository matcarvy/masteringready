'use client'

/**
 * AuthProvider - Authentication Context
 * Proveedor de Autenticación - Contexto de Autenticación
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES / TIPOS
// ============================================================================

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  savePendingAnalysis: () => Promise<void>
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
  signOut: async () => {},
  savePendingAnalysis: async () => {}
})

// ============================================================================
// PROVIDER / PROVEEDOR
// ============================================================================

// Map human-readable verdict to database enum
function mapVerdictToEnum(verdict: string): 'ready' | 'almost_ready' | 'needs_work' | 'critical' {
  if (!verdict) return 'needs_work'

  const v = verdict.toLowerCase()

  // Ready / Listo
  if (v.includes('óptimo') || v.includes('optimo') || v.includes('listo') ||
      v.includes('ready') || v.includes('excellent') || v.includes('excelente')) {
    return 'ready'
  }

  // Almost ready / Casi listo
  if (v.includes('casi') || v.includes('almost') || v.includes('good') ||
      v.includes('bien') || v.includes('aceptable')) {
    return 'almost_ready'
  }

  // Critical
  if (v.includes('critical') || v.includes('crítico') || v.includes('critico') ||
      v.includes('serious') || v.includes('grave')) {
    return 'critical'
  }

  // Default: needs_work
  return 'needs_work'
}

// Save pending analysis from localStorage to database
async function savePendingAnalysisForUser(userId: string) {
  try {
    const pendingData = localStorage.getItem('pendingAnalysis')
    if (!pendingData) {
      console.log('[SaveAnalysis] No pending analysis in localStorage')
      return false
    }

    const analysis = JSON.parse(pendingData)
    console.log('[SaveAnalysis] Found pending analysis:', {
      userId,
      filename: analysis.filename,
      score: analysis.score,
      verdict: analysis.verdict,
      hasMetrics: !!analysis.metrics,
      hasInterpretations: !!analysis.interpretations,
      hasReportShort: !!analysis.report_short,
      hasReportWrite: !!analysis.report_write,
      hasReportVisual: !!analysis.report_visual,
      // Also check alternative field names
      hasReport: !!analysis.report,
      allKeys: Object.keys(analysis).join(', ')
    })

    // Prepare the insert data
    const mappedVerdict = mapVerdictToEnum(analysis.verdict)
    console.log('[SaveAnalysis] Mapped verdict:', analysis.verdict, '->', mappedVerdict)

    // Handle report fields - API might return 'report' or specific fields
    const reportShort = analysis.report_short || analysis.report || null
    const reportWrite = analysis.report_write || analysis.report || null
    const reportVisual = analysis.report_visual || analysis.report_short || analysis.report || null

    const insertData = {
      user_id: userId,
      filename: analysis.filename || 'Unknown',
      score: analysis.score,
      verdict: mappedVerdict,
      lang: analysis.lang || 'es',
      strict_mode: analysis.strict || false,
      report_mode: 'write',
      metrics: analysis.metrics || null,
      interpretations: analysis.interpretations || null,
      report_short: reportShort,
      report_write: reportWrite,
      report_visual: reportVisual,
      created_at: analysis.created_at || new Date().toISOString()
    }

    console.log('[SaveAnalysis] Report fields:', {
      report_short: reportShort ? reportShort.substring(0, 50) + '...' : null,
      report_write: reportWrite ? reportWrite.substring(0, 50) + '...' : null,
      report_visual: reportVisual ? reportVisual.substring(0, 50) + '...' : null
    })

    console.log('[SaveAnalysis] Inserting to analyses table...')

    // Save to analyses table
    const { data: insertedData, error } = await supabase
      .from('analyses')
      .insert(insertData)
      .select()

    if (error) {
      console.error('[SaveAnalysis] INSERT ERROR:', error.message, error.details, error.hint)
      return false
    }

    console.log('[SaveAnalysis] Insert successful:', insertedData)

    // Update profile counters
    console.log('[SaveAnalysis] Calling increment_analysis_count RPC...')
    const { data: rpcData, error: rpcError } = await supabase.rpc('increment_analysis_count', { p_user_id: userId })

    if (rpcError) {
      console.error('[SaveAnalysis] RPC ERROR:', rpcError.message, rpcError.details)

      // Fallback: Direct profile update if RPC doesn't exist
      console.log('[SaveAnalysis] Trying direct profile update as fallback...')

      // First get current values
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_analyses, analyses_this_month')
        .eq('id', userId)
        .single()

      if (fetchError) {
        console.error('[SaveAnalysis] Could not fetch profile:', fetchError.message)
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
        } else {
          console.log('[SaveAnalysis] Profile updated successfully via fallback')
        }
      }
    } else {
      console.log('[SaveAnalysis] RPC success:', rpcData)
    }

    // Clear localStorage
    localStorage.removeItem('pendingAnalysis')
    console.log('[SaveAnalysis] Complete! Cleared localStorage')
    return true

  } catch (err) {
    console.error('[SaveAnalysis] EXCEPTION:', err)
    return false
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Exposed function to save pending analysis (can be called from components)
  const savePendingAnalysis = async () => {
    console.log('savePendingAnalysis called, current user state:', user?.id)

    // Small delay to ensure auth state is settled after login
    await new Promise(resolve => setTimeout(resolve, 500))

    // Always fetch fresh user from supabase to ensure we have the latest
    const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Error getting user for save:', userError)
      return
    }

    if (freshUser) {
      console.log('Saving analysis for fresh user:', freshUser.id)
      const saved = await savePendingAnalysisForUser(freshUser.id)
      console.log('Analysis save result:', saved)
    } else {
      console.error('No user available to save pending analysis')
    }
  }

  useEffect(() => {
    // Get initial session / Obtener sesión inicial
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (err) {
        console.error('Auth error:', err)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes / Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Ensure profile + subscription exist on sign in (handles trigger bypass)
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          const u = session.user
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', u.id)
            .single()

          if (!existingProfile) {
            // Create profile
            await supabase.from('profiles').insert({
              id: u.id,
              email: u.email || '',
              full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
              avatar_url: u.user_metadata?.avatar_url || null
            })

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

          // Check for pending analysis after login/signup
          savePendingAnalysisForUser(u.id)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sign out function / Función de cerrar sesión
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, savePendingAnalysis }}>
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
