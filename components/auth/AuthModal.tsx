'use client'

/**
 * AuthModal - Inline Authentication Modal
 * Modal de Autenticación Inline
 *
 * Combined login/signup modal with unlock animation
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SocialLoginButtons } from './SocialLoginButtons'
import { X, Mail, Lock, User, Eye, EyeOff, Check, Headphones, Music } from 'lucide-react'

// ============================================================================
// TYPES / TIPOS
// ============================================================================

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lang: 'es' | 'en'
}

type AuthMode = 'login' | 'signup'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    // Tabs
    login: 'Iniciar Sesión',
    signup: 'Crear Cuenta',
    // Login
    loginSubtitle: 'Accede para ver tu análisis completo',
    // Signup
    signupSubtitle: 'Crea tu cuenta gratis',
    // Form fields
    name: 'Nombre completo',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    // Buttons
    loginButton: 'Iniciar Sesión',
    signupButton: 'Crear Cuenta',
    loggingIn: 'Iniciando sesión...',
    signingUp: 'Creando cuenta...',
    // Divider
    or: 'o continúa con',
    // Benefits
    benefit1: 'Ver análisis completo sin blur',
    benefit2: 'Guardar en Mis Análisis',
    benefit3: '1 análisis extra gratis',
    // Validation errors
    nameRequired: 'El nombre es requerido',
    emailRequired: 'El correo electrónico es requerido',
    emailInvalid: 'Ingresa un correo electrónico válido',
    passwordRequired: 'La contraseña es requerida',
    passwordTooShort: 'Mínimo 8 caracteres',
    passwordsDoNotMatch: 'Las contraseñas no coinciden',
    invalidCredentials: 'Credenciales inválidas',
    emailExists: 'Ya existe una cuenta con este email',
    error: 'Error. Intenta de nuevo.',
    // Success
    unlocking: 'Accediendo...'
  },
  en: {
    // Tabs
    login: 'Sign In',
    signup: 'Sign Up',
    // Login
    loginSubtitle: 'Sign in to see your full analysis',
    // Signup
    signupSubtitle: 'Create your free account',
    // Form fields
    name: 'Full name',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    forgotPassword: 'Forgot password?',
    // Buttons
    loginButton: 'Sign In',
    signupButton: 'Create Account',
    loggingIn: 'Signing in...',
    signingUp: 'Creating account...',
    // Divider
    or: 'or continue with',
    // Benefits
    benefit1: 'See full analysis without blur',
    benefit2: 'Save to My Analyses',
    benefit3: '1 extra free analysis',
    // Validation errors
    nameRequired: 'Name is required',
    emailRequired: 'Email is required',
    emailInvalid: 'Enter a valid email',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Minimum 8 characters',
    passwordsDoNotMatch: 'Passwords do not match',
    invalidCredentials: 'Invalid credentials',
    emailExists: 'Account already exists',
    error: 'Error. Please try again.',
    // Success
    unlocking: 'Accessing...'
  }
}

// ============================================================================
// COMPONENT / COMPONENTE
// ============================================================================

export function AuthModal({ isOpen, onClose, onSuccess, lang }: AuthModalProps) {
  const t = translations[lang]

  // State
  const [mode, setMode] = useState<AuthMode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState(false)
  const [lockAnimationPhase, setLockAnimationPhase] = useState<'idle' | 'shake' | 'open' | 'green'>('idle')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setError(null)
      setAuthSuccess(false)
      setLockAnimationPhase('idle')
    }
  }, [isOpen])

  // Validate email format
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // Handle email/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
        // Close modal immediately — page.tsx handles unlock animation
        // based on AuthProvider quota check result
        setLoading(false)
        onSuccess()
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(t.error)
      setLoading(false)
    }
  }

  // Handle email/password signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!name.trim()) {
      setError(t.nameRequired)
      return
    }
    if (!email.trim()) {
      setError(t.emailRequired)
      return
    }
    if (!isValidEmail(email.trim())) {
      setError(t.emailInvalid)
      return
    }
    if (!password) {
      setError(t.passwordRequired)
      return
    }
    if (password.length < 8) {
      setError(t.passwordTooShort)
      return
    }
    if (password !== confirmPassword) {
      setError(t.passwordsDoNotMatch)
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError(t.emailExists)
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Close modal immediately — page.tsx handles unlock animation
        // based on AuthProvider quota check result
        setLoading(false)
        onSuccess()
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError(t.error)
      setLoading(false)
    }
  }

  // Trigger the unlock animation sequence
  const triggerUnlockAnimation = () => {
    setAuthSuccess(true)
    setLoading(false)

    // Animation sequence: shake (0-300ms) -> open (300-700ms) -> green (700-1000ms)
    setLockAnimationPhase('shake')

    setTimeout(() => {
      setLockAnimationPhase('open')
    }, 300)

    setTimeout(() => {
      setLockAnimationPhase('green')
    }, 700)

    // After animation completes, notify parent
    setTimeout(() => {
      onSuccess()
    }, 1000)
  }

  // Handle OAuth before redirect - store flag for animation on return
  const handleBeforeOAuthRedirect = () => {
    localStorage.setItem('authModalFlow', JSON.stringify({
      fromModal: true,
      timestamp: Date.now()
    }))
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out',
          overscrollBehavior: 'contain'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: '1.25rem',
        padding: '2rem',
        maxWidth: '420px',
        width: 'calc(100% - 2rem)',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        zIndex: 101,
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0.75rem'
          }}
          aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
        >
          <X size={20} />
        </button>

        {/* Success state with headphones animation */}
        {authSuccess ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem 0'
          }}>
            {/* Animated Headphones Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              background: lockAnimationPhase === 'green'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              transition: 'background 0.3s ease',
              animation: lockAnimationPhase === 'shake' ? 'lockShake 0.3s ease-in-out' : 'none'
            }}>
              {lockAnimationPhase === 'green' ? (
                <Check size={40} style={{ color: 'white' }} />
              ) : lockAnimationPhase === 'open' ? (
                <Music
                  size={40}
                  style={{
                    color: 'white',
                    animation: 'lockOpen 0.4s ease-out forwards'
                  }}
                />
              ) : (
                <Headphones size={40} style={{ color: 'white' }} />
              )}
            </div>

            <p style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: lockAnimationPhase === 'green' ? '#059669' : '#374151',
              transition: 'color 0.3s ease'
            }}>
              {t.unlocking}
            </p>
          </div>
        ) : (
          <>
            {/* Headphones Icon Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Headphones size={24} style={{ color: 'white' }} />
              </div>
            </div>

            {/* Tab Toggle */}
            <div style={{
              display: 'flex',
              background: '#f3f4f6',
              borderRadius: '0.5rem',
              padding: '0.25rem',
              marginBottom: '1rem'
            }}>
              {(['signup', 'login'] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m)
                    setError(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: mode === m ? 'white' : 'transparent',
                    color: mode === m ? '#667eea' : '#6b7280',
                    fontWeight: mode === m ? '600' : '500',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {m === 'login' ? t.login : t.signup}
                </button>
              ))}
            </div>

            {/* Subtitle */}
            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {mode === 'login' ? t.loginSubtitle : t.signupSubtitle}
            </p>

            {/* Benefits (signup only) */}
            {mode === 'signup' && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                {[t.benefit1, t.benefit2, t.benefit3].map((benefit, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#10b981',
                      fontWeight: '500'
                    }}
                  >
                    <Check size={12} />
                    {benefit}
                  </span>
                ))}
              </div>
            )}

            {/* Social Login Buttons */}
            <SocialLoginButtons
              lang={lang}
              onError={setError}
              onBeforeRedirect={handleBeforeOAuthRedirect}
            />

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.25rem 0',
              gap: '1rem'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{t.or}</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

            {/* Form */}
            <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
              {/* Error Message */}
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.875rem',
                  fontSize: '0.8rem'
                }}>
                  {error}
                </div>
              )}

              {/* Name Input (signup only) */}
              {mode === 'signup' && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af'
                      }}
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.name}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.email}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: mode === 'login' ? '0.5rem' : '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.password}
                    style={{
                      width: '100%',
                      padding: '0.625rem 2.5rem 0.625rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (signup only) */}
              {mode === 'signup' && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af'
                      }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.confirmPassword}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Forgot Password (login only) */}
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                  <a
                    href="/auth/forgot-password"
                    style={{
                      color: '#667eea',
                      fontSize: '0.75rem',
                      textDecoration: 'none'
                    }}
                  >
                    {t.forgotPassword}
                  </a>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: loading
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {loading
                  ? (mode === 'login' ? t.loggingIn : t.signingUp)
                  : (mode === 'login' ? t.loginButton : t.signupButton)
                }
              </button>
            </form>
          </>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-5deg); }
          40% { transform: translateX(4px) rotate(5deg); }
          60% { transform: translateX(-4px) rotate(-5deg); }
          80% { transform: translateX(4px) rotate(5deg); }
        }

        @keyframes lockOpen {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(-15deg); }
          100% { transform: translateY(-6px) rotate(-20deg); }
        }

        @keyframes unlockRipple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}

export default AuthModal
