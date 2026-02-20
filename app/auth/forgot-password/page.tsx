'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { Headphones, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

const translations = {
  es: {
    title: 'Recuperar contraseña',
    subtitle: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña',
    email: 'Correo electrónico',
    send: 'Enviar enlace',
    sending: 'Enviando...',
    backToLogin: 'Volver a iniciar sesión',
    backToHome: 'Volver al inicio',
    emailRequired: 'El correo electrónico es requerido',
    error: 'No se pudo enviar el enlace. Intenta de nuevo.',
    successTitle: 'Revisa tu correo',
    successMessage: 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.'
  },
  en: {
    title: 'Reset password',
    subtitle: 'Enter your email and we\'ll send you a link to reset your password',
    email: 'Email address',
    send: 'Send link',
    sending: 'Sending...',
    backToLogin: 'Back to sign in',
    backToHome: 'Back to home',
    emailRequired: 'Email is required',
    error: 'Could not send the link. Please try again.',
    successTitle: 'Check your email',
    successMessage: 'If an account exists with that email, you\'ll receive a password reset link. Check your spam folder too.'
  }
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const t = translations[lang]

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const urlLang = searchParams.get('lang')
    if (urlLang === 'en' || urlLang === 'es') {
      setLang(urlLang)
      setLanguageCookie(urlLang)
    } else {
      setLang(detectLanguage())
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError(t.emailRequired)
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/callback?type=recovery` }
      )

      if (resetError) {
        setError(t.error)
        setLoading(false)
        return
      }

      setSent(true)
    } catch {
      setError(t.error)
    } finally {
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

      <div style={{
        background: 'var(--mr-bg-card)',
        borderRadius: '1.5rem',
        padding: 'clamp(1.5rem, 5vw, 2.5rem)',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--mr-shadow-lg)'
      }}>
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

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'var(--mr-green-bg)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <CheckCircle size={32} color="var(--mr-green)" />
            </div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--mr-text-primary)',
              marginBottom: '0.5rem'
            }}>
              {t.successTitle}
            </h2>
            <p style={{
              color: 'var(--mr-text-secondary)',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              marginBottom: '1.5rem'
            }}>
              {t.successMessage}
            </p>
            <Link
              href={`/auth/login?lang=${lang}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--mr-primary)',
                fontWeight: '600',
                textDecoration: 'none',
                fontSize: '0.95rem'
              }}
            >
              <ArrowLeft size={16} />
              {t.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: 'var(--mr-red-bg)',
                border: '1px solid var(--mr-red)',
                color: 'var(--mr-red)',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
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
              {loading ? t.sending : t.send}
            </button>

            <p style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              color: 'var(--mr-text-secondary)',
              fontSize: '0.95rem'
            }}>
              <Link
                href={`/auth/login?lang=${lang}`}
                style={{
                  color: 'var(--mr-primary)',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                {t.backToLogin}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'var(--mr-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'var(--mr-text-primary)', fontSize: '1.25rem' }}>Cargando...</div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  )
}
