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

// Save pending analysis from localStorage to database
async function savePendingAnalysisForUser(userId: string) {
  try {
    const pendingData = localStorage.getItem('pendingAnalysis')
    if (!pendingData) {
      console.log('No pending analysis to save')
      return false
    }

    const analysis = JSON.parse(pendingData)
    console.log('Saving pending analysis for user:', userId, 'filename:', analysis.filename)

    // Save to analyses table
    const { error } = await supabase.from('analyses').insert({
      user_id: userId,
      filename: analysis.filename || 'Unknown',
      score: analysis.score,
      verdict: analysis.verdict?.toLowerCase().replace(/ /g, '_') || 'needs_work',
      lang: analysis.lang || 'es',
      strict_mode: analysis.strict || false,
      report_mode: 'write',
      metrics: analysis.metrics,
      interpretations: analysis.interpretations,
      report_short: analysis.report_short,
      report_write: analysis.report_write,
      report_visual: analysis.report_visual,
      created_at: analysis.created_at || new Date().toISOString()
    })

    if (error) {
      console.error('Error saving pending analysis:', error)
      return false
    }

    // Update profile counters
    const { error: rpcError } = await supabase.rpc('increment_analysis_count', { p_user_id: userId })
    if (rpcError) {
      console.error('Error incrementing analysis count:', rpcError)
    }

    // Clear localStorage
    localStorage.removeItem('pendingAnalysis')
    console.log('Pending analysis saved successfully!')
    return true

  } catch (err) {
    console.error('Error processing pending analysis:', err)
    return false
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Exposed function to save pending analysis (can be called from components)
  const savePendingAnalysis = async () => {
    const currentUser = user || (await supabase.auth.getUser()).data.user
    if (currentUser) {
      await savePendingAnalysisForUser(currentUser.id)
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

        // Check for pending analysis after login/signup
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          savePendingAnalysisForUser(session.user.id)
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
