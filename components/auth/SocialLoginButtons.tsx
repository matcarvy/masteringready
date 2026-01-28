'use client'

/**
 * SocialLoginButtons - OAuth Provider Buttons
 * Botones de Proveedores OAuth
 *
 * Supports / Soporta: Google, Facebook
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES / TIPOS
// ============================================================================

interface SocialLoginButtonsProps {
  lang?: 'es' | 'en'
  redirectTo?: string
  onError?: (error: string) => void
  onBeforeRedirect?: () => void
}

type Provider = 'google' | 'facebook'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    continueWith: 'Continuar con',
    loading: 'Conectando...',
    error: 'Error al conectar con'
  },
  en: {
    continueWith: 'Continue with',
    loading: 'Connecting...',
    error: 'Error connecting with'
  }
}

// ============================================================================
// PROVIDER CONFIGS / CONFIGURACIONES DE PROVEEDORES
// ============================================================================

const providers: { id: Provider; name: string; icon: JSX.Element; bgColor: string; textColor: string; hoverBg: string }[] = [
  {
    id: 'google',
    name: 'Google',
    bgColor: '#ffffff',
    textColor: '#374151',
    hoverBg: '#f3f4f6',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  },
  {
    id: 'facebook',
    name: 'Facebook',
    bgColor: '#1877F2',
    textColor: '#ffffff',
    hoverBg: '#166FE5',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  }
]

// ============================================================================
// COMPONENT / COMPONENTE
// ============================================================================

export function SocialLoginButtons({
  lang = 'es',
  redirectTo,
  onError,
  onBeforeRedirect
}: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)
  const t = translations[lang]

  const handleSocialLogin = async (provider: Provider) => {
    setLoadingProvider(provider)

    // Call onBeforeRedirect before OAuth redirect (for modal flow)
    onBeforeRedirect?.()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent'
          } : undefined
        }
      })

      if (error) {
        console.error(`${provider} login error:`, error)
        onError?.(`${t.error} ${provider}: ${error.message}`)
        setLoadingProvider(null)
      }
      // Note: If successful, user will be redirected
      // Nota: Si tiene éxito, el usuario será redirigido
    } catch (err) {
      console.error(`${provider} login error:`, err)
      onError?.(`${t.error} ${provider}`)
      setLoadingProvider(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => handleSocialLogin(provider.id)}
          disabled={loadingProvider !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            backgroundColor: provider.bgColor,
            color: provider.textColor,
            border: provider.id === 'google' ? '1px solid #d1d5db' : 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: loadingProvider ? 'not-allowed' : 'pointer',
            opacity: loadingProvider && loadingProvider !== provider.id ? 0.5 : 1,
            transition: 'all 0.2s ease',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            if (!loadingProvider) {
              e.currentTarget.style.backgroundColor = provider.hoverBg
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = provider.bgColor
          }}
        >
          {loadingProvider === provider.id ? (
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid transparent',
              borderTopColor: provider.textColor,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            provider.icon
          )}
          <span>
            {loadingProvider === provider.id
              ? t.loading
              : `${t.continueWith} ${provider.name}`
            }
          </span>
        </button>
      ))}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default SocialLoginButtons
