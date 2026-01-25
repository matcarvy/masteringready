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
  signOut: async () => {}
})

// ============================================================================
// PROVIDER / PROVEEDOR
// ============================================================================

// Save pending analysis from localStorage to database
async function savePendingAnalysis(userId: string) {
  try {
    const pendingData = localStorage.getItem('pendingAnalysis')
    if (!pendingData) return

    const analysis = JSON.parse(pendingData)

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
      return
    }

    // Update profile counters
    await supabase.rpc('increment_analysis_count', { p_user_id: userId })

    // Clear localStorage
    localStorage.removeItem('pendingAnalysis')
    console.log('Pending analysis saved successfully')

  } catch (err) {
    console.error('Error processing pending analysis:', err)
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

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
          savePendingAnalysis(session.user.id)
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
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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
