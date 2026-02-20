'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { Headphones, Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'

const translations = {
  es: {
    title: 'Nueva contraseña',
    subtitle: 'Ingresa tu nueva contraseña',
    password: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    save: 'Guardar contraseña',
    saving: 'Guardando...',
    backToHome: 'Volver al inicio',
    passwordRequired: 'La contraseña es requerida',
    passwordMin: 'La contraseña debe tener al menos 8 caracteres',
    passwordMismatch: 'Las contraseñas no coinciden',
    error: 'No se pudo actualizar la contraseña. Intenta de nuevo.',
    noSession: 'Enlace expirado o no válido. Solicita uno nuevo.',
    requestNew: 'Solicitar nuevo enlace',
    successTitle: 'Contraseña actualizada',
    successMessage: 'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.',
    goToLogin: 'Ir a iniciar sesión'
  },
  en: {
    title: 'New password',
    subtitle: 'Enter your new password',
    password: 'New password',
    confirmPassword: 'Confirm password',
    save: 'Save password',
    saving: 'Saving...',
    backToHome: 'Back to home',
    passwordRequired: 'Password is required',
    passwordMin: 'Password must be at least 8 characters',
    passwordMismatch: 'Passwords do not match',
    error: 'Could not update password. Please try again.',
    noSession: 'Link expired or invalid. Request a new one.',
    requestNew: 'Request new link',
    successTitle: 'Password updated',
    successMessage: 'Your password was updated successfully. You can now sign in.',
    goToLogin: 'Go to sign in'
  }
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const t = translations[lang]

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(true)

  useEffect(() => {
    const urlLang = searchParams.get('lang')
    if (urlLang === 'en' || urlLang === 'es') {
      setLang(urlLang)
      setLanguageCookie(urlLang)
    } else {
      setLang(detectLanguage())
    }
  }, [searchParams])

  // Check if user has a valid session (from recovery link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setHasSession(false)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password) {
      setError(t.passwordRequired)
      return
    }
    if (password.length < 8) {
      setError(t.passwordMin)
      return
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch)
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password
      })

      if (updateError) {
        setError(t.error)
        setLoading(false)
        return
      }

      setSuccess(true)

      // Sign out so they log in fresh with new password
      await supabase.auth.signOut()
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

        {!hasSession ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'var(--mr-red-bg)',
              border: '1px solid #fecaca',
              color: 'var(--mr-red)',
              padding: '1rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
              lineHeight: '1.5'
            }}>
              {t.noSession}
            </div>
            <Link
              href={`/auth/forgot-password?lang=${lang}`}
              style={{
                display: 'inline-block',
                padding: '0.875rem 1.5rem',
                background: 'var(--mr-gradient)',
                color: 'var(--mr-text-inverse)',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              {t.requestNew}
            </Link>
          </div>
        ) : success ? (
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
                display: 'inline-block',
                padding: '0.875rem 1.5rem',
                background: 'var(--mr-gradient)',
                color: 'var(--mr-text-inverse)',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              {t.goToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="confirm-password"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--mr-text-primary)',
                  marginBottom: '0.5rem'
                }}
              >
                {t.confirmPassword}
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
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  onClick={() => setShowConfirm(!showConfirm)}
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
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
              {loading ? t.saving : t.save}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  )
}
