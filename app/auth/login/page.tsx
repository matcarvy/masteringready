'use client'

/**
 * Login Page / Página de Inicio de Sesión
 * Supports email/password and OAuth (Google, Apple, Facebook)
 * Soporta email/contraseña y OAuth (Google, Apple, Facebook)
 */

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { Headphones, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Iniciar Sesión',
    subtitle: 'Accede a tu cuenta de MasteringReady',
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
    passwordRequired: 'La contraseña es requerida'
  },
  en: {
    title: 'Sign In',
    subtitle: 'Access your MasteringReady account',
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
    passwordRequired: 'Password is required'
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
        // Redirect to home or intended page
        const redirectTo = searchParams.get('redirect') || '/'
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
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
        background: 'white',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Back to Home */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#6b7280',
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            {t.title}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
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
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{t.or}</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin}>
          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
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
                color: '#374151',
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
                  color: '#9ca3af'
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
                  border: '1px solid #d1d5db',
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
                color: '#374151',
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
                  color: '#9ca3af'
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
                  border: '1px solid #d1d5db',
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
                  color: '#9ca3af',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <Link
              href="/auth/forgot-password"
              style={{
                color: '#667eea',
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
                ? '#9ca3af'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
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
          color: '#6b7280',
          fontSize: '0.95rem'
        }}>
          {t.noAccount}{' '}
          <Link
            href={`/auth/signup?lang=${lang}`}
            style={{
              color: '#667eea',
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '1.25rem' }}>Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
