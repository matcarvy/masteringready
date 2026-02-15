'use client'

/**
 * Login Page / Página de Inicio de Sesión
 * Supports email/password and OAuth (Google, Facebook)
 * Soporta email/contraseña y OAuth (Google, Facebook)
 */

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, setRememberDevice, getRememberDevice } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { Headphones, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Iniciar Sesión',
    subtitle: 'Bienvenido de vuelta a Mastering Ready',
    email: 'Correo electrónico',
    password: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    login: 'Iniciar Sesión',
    loggingIn: 'Iniciando sesión...',
    noAccount: '¿No tienes cuenta?',
    signUp: 'Regístrate',
    or: 'o continúa con',
    backToHome: 'Volver al inicio',
    invalidCredentials: 'Credenciales inválidas. Verifica tu email y contraseña.',
    error: 'Error al iniciar sesión. Intenta de nuevo.',
    emailRequired: 'El correo electrónico es requerido',
    passwordRequired: 'La contraseña es requerida',
    rememberDevice: 'Recordar este dispositivo'
  },
  en: {
    title: 'Sign In',
    subtitle: 'Welcome back to Mastering Ready',
    email: 'Email address',
    password: 'Password',
    forgotPassword: 'Forgot your password?',
    login: 'Sign In',
    loggingIn: 'Signing in...',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    or: 'or continue with',
    backToHome: 'Back to home',
    invalidCredentials: 'Invalid credentials. Check your email and password.',
    error: 'Error signing in. Please try again.',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    rememberDevice: 'Remember this device'
  }
}

// ============================================================================
// COMPONENT / COMPONENTE
// ============================================================================

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const t = translations[lang]

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberDevice, setRememberDevice_] = useState(true)

  // Initialize remember device from stored preference
  useEffect(() => {
    setRememberDevice_(getRememberDevice())
  }, [])

  // Detect language: URL param > cookie > browser
  useEffect(() => {
    const urlLang = searchParams.get('lang')
    if (urlLang === 'en' || urlLang === 'es') {
      setLang(urlLang)
      setLanguageCookie(urlLang)
    } else {
      setLang(detectLanguage())
    }
  }, [searchParams])

  // Handle email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!email.trim()) {
      setError(t.emailRequired)
      return
    }
    if (!password) {
      setError(t.passwordRequired)
      return
    }

    setLoading(true)

    try {
      // Set session storage preference before signing in
      setRememberDevice(rememberDevice)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError(t.invalidCredentials)
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Redirect to home or intended page (validate to prevent open redirect)
        let redirectTo = searchParams.get('redirect') || '/'
        if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
          redirectTo = '/'
        }
        router.push(redirectTo)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(t.error)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--mr-gradient)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(1rem, 5vw, 2rem)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Language Toggle - Single button like main page */}
      <button
        onClick={() => {
          const newLang = lang === 'es' ? 'en' : 'es'
          setLang(newLang)
          setLanguageCookie(newLang)
        }}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: 'white',
          cursor: 'pointer',
          border: 'none',
          background: 'rgba(255,255,255,0.15)',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      {/* Login Card */}
      <div style={{
        background: 'var(--mr-bg-card)',
        borderRadius: '1.5rem',
        padding: 'clamp(1.5rem, 5vw, 2.5rem)',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--mr-shadow-lg)'
      }}>
        {/* Back to Home */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--mr-text-secondary)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}
        >
          <ArrowLeft size={16} />
          {t.backToHome}
        </Link>

        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--mr-gradient)',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Headphones size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: 'var(--mr-text-primary)',
            marginBottom: '0.5rem'
          }}>
            {t.title}
          </h1>
          <p style={{ color: 'var(--mr-text-secondary)', fontSize: '0.95rem' }}>
            {t.subtitle}
          </p>
        </div>

        {/* Social Login Buttons */}
        <SocialLoginButtons
          lang={lang}
          onError={setError}
        />

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '1.5rem 0',
          gap: '1rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--mr-border)' }} />
          <span style={{ color: 'var(--mr-text-tertiary)', fontSize: '0.875rem' }}>{t.or}</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--mr-border)' }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin}>
          {/* Error Message */}
          {error && (
            <div style={{
              background: 'var(--mr-red-bg)',
              border: '1px solid #fecaca',
              color: 'var(--mr-red)',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* Email Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--mr-text-primary)',
                marginBottom: '0.5rem'
              }}
            >
              {t.email}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--mr-text-tertiary)'
                }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.875rem 0.75rem 2.75rem',
                  border: '1px solid var(--mr-border-strong)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--mr-text-primary)',
                marginBottom: '0.5rem'
              }}
            >
              {t.password}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--mr-text-tertiary)'
                }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.75rem 0.75rem 2.75rem',
                  border: '1px solid var(--mr-border-strong)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--mr-text-tertiary)',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Device + Forgot Password */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: 'var(--mr-text-secondary)'
            }}>
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice_(e.target.checked)}
                style={{
                  accentColor: 'var(--mr-primary)',
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer'
                }}
              />
              {t.rememberDevice}
            </label>
            <Link
              href="/auth/forgot-password"
              style={{
                color: 'var(--mr-primary)',
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              {t.forgotPassword}
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading
                ? 'var(--mr-text-tertiary)'
                : 'var(--mr-gradient)',
              color: 'var(--mr-text-inverse)',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? t.loggingIn : t.login}
          </button>
        </form>

        {/* Sign Up Link */}
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          color: 'var(--mr-text-secondary)',
          fontSize: '0.95rem'
        }}>
          {t.noAccount}{' '}
          <Link
            href={`/auth/signup?lang=${lang}`}
            style={{
              color: 'var(--mr-primary)',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            {t.signUp}
          </Link>
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// EXPORT WITH SUSPENSE WRAPPER
// ============================================================================

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'var(--mr-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'var(--mr-text-inverse)', fontSize: '1.25rem' }}>Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
