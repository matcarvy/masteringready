'use client'

/**
 * Settings Page / Página de Configuración
 * Profile, Preferences, Security, Data & Privacy
 * Perfil, Preferencias, Seguridad, Datos y Privacidad
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserMenu } from '@/components/auth'
import { supabase } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import {
  Music,
  Zap,
  User,
  Globe,
  Shield,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Configuración',
    loading: 'Cargando...',
    analyze: 'Analizar',
    // Profile
    profileSection: 'Perfil',
    name: 'Nombre',
    email: 'Correo electrónico',
    managedBy: 'Gestionado por',
    saveChanges: 'Guardar cambios',
    saving: 'Guardando...',
    saved: 'Guardado',
    // Preferences
    preferencesSection: 'Preferencias',
    language: 'Idioma',
    languageSaved: 'Idioma actualizado',
    // Security
    securitySection: 'Seguridad',
    changePassword: 'Cambiar contraseña',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar nueva contraseña',
    updatePassword: 'Actualizar contraseña',
    updatingPassword: 'Actualizando...',
    passwordUpdated: 'Contraseña actualizada correctamente',
    passwordMismatch: 'Las contraseñas no coinciden',
    passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
    connectedAccounts: 'Cuentas conectadas',
    connectedWith: 'Conectado con',
    // Data
    dataSection: 'Datos y privacidad',
    deleteAccount: 'Eliminar mi cuenta',
    deleteTitle: '¿Eliminar tu cuenta?',
    deleteMessage: 'Esta acción es permanente. Se eliminarán todos tus análisis y datos. No se puede deshacer.',
    deleteConfirmInput: 'Escribe "ELIMINAR" para confirmar',
    deleteConfirmWord: 'ELIMINAR',
    deletePermanently: 'Eliminar permanentemente',
    cancel: 'Cancelar',
    deleting: 'Eliminando...'
  },
  en: {
    title: 'Settings',
    loading: 'Loading...',
    analyze: 'Analyze',
    // Profile
    profileSection: 'Profile',
    name: 'Name',
    email: 'Email',
    managedBy: 'Managed by',
    saveChanges: 'Save changes',
    saving: 'Saving...',
    saved: 'Saved',
    // Preferences
    preferencesSection: 'Preferences',
    language: 'Language',
    languageSaved: 'Language updated',
    // Security
    securitySection: 'Security',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    updatePassword: 'Update password',
    updatingPassword: 'Updating...',
    passwordUpdated: 'Password updated successfully',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    connectedAccounts: 'Connected accounts',
    connectedWith: 'Connected with',
    // Data
    dataSection: 'Data and privacy',
    deleteAccount: 'Delete my account',
    deleteTitle: 'Delete your account?',
    deleteMessage: 'This action is permanent. All your analyses and data will be deleted. This cannot be undone.',
    deleteConfirmInput: 'Type "DELETE" to confirm',
    deleteConfirmWord: 'DELETE',
    deletePermanently: 'Permanently delete',
    cancel: 'Cancel',
    deleting: 'Deleting...'
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [loading, setLoading] = useState(true)

  // Profile state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [isOAuth, setIsOAuth] = useState(false)
  const [oauthProvider, setOauthProvider] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const t = translations[lang]

  // Detect language: cookie > timezone > browser
  useEffect(() => {
    setLang(detectLanguage())
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [authLoading, user, router])

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      setLoading(true)

      try {
        // Determine auth provider
        const provider = user.app_metadata?.provider || 'email'
        setIsOAuth(provider !== 'email')
        setOauthProvider(provider.charAt(0).toUpperCase() + provider.slice(1))

        // Set email
        setEmail(user.email || '')

        // Set name
        const displayName = user.user_metadata?.full_name || user.user_metadata?.name || ''
        setFullName(displayName)

        // Check profile for preferred language
        const { data: profileData } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single()

        if (profileData?.preferred_language === 'en' || profileData?.preferred_language === 'es') {
          setLang(profileData.preferred_language as 'es' | 'en')
        }
      } catch (error) {
        console.error('Error fetching settings data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  // Save profile name
  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    setProfileSaved(false)

    try {
      // Update Supabase auth metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      })

      // Update profile table
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setProfileSaving(false)
    }
  }

  // Change language
  const handleLanguageChange = async (newLang: 'es' | 'en') => {
    setLang(newLang)
    setLanguageCookie(newLang)

    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: newLang })
        .eq('id', user.id)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: t.passwordTooShort })
      return
    }

    if (newPassword !== confirmPasswordVal) {
      setPasswordMessage({ type: 'error', text: t.passwordMismatch })
      return
    }

    setPasswordLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setPasswordMessage({ type: 'error', text: error.message })
      } else {
        setPasswordMessage({ type: 'success', text: t.passwordUpdated })
        setNewPassword('')
        setConfirmPasswordVal('')
        setShowPasswordForm(false)
      }
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordMessage({ type: 'error', text: 'Error' })
    } finally {
      setPasswordLoading(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    const confirmWord = t.deleteConfirmWord
    if (deleteConfirm !== confirmWord) return

    setDeleteLoading(true)

    try {
      // Anti-abuse: Record email + usage before deletion
      // This prevents users from deleting and re-creating accounts to get fresh free analyses
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, total_analyses, analyses_lifetime_used')
        .eq('id', user!.id)
        .single()

      if (profileData) {
        await supabase.from('deleted_accounts').insert({
          email: profileData.email,
          analyses_lifetime_used: profileData.analyses_lifetime_used || 0,
          total_analyses: profileData.total_analyses || 0
        })
      }

      // Delete analyses
      await supabase
        .from('analyses')
        .delete()
        .eq('user_id', user!.id)

      // Delete subscription
      await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user!.id)

      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user!.id)

      // Sign out
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Delete account error:', error)
      setDeleteLoading(false)
    }
  }

  // Safety timeout — if loading hangs for more than 10s, force stop
  useEffect(() => {
    if (!loading) return
    const timeout = setTimeout(() => {
      console.warn('[Settings] Loading safety timeout reached (10s)')
      setLoading(false)
    }, 10000)
    return () => clearTimeout(timeout)
  }, [loading])

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem'
      }}>
        <span style={{ fontSize: '2rem' }}>🎧</span>
        <div style={{ color: 'white', fontSize: '1.25rem' }}>{t.loading}</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Music size={18} color="white" />
            </div>
            <span style={{
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              MasteringReady
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                const newLang = lang === 'es' ? 'en' : 'es'
                handleLanguageChange(newLang)
              }}
              style={{
                padding: '0.375rem 0.75rem',
                minWidth: '2.5rem',
                textAlign: 'center',
                background: 'transparent',
                color: '#6b7280',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>

            <UserMenu lang={lang} />

            <Link
              href="/#analyze"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Zap size={16} />
              {t.analyze}
            </Link>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Page Header */}
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '2rem'
        }}>
          {t.title}
        </h1>

        {/* Profile Section */}
        <section style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <User size={20} style={{ color: '#667eea' }} />
            {t.profileSection}
          </h2>

          {/* Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              {t.name}
            </label>
            {isOAuth ? (
              <div>
                <input
                  type="text"
                  value={fullName}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    background: '#f9fafb',
                    color: '#6b7280',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.375rem' }}>
                  {t.managedBy} {oauthProvider}
                </p>
              </div>
            ) : (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              {t.email}
            </label>
            <input
              type="email"
              value={email}
              disabled
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                background: '#f9fafb',
                color: '#6b7280',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Save Button (only for email auth) */}
          {!isOAuth && (
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: profileSaved ? '#10b981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: profileSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {profileSaved ? <Check size={16} /> : null}
              {profileSaving ? t.saving : profileSaved ? t.saved : t.saveChanges}
            </button>
          )}
        </section>

        {/* Preferences Section */}
        <section style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Globe size={20} style={{ color: '#667eea' }} />
            {t.preferencesSection}
          </h2>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              {t.language}
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleLanguageChange('es')}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: lang === 'es' ? '2px solid #667eea' : '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  background: lang === 'es' ? '#eef2ff' : 'white',
                  color: lang === 'es' ? '#667eea' : '#374151',
                  fontWeight: lang === 'es' ? '600' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Español
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: lang === 'en' ? '2px solid #667eea' : '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  background: lang === 'en' ? '#eef2ff' : 'white',
                  color: lang === 'en' ? '#667eea' : '#374151',
                  fontWeight: lang === 'en' ? '600' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                English
              </button>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Shield size={20} style={{ color: '#667eea' }} />
            {t.securitySection}
          </h2>

          {isOAuth ? (
            /* OAuth: show connected account */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '0.75rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={20} style={{ color: '#667eea' }} />
              </div>
              <div>
                <p style={{ fontWeight: '500', color: '#374151', fontSize: '0.95rem' }}>
                  {t.connectedAccounts}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {t.connectedWith} {oauthProvider}
                </p>
              </div>
            </div>
          ) : (
            /* Email auth: change password */
            <div>
              {passwordMessage && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  background: passwordMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${passwordMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  color: passwordMessage.type === 'success' ? '#15803d' : '#dc2626'
                }}>
                  {passwordMessage.text}
                </div>
              )}

              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    background: 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {t.changePassword}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* New Password */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      {t.newPassword}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          paddingRight: '2.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
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
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      {t.confirmPassword}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPasswordVal}
                        onChange={(e) => setConfirmPasswordVal(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          paddingRight: '2.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={handleChangePassword}
                      disabled={passwordLoading}
                      style={{
                        padding: '0.625rem 1.25rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: passwordLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {passwordLoading ? t.updatingPassword : t.updatePassword}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false)
                        setNewPassword('')
                        setConfirmPasswordVal('')
                        setPasswordMessage(null)
                      }}
                      style={{
                        padding: '0.625rem 1.25rem',
                        background: 'white',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Data & Privacy Section */}
        <section style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Trash2 size={20} style={{ color: '#dc2626' }} />
            {t.dataSection}
          </h2>

          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'white',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white'
            }}
          >
            {t.deleteAccount}
          </button>
        </section>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          onClick={() => setShowDeleteModal(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: 'clamp(0.75rem, 3vw, 1.5rem)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              maxWidth: '440px',
              width: 'calc(100% - 1rem)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowDeleteModal(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6b7280', padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>

            {/* Warning Icon */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <AlertTriangle size={28} style={{ color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                {t.deleteTitle}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                {t.deleteMessage}
              </p>
            </div>

            {/* Confirmation Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                {t.deleteConfirmInput}
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== t.deleteConfirmWord || deleteLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: deleteConfirm === t.deleteConfirmWord ? '#dc2626' : '#e5e7eb',
                  color: deleteConfirm === t.deleteConfirmWord ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: deleteConfirm === t.deleteConfirmWord && !deleteLoading ? 'pointer' : 'not-allowed'
                }}
              >
                {deleteLoading ? t.deleting : t.deletePermanently}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirm('')
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
