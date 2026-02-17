'use client'

/**
 * Settings Page / Pagina de Configuracion
 * Profile, Preferences, Appearance, Security, Data & Privacy
 * Perfil, Preferencias, Apariencia, Seguridad, Datos y Privacidad
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserMenu } from '@/components/auth'
import { supabase, createFreshQueryClient } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { ThemeToggle } from '@/components/ThemeToggle'
import { clearNotification } from '@/components/NotificationBadge'
import { useTheme } from '@/lib/theme'
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
  EyeOff,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Configuracion',
    loading: 'Cargando...',
    analyze: 'Analizar',
    // Profile
    profileSection: 'Perfil',
    name: 'Nombre',
    email: 'Correo electronico',
    managedBy: 'Gestionado por',
    saveChanges: 'Guardar cambios',
    saving: 'Guardando...',
    saved: 'Guardado',
    // Preferences
    preferencesSection: 'Preferencias',
    language: 'Idioma',
    languageSaved: 'Idioma actualizado',
    // Appearance
    appearanceSection: 'Apariencia',
    appearanceDescription: 'Elige el tema visual',
    themeSystem: 'Sistema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    // Security
    securitySection: 'Seguridad',
    changePassword: 'Cambiar contrasena',
    currentPassword: 'Contrasena actual',
    newPassword: 'Nueva contrasena',
    confirmPassword: 'Confirmar nueva contrasena',
    updatePassword: 'Actualizar contrasena',
    updatingPassword: 'Actualizando...',
    passwordUpdated: 'Contrasena actualizada correctamente',
    passwordMismatch: 'Las contrasenas no coinciden',
    passwordTooShort: 'La contrasena debe tener al menos 6 caracteres',
    connectedAccounts: 'Cuentas conectadas',
    connectedWith: 'Conectado con',
    // Data
    dataSection: 'Datos y privacidad',
    deleteAccount: 'Eliminar mi cuenta',
    deleteTitle: '¿Eliminar tu cuenta?',
    deleteMessage: 'Esta accion es permanente. Se eliminaran todos tus analisis y datos. No se puede deshacer.',
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
    // Appearance
    appearanceSection: 'Appearance',
    appearanceDescription: 'Choose visual theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
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
  const { user, session, loading: authLoading, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [isMobile, setIsMobile] = useState(false)
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

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Redirect if not logged in (to home, not login — home has login options in header)
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = `/?lang=${lang}`
    }
  }, [authLoading, user, lang])

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user || !session?.access_token) return
      clearNotification()
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

        // Use fresh client — avoids stale singleton after SPA navigation
        const client = await createFreshQueryClient(
          { access_token: session.access_token, refresh_token: session.refresh_token }
        )
        if (!client) return

        // Check profile for preferred language
        const { data: profileData } = await client
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

    if (user && session?.access_token) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token])

  // Save profile name
  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    setProfileSaved(false)

    try {
      const client = await createFreshQueryClient(
        session ? { access_token: session.access_token, refresh_token: session.refresh_token } : undefined
      )
      if (!client) return

      // Update Supabase auth metadata
      await client.auth.updateUser({
        data: { full_name: fullName }
      })

      // Update profile table
      await client
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
      const client = await createFreshQueryClient(
        session ? { access_token: session.access_token, refresh_token: session.refresh_token } : undefined
      )
      if (!client) return
      await client
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
      const client = await createFreshQueryClient(
        session ? { access_token: session.access_token, refresh_token: session.refresh_token } : undefined
      )
      if (!client) return

      const { error } = await client.auth.updateUser({
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
      const client = await createFreshQueryClient(
        session ? { access_token: session.access_token, refresh_token: session.refresh_token } : undefined
      )
      if (!client) return

      // Anti-abuse: Record email + usage before deletion
      // This prevents users from deleting and re-creating accounts to get fresh free analyses
      const { data: profileData } = await client
        .from('profiles')
        .select('email, total_analyses, analyses_lifetime_used')
        .eq('id', user!.id)
        .single()

      if (profileData) {
        await client.from('deleted_accounts').insert({
          email: profileData.email,
          analyses_lifetime_used: profileData.analyses_lifetime_used || 0,
          total_analyses: profileData.total_analyses || 0
        })
      }

      // Delete analyses
      await client
        .from('analyses')
        .delete()
        .eq('user_id', user!.id)

      // Delete subscription
      await client
        .from('subscriptions')
        .delete()
        .eq('user_id', user!.id)

      // Delete profile
      await client
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

  // Safety timeout — if loading hangs, auto-reload (max 1 attempt)
  useEffect(() => {
    if (!loading) {
      sessionStorage.removeItem('mr_set_reload')
      return
    }
    const alreadyReloaded = sessionStorage.getItem('mr_set_reload')
    if (alreadyReloaded) return
    const timeout = setTimeout(() => {
      sessionStorage.setItem('mr_set_reload', '1')
      window.location.reload()
    }, 8000)
    return () => clearTimeout(timeout)
  }, [loading])

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--mr-gradient)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem'
      }}>
        <span style={{ fontSize: '2rem' }}>🎧</span>
        <div style={{ color: 'var(--mr-text-inverse)', fontSize: '1.25rem' }}>{t.loading}</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--mr-bg-elevated)',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <header style={{
        background: 'var(--mr-bg-card)',
        borderBottom: '1px solid var(--mr-border)',
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
              background: 'var(--mr-gradient)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Music size={18} color="white" />
            </div>
            {!isMobile && (
              <span style={{
                fontWeight: '700',
                background: 'var(--mr-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Mastering Ready
              </span>
            )}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
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
                color: 'var(--mr-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>

            <ThemeToggle lang={lang} />

            <UserMenu lang={lang} isMobile={isMobile} />

            <Link
              href="/#analyze"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--mr-gradient)',
                color: 'var(--mr-text-inverse)',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--mr-shadow-lg)'
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
          color: 'var(--mr-text-primary)',
          marginBottom: '2rem'
        }}>
          {t.title}
        </h1>

        {/* Profile Section */}
        <section style={{
          background: 'var(--mr-bg-card)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: 'var(--mr-shadow)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--mr-text-primary)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <User size={20} style={{ color: 'var(--mr-primary)' }} />
            {t.profileSection}
          </h2>

          {/* Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--mr-text-primary)',
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
                    border: '1px solid var(--mr-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    background: 'var(--mr-bg-base)',
                    color: 'var(--mr-text-secondary)',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)', marginTop: '0.375rem' }}>
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
                  border: '1px solid var(--mr-border-strong)',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'var(--mr-bg-card)',
                  color: 'var(--mr-text-primary)'
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
              color: 'var(--mr-text-primary)',
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
                border: '1px solid var(--mr-border)',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                background: 'var(--mr-bg-base)',
                color: 'var(--mr-text-secondary)',
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
                background: profileSaved ? 'var(--mr-green)' : 'var(--mr-gradient)',
                color: 'var(--mr-text-inverse)',
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
          background: 'var(--mr-bg-card)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: 'var(--mr-shadow)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--mr-text-primary)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Globe size={20} style={{ color: 'var(--mr-primary)' }} />
            {t.preferencesSection}
          </h2>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--mr-text-primary)',
              marginBottom: '0.5rem'
            }}>
              {t.language}
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleLanguageChange('es')}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: lang === 'es' ? '2px solid var(--mr-primary)' : '2px solid var(--mr-border)',
                  borderRadius: '0.5rem',
                  background: lang === 'es' ? 'var(--mr-purple-bg)' : 'var(--mr-bg-card)',
                  color: lang === 'es' ? 'var(--mr-primary)' : 'var(--mr-text-primary)',
                  fontWeight: lang === 'es' ? '600' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Espanol
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: lang === 'en' ? '2px solid var(--mr-primary)' : '2px solid var(--mr-border)',
                  borderRadius: '0.5rem',
                  background: lang === 'en' ? 'var(--mr-purple-bg)' : 'var(--mr-bg-card)',
                  color: lang === 'en' ? 'var(--mr-primary)' : 'var(--mr-text-primary)',
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

        {/* Appearance Section */}
        <section style={{
          background: 'var(--mr-bg-card)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: 'var(--mr-shadow)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--mr-text-primary)',
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Sun size={20} style={{ color: 'var(--mr-primary)' }} />
            {t.appearanceSection}
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--mr-text-secondary)',
            marginBottom: '1.25rem'
          }}>
            {t.appearanceDescription}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {([
              { value: 'system' as const, label: t.themeSystem, icon: <Monitor size={16} /> },
              { value: 'light' as const, label: t.themeLight, icon: <Sun size={16} /> },
              { value: 'dark' as const, label: t.themeDark, icon: <Moon size={16} /> }
            ]).map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  border: theme === option.value ? '2px solid var(--mr-primary)' : '2px solid var(--mr-border)',
                  borderRadius: '0.5rem',
                  background: theme === option.value ? 'var(--mr-purple-bg)' : 'var(--mr-bg-card)',
                  color: theme === option.value ? 'var(--mr-primary)' : 'var(--mr-text-primary)',
                  fontWeight: theme === option.value ? '600' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Security Section */}
        <section style={{
          background: 'var(--mr-bg-card)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: 'var(--mr-shadow)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--mr-text-primary)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Shield size={20} style={{ color: 'var(--mr-primary)' }} />
            {t.securitySection}
          </h2>

          {isOAuth ? (
            /* OAuth: show connected account */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: 'var(--mr-bg-base)',
              borderRadius: '0.75rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--mr-purple-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={20} style={{ color: 'var(--mr-primary)' }} />
              </div>
              <div>
                <p style={{ fontWeight: '500', color: 'var(--mr-text-primary)', fontSize: '0.95rem' }}>
                  {t.connectedAccounts}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--mr-text-secondary)' }}>
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
                  background: passwordMessage.type === 'success' ? 'var(--mr-green-bg)' : 'var(--mr-red-bg)',
                  border: `1px solid ${passwordMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  color: passwordMessage.type === 'success' ? 'var(--mr-green-text)' : 'var(--mr-red)'
                }}>
                  {passwordMessage.text}
                </div>
              )}

              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '1px solid var(--mr-border-strong)',
                    borderRadius: '0.5rem',
                    background: 'var(--mr-bg-card)',
                    color: 'var(--mr-text-primary)',
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
                      color: 'var(--mr-text-primary)',
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
                          border: '1px solid var(--mr-border-strong)',
                          borderRadius: '0.5rem',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: 'var(--mr-bg-card)',
                          color: 'var(--mr-text-primary)'
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
                          color: 'var(--mr-text-tertiary)',
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
                      color: 'var(--mr-text-primary)',
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
                          border: '1px solid var(--mr-border-strong)',
                          borderRadius: '0.5rem',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: 'var(--mr-bg-card)',
                          color: 'var(--mr-text-primary)'
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
                          color: 'var(--mr-text-tertiary)',
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
                        background: 'var(--mr-gradient)',
                        color: 'var(--mr-text-inverse)',
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
                        background: 'var(--mr-bg-card)',
                        color: 'var(--mr-text-secondary)',
                        border: '1px solid var(--mr-border-strong)',
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
          background: 'var(--mr-bg-card)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: 'var(--mr-shadow)',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--mr-text-primary)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Trash2 size={20} style={{ color: 'var(--mr-red)' }} />
            {t.dataSection}
          </h2>

          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'var(--mr-bg-card)',
              color: 'var(--mr-red)',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--mr-red-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--mr-bg-card)'
            }}
          >
            {t.deleteAccount}
          </button>
        </section>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
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
              background: 'var(--mr-bg-card)',
              borderRadius: '1rem',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              maxWidth: '440px',
              width: 'calc(100% - 1rem)',
              boxShadow: 'var(--mr-shadow-lg)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowDeleteModal(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--mr-text-secondary)', padding: '0.75rem'
              }}
              aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
            >
              <X size={20} />
            </button>

            {/* Warning Icon */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'var(--mr-red-bg)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <AlertTriangle size={28} style={{ color: 'var(--mr-red)' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--mr-text-primary)', marginBottom: '0.5rem' }}>
                {t.deleteTitle}
              </h3>
              <p style={{ color: 'var(--mr-text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                {t.deleteMessage}
              </p>
            </div>

            {/* Confirmation Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--mr-text-primary)',
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
                  border: '1px solid var(--mr-border-strong)',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'var(--mr-bg-card)',
                  color: 'var(--mr-text-primary)'
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
                  background: deleteConfirm === t.deleteConfirmWord ? 'var(--mr-red)' : 'var(--mr-bg-hover)',
                  color: deleteConfirm === t.deleteConfirmWord ? 'var(--mr-text-inverse)' : 'var(--mr-text-tertiary)',
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
                  background: 'var(--mr-bg-card)',
                  color: 'var(--mr-text-primary)',
                  border: '1px solid var(--mr-border-strong)',
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
