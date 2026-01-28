'use client'

/**
 * Dashboard Page / Página del Dashboard
 * Shows user's analysis history and account info
 * Muestra historial de análisis e información de cuenta
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserMenu } from '@/components/auth'
import { supabase, getUserAnalysisStatus, checkCanBuyAddon, UserDashboardStatus } from '@/lib/supabase'
import { useGeo } from '@/lib/useGeo'
import { getPlanDisplayPrice, PRICING } from '@/lib/geoip'
import { getLanguageCookie, setLanguageCookie } from '@/lib/language'
import {
  Music,
  FileAudio,
  Calendar,
  TrendingUp,
  Crown,
  ChevronRight,
  ArrowLeft,
  Zap,
  FileText,
  BarChart3,
  Clock,
  Star,
  X,
  Download
} from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    dashboard: 'Dashboard',
    welcome: 'Bienvenido',
    yourAnalyses: 'Tus Análisis',
    noAnalyses: 'Aún no tienes análisis',
    startAnalyzing: 'Comienza analizando tu primera mezcla',
    analyzeNow: 'Analizar ahora',
    score: 'Puntuación',
    date: 'Fecha',
    filename: 'Archivo',
    viewDetails: 'Ver detalles',
    quickView: 'Vista Rápida',
    summaryView: 'Resumen',
    completeView: 'Completo',
    proRequired: 'Requiere Pro',
    upgradeToPro: 'Actualizar a Pro',
    upgradeDescription: 'Desbloquea análisis completos, descarga de PDFs y más',
    analysesThisMonth: 'Análisis restantes',
    totalAnalyses: 'Total de análisis',
    currentPlan: 'Plan actual',
    free: 'Gratis',
    pro: 'Pro',
    studio: 'Studio',
    backToHome: 'Volver al inicio',
    loading: 'Cargando...',
    verdicts: {
      ready: 'Listo para mastering',
      almost_ready: 'Casi listo',
      needs_work: 'Necesita trabajo',
      critical: 'Margen comprometido'
    },
    tabs: {
      rapid: 'Rápido',
      summary: 'Resumen',
      complete: 'Completo'
    },
    closeModal: 'Cerrar',
    unlockComplete: 'Desbloquea el análisis completo',
    unlockBenefits: [
      'Acceso a análisis Completo y Detallado',
      'Descargar PDFs completos',
      '30 análisis al mes',
      'Procesamiento prioritario'
    ],
    monthlyPrice: '$9.99/mes',
    getProNow: 'Obtener Pro',
    freeAnalysesLeft: 'análisis gratis restantes',
    lifetimeLimit: 'de por vida',
    proAnalysesLeft: 'análisis este mes',
    proLimit: 'de 30',
    addonAvailable: 'Necesitas más? Compra un paquete adicional',
    buyAddon: 'Comprar 10 análisis ($3.99)',
    singlePurchase: 'Comprar 1 análisis ($5.99)',
    limitReached: 'Límite alcanzado',
    upgradeNow: 'Actualizar ahora'
  },
  en: {
    dashboard: 'Dashboard',
    welcome: 'Welcome',
    yourAnalyses: 'Your Analyses',
    noAnalyses: "You don't have any analyses yet",
    startAnalyzing: 'Start by analyzing your first mix',
    analyzeNow: 'Analyze now',
    score: 'Score',
    date: 'Date',
    filename: 'File',
    viewDetails: 'View details',
    quickView: 'Quick View',
    summaryView: 'Summary',
    completeView: 'Complete',
    proRequired: 'Requires Pro',
    upgradeToPro: 'Upgrade to Pro',
    upgradeDescription: 'Unlock complete analyses, PDF downloads and more',
    analysesThisMonth: 'Analyses remaining',
    totalAnalyses: 'Total analyses',
    currentPlan: 'Current plan',
    free: 'Free',
    pro: 'Pro',
    studio: 'Studio',
    backToHome: 'Back to home',
    loading: 'Loading...',
    verdicts: {
      ready: 'Ready for mastering',
      almost_ready: 'Almost ready',
      needs_work: 'Needs work',
      critical: 'Compromised margin'
    },
    tabs: {
      rapid: 'Quick',
      summary: 'Summary',
      complete: 'Complete'
    },
    closeModal: 'Close',
    unlockComplete: 'Unlock complete analysis',
    unlockBenefits: [
      'Access to Complete and Detailed analysis',
      'Download complete PDFs',
      '30 analyses per month',
      'Priority processing'
    ],
    monthlyPrice: '$9.99/month',
    getProNow: 'Get Pro',
    freeAnalysesLeft: 'free analyses remaining',
    lifetimeLimit: 'lifetime',
    proAnalysesLeft: 'analyses this month',
    proLimit: 'of 30',
    addonAvailable: 'Need more? Buy an add-on pack',
    buyAddon: 'Buy 10 analyses ($3.99)',
    singlePurchase: 'Buy 1 analysis ($5.99)',
    limitReached: 'Limit reached',
    upgradeNow: 'Upgrade now'
  }
}

// ============================================================================
// CTA HELPER — replicates backend generate_cta() logic by score
// ============================================================================

function getCtaForScore(score: number, lang: 'es' | 'en'): { title: string; subtext: string; button: string } {
  if (score >= 85) {
    return lang === 'es'
      ? { title: 'Masterizar este track conmigo', subtext: 'Trabajo el mastering respetando esta mezcla y corrigiendo estos puntos.', button: 'Masterizar mi canción' }
      : { title: 'Master this track with me', subtext: "I'll master this respecting your mix and addressing these points.", button: 'Master my song' }
  }
  if (score >= 60) {
    return lang === 'es'
      ? { title: 'Ayuda con la mezcla antes del mastering', subtext: 'Revisión técnica para corregir estos puntos antes del master final.', button: 'Preparar mi mezcla' }
      : { title: 'Help with the mix before mastering', subtext: 'Technical review to address these points before the final master.', button: 'Prepare my mix' }
  }
  return lang === 'es'
    ? { title: '¿Revisamos tu mezcla juntos?', subtext: 'Te ayudo a identificar y resolver los puntos críticos de tu sesión.', button: 'Revisar mi mezcla' }
    : { title: "Let's review your mix together", subtext: "I'll help you identify and resolve the critical points in your session.", button: 'Review my mix' }
}

// ============================================================================
// TYPES
// ============================================================================

interface Analysis {
  id: string
  filename: string
  score: number
  verdict: 'ready' | 'almost_ready' | 'needs_work' | 'critical'
  report_visual: string | null
  report_short: string | null
  report_write: string | null
  metrics: any
  created_at: string
  lang: string
}

interface Profile {
  id: string
  full_name: string | null
  email: string
  total_analyses: number
  analyses_this_month: number
  analyses_lifetime_used: number
  preferred_language: string
}

// Dashboard state types per spec
type DashboardState =
  | 'new_user'        // 0 analyses, show 2 free available
  | 'has_analyses'    // Has analyses, show history
  | 'free_limit_reached' // Free user, 2 used, upgrade CTA
  | 'pro_active'      // Pro with analyses remaining
  | 'pro_limit_reached' // Pro at 30, addon CTA
  | 'pro_expired'     // Pro cancelled, read-only

interface Subscription {
  id: string
  status: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  plan: {
    type: 'free' | 'pro' | 'studio'
    name: string
  }
}

// ============================================================================
// HELPER: Clean and format report text for display
// ============================================================================

const cleanReportText = (text: string): string => {
  if (!text) return ''

  return text
    // Remove song title header (already shown above)
    .replace(/^🎵\s*Sobre\s*"[^"]*"\s*\n*/i, '')
    .replace(/^🎵\s*About\s*"[^"]*"\s*\n*/i, '')
    // Remove score and verdict lines (already shown in header)
    .replace(/^Puntuación:\s*\d+\/100\s*\n*/im, '')
    .replace(/^Score:\s*\d+\/100\s*\n*/im, '')
    .replace(/^Puntuación MR:\s*\d+\/100\s*\n*/im, '')
    .replace(/^MR Score:\s*\d+\/100\s*\n*/im, '')
    .replace(/^Veredicto:\s*[^\n]+\s*\n*/im, '')
    .replace(/^Verdict:\s*[^\n]+\s*\n*/im, '')
    // Remove ALL decorative lines (multiple patterns)
    .replace(/[═─━_]{3,}/g, '')              // Lines with 3+ chars (including underscores)
    .replace(/^[═─━_\s]+$/gm, '')            // Lines that are ONLY decorative chars
    .replace(/[═─━]{2,}/g, '')              // Lines with 2+ chars (more aggressive)
    // Fix headers: Add emojis and proper casing (ONLY if not already present)
    .replace(/(?<!✅\s)ASPECTOS POSITIVOS/g, '✅ Aspectos Positivos')
    .replace(/(?<!✅\s)POSITIVE ASPECTS/g, '✅ Positive Aspects')
    .replace(/(?<!⚠️\s)ASPECTOS PARA REVISAR/g, '⚠️ Aspectos para Revisar')
    .replace(/(?<!⚠️\s)AREAS TO REVIEW/g, '⚠️ Areas to Review')
    .replace(/(?<!⚠️\s)ÁREAS A MEJORAR/g, '⚠️ Áreas a Mejorar')
    .replace(/(?<!⚠️\s)AREAS TO IMPROVE/g, '⚠️ Areas to Improve')
    // Fix additional headers
    .replace(/(?<!⚠️\s)SI ESTE ARCHIVO CORRESPONDE A UNA MEZCLA:/g, '⚠️ Si este archivo corresponde a una mezcla:')
    .replace(/(?<!⚠️\s)IF THIS FILE IS A MIX:/g, '⚠️ If this file is a mix:')
    .replace(/(?<!✅\s)SI ESTE ES TU MASTER FINAL:/g, '✅ Si este es tu master final:')
    .replace(/(?<!✅\s)IF THIS IS YOUR FINAL MASTER:/g, '✅ If this is your final master:')
    // Convert plain checkmarks and arrows to styled ones
    .replace(/^✓\s*/gm, '• ')
    .replace(/^→\s*/gm, '• ')
    // Add recommendation emoji if missing
    .replace(/(?<!💡\s)Recomendación:/g, '💡 Recomendación:')
    .replace(/(?<!💡\s)Recommendation:/g, '💡 Recommendation:')
    // Remove duplicate emojis
    .replace(/✅\s*✅/g, '✅')
    .replace(/⚠️\s*⚠️/g, '⚠️')
    // Remove excessive newlines (max 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Remove lines that are just spaces
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final cleanup - max 2 newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim()
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [reportTab, setReportTab] = useState<'rapid' | 'summary' | 'complete'>('rapid')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [userStatus, setUserStatus] = useState<UserDashboardStatus | null>(null)
  const [dashboardState, setDashboardState] = useState<DashboardState>('new_user')
  const [canBuyAddon, setCanBuyAddon] = useState(false)

  const { geo } = useGeo()
  const t = translations[lang]
  const isPro = subscription?.plan?.type === 'pro' || subscription?.plan?.type === 'studio'

  // Calculate regional prices with local currency display
  const proPrice = getPlanDisplayPrice(PRICING.PRO_MONTHLY, geo)
  const singlePrice = getPlanDisplayPrice(PRICING.SINGLE, geo)
  const addonPrice = getPlanDisplayPrice(PRICING.ADDON_PACK, geo)

  // Detect language: cookie > browser
  useEffect(() => {
    const cookieLang = getLanguageCookie()
    if (cookieLang) {
      setLang(cookieLang)
    } else if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0]
      setLang(browserLang === 'es' ? 'es' : 'en')
    }
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
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          if (profileData.preferred_language === 'en' || profileData.preferred_language === 'es') {
            setLang(profileData.preferred_language as 'es' | 'en')
          }
        }

        // Fetch subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select(`
            *,
            plan:plans(type, name)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (subData) {
          setSubscription(subData)
        }

        // Fetch analyses
        const { data: analysesData } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50)

        if (analysesData) {
          setAnalyses(analysesData)
        }

        // Fetch user analysis status
        const status = await getUserAnalysisStatus()
        if (status) {
          setUserStatus(status)

          // Determine dashboard state based on spec
          if (status.subscription_status === 'canceled' || status.subscription_status === 'past_due') {
            setDashboardState('pro_expired')
          } else if (status.plan_type === 'pro' || status.plan_type === 'studio') {
            if (status.analyses_used >= 30 && status.addon_remaining === 0) {
              setDashboardState('pro_limit_reached')
            } else {
              setDashboardState('pro_active')
            }
          } else {
            // Free plan
            if (status.analyses_used >= 2) {
              setDashboardState('free_limit_reached')
            } else if (status.analyses_used === 0 && (!analysesData || analysesData.length === 0)) {
              setDashboardState('new_user')
            } else {
              setDashboardState('has_analyses')
            }
          }

          // Check if Pro user can buy addon
          if (status.plan_type === 'pro') {
            const addonCheck = await checkCanBuyAddon()
            setCanBuyAddon(addonCheck.can_buy)
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#3b82f6'
    if (score >= 40) return '#f59e0b'
    return '#ef4444'
  }

  // Get verdict color
  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'ready': return '#10b981'
      case 'almost_ready': return '#3b82f6'
      case 'needs_work': return '#f59e0b'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Handle tab click for complete (pro only)
  const handleTabClick = (tab: 'rapid' | 'summary' | 'complete') => {
    if (tab === 'complete' && !isPro) {
      setShowUpgradeModal(true)
      return
    }
    setReportTab(tab)
  }

  // Handle Stripe checkout
  const handleCheckout = async (productType: 'pro_monthly' | 'single' | 'addon') => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType,
          countryCode: geo.countryCode
        })
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
        alert(lang === 'es' ? 'Error al iniciar el pago' : 'Error starting payment')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(lang === 'es' ? 'Error al iniciar el pago' : 'Error starting payment')
    }
  }

  // Handle customer portal
  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/customer-portal', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Portal error:', data.error)
      }
    } catch (error) {
      console.error('Portal error:', error)
    }
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '1.25rem' }}>{t.loading}</div>
      </div>
    )
  }

  // Not logged in (will redirect)
  if (!user) {
    return null
  }

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
          {/* Left side: Logo */}
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

          {/* Right side: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language Toggle */}
            <button
              onClick={() => {
                const newLang = lang === 'es' ? 'en' : 'es'
                setLang(newLang)
                setLanguageCookie(newLang)
                // Also persist to profile for logged-in users
                if (user) {
                  supabase
                    .from('profiles')
                    .update({ preferred_language: newLang })
                    .eq('id', user.id)
                    .then(({ error }) => {
                      if (error) console.error('Error saving language preference:', error)
                    })
                }
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

            {/* User Menu with Logout */}
            <UserMenu lang={lang} />

            {/* Analyze Button */}
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
              {lang === 'es' ? 'Analizar' : 'Analyze'}
            </Link>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Welcome & Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Welcome Card */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '1rem',
            padding: '1.5rem',
            color: 'white',
            gridColumn: 'span 2'
          }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {t.welcome}, {(user.user_metadata?.full_name || profile?.full_name || user.email?.split('@')[0])?.split(' ')[0]}!
            </h1>
            <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>
              {t.dashboard}
            </p>
          </div>

          {/* Plan Card */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {isPro ? <Crown size={20} style={{ color: '#f59e0b' }} /> : <Star size={20} style={{ color: '#6b7280' }} />}
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t.currentPlan}</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
              {isPro ? (subscription?.plan?.type === 'studio' ? t.studio : t.pro) : t.free}
            </p>
            {!isPro && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Crown size={14} />
                {t.upgradeToPro}
              </button>
            )}
            {isPro && subscription?.stripe_subscription_id && (
              <button
                onClick={handleManageSubscription}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {lang === 'es' ? 'Administrar suscripción' : 'Manage subscription'}
              </button>
            )}
          </div>

          {/* Analyses Remaining - Updated per spec */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            ...(dashboardState === 'free_limit_reached' || dashboardState === 'pro_limit_reached' ? {
              border: '2px solid #f59e0b'
            } : {})
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Clock size={20} style={{ color: dashboardState.includes('limit') ? '#f59e0b' : '#3b82f6' }} />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {isPro ? t.proAnalysesLeft : t.freeAnalysesLeft}
              </span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
              {isPro ? (
                <>
                  {userStatus ? Math.max(0, 30 - userStatus.analyses_used + userStatus.addon_remaining) : 30}
                  <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}>
                    {' '}{t.proLimit}
                  </span>
                </>
              ) : (
                <>
                  {userStatus ? Math.max(0, 2 - userStatus.analyses_used) : 2}
                  <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}>
                    {' / 2 '}{t.lifetimeLimit}
                  </span>
                </>
              )}
            </p>
            {/* Limit reached CTAs */}
            {dashboardState === 'free_limit_reached' && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  style={{
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t.upgradeNow}
                </button>
              </div>
            )}
            {dashboardState === 'pro_limit_reached' && canBuyAddon && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  onClick={() => handleCheckout('addon')}
                  style={{
                    padding: '0.5rem',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {lang === 'es' ? 'Comprar 10 análisis' : 'Buy 10 analyses'} ({addonPrice.showLocal ? `~${addonPrice.formattedLocal}` : addonPrice.formatted})
                </button>
              </div>
            )}
          </div>

          {/* Total Analyses */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <BarChart3 size={20} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t.totalAnalyses}</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
              {profile?.total_analyses || 0}
            </p>
          </div>
        </div>

        {/* Analyses Summary */}
        {analyses.length > 0 && (() => {
          const ready = analyses.filter(a => a.score >= 85).length
          const adjustments = analyses.filter(a => a.score >= 60 && a.score < 85).length
          const review = analyses.filter(a => a.score < 60).length
          return (
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '1rem'
              }}>
                {lang === 'es' ? 'Resumen de tus análisis' : 'Your analyses summary'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.925rem', color: '#374151' }}>
                  <span>✅</span>
                  <span><strong>{ready}</strong> {lang === 'es' ? (ready === 1 ? 'lista para mastering' : 'listas para mastering') : 'ready for mastering'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.925rem', color: '#374151' }}>
                  <span>🔧</span>
                  <span><strong>{adjustments}</strong> {lang === 'es' ? (adjustments === 1 ? 'necesita ajustes' : 'necesitan ajustes') : (adjustments === 1 ? 'needs adjustments' : 'need adjustments')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.925rem', color: '#374151' }}>
                  <span>⚠️</span>
                  <span><strong>{review}</strong> {lang === 'es' ? (review === 1 ? 'requiere revisión' : 'requieren revisión') : (review === 1 ? 'requires review' : 'require review')}</span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Analyses List */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FileAudio size={20} />
            {t.yourAnalyses}
          </h2>

          {analyses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#6b7280'
            }}>
              <FileAudio size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{t.noAnalyses}</p>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>{t.startAnalyzing}</p>
              <Link
                href="/#analyze"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600'
                }}
              >
                <Zap size={18} />
                {t.analyzeNow}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  onClick={() => setSelectedAnalysis(analysis)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea'
                    e.currentTarget.style.background = '#f0f4ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent'
                    e.currentTarget.style.background = '#f9fafb'
                  }}
                >
                  {/* Score */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: `conic-gradient(${getScoreColor(analysis.score)} ${analysis.score * 3.6}deg, #e5e7eb 0deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1rem',
                      color: getScoreColor(analysis.score)
                    }}>
                      {analysis.score}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {analysis.filename}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      <span style={{
                        color: getVerdictColor(analysis.verdict),
                        fontWeight: '500'
                      }}>
                        {t.verdicts[analysis.verdict as keyof typeof t.verdicts]}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {formatDate(analysis.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={20} style={{ color: '#9ca3af', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                  {selectedAnalysis.filename}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {formatDate(selectedAnalysis.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Score */}
            <div style={{
              padding: '1.5rem',
              background: '#f9fafb',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `conic-gradient(${getScoreColor(selectedAnalysis.score)} ${selectedAnalysis.score * 3.6}deg, #e5e7eb 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '66px',
                  height: '66px',
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1.5rem',
                  color: getScoreColor(selectedAnalysis.score)
                }}>
                  {selectedAnalysis.score}
                </div>
              </div>
              <div>
                <p style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: getVerdictColor(selectedAnalysis.verdict),
                  marginBottom: '0.25rem'
                }}>
                  {t.verdicts[selectedAnalysis.verdict as keyof typeof t.verdicts]}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {t.score}: {selectedAnalysis.score}/100
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              padding: '0 1.5rem'
            }}>
              {(['rapid', 'summary', 'complete'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: reportTab === tab ? '2px solid #667eea' : '2px solid transparent',
                    color: reportTab === tab ? '#667eea' : '#6b7280',
                    fontWeight: reportTab === tab ? '600' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    position: 'relative'
                  }}
                >
                  {tab === 'rapid' && <Zap size={16} />}
                  {tab === 'summary' && <FileText size={16} />}
                  {tab === 'complete' && (
                    !isPro ? <Crown size={16} style={{ color: '#d97706' }} /> : <TrendingUp size={16} />
                  )}
                  {t.tabs[tab]}
                  {tab === 'complete' && !isPro && (
                    <span style={{
                      fontSize: '0.625rem',
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '9999px',
                      fontWeight: '500'
                    }}>
                      PRO
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '1.5rem'
            }}>
              {reportTab === 'rapid' && (
                <div>
                  {/* Title */}
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    ⚡ {lang === 'es' ? 'Análisis Rápido' : 'Quick Analysis'}
                  </h4>

                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                    🎵 {lang === 'es' ? 'Sobre' : 'About'} "{selectedAnalysis.filename}"
                  </p>

                  {/* Visual Metrics Bars */}
                  {selectedAnalysis.metrics?.metrics_bars && Object.keys(selectedAnalysis.metrics.metrics_bars).length > 0 && (
                    <div style={{
                      background: '#fef7f0',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                      border: '1px solid #fed7aa'
                    }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        📊 {lang === 'es' ? 'Áreas de Atención Prioritaria' : 'Priority Attention Areas'}
                      </h4>

                      <p style={{
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        marginBottom: '1rem',
                        lineHeight: '1.4',
                        fontStyle: 'italic'
                      }}>
                        {lang === 'es'
                          ? 'Estos indicadores no significan que tu mezcla esté mal, sino que hay decisiones técnicas que vale la pena revisar antes del máster final.'
                          : 'These indicators don\'t mean your mix is wrong, but there are technical decisions worth reviewing before the final master.'}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(() => {
                          const bars = selectedAnalysis.metrics.metrics_bars;
                          const metricLabels: { [key: string]: { es: string; en: string } } = {
                            headroom: { es: 'Headroom', en: 'Headroom' },
                            true_peak: { es: 'True Peak', en: 'True Peak' },
                            dynamic_range: { es: 'Rango Dinámico', en: 'Dynamic Range' },
                            plr: { es: 'PLR', en: 'PLR' },
                            loudness: { es: 'Loudness (LUFS)', en: 'Loudness (LUFS)' },
                            lufs: { es: 'LUFS', en: 'LUFS' },
                            "lufs_(integrated)": { es: 'LUFS', en: 'LUFS' },
                            stereo_width: { es: 'Imagen Estéreo', en: 'Stereo Width' },
                            stereo_correlation: { es: 'Correlación', en: 'Correlation' },
                            frequency_balance: { es: 'Balance Frecuencias', en: 'Freq. Balance' },
                            tonal_balance: { es: 'Balance Frecuencias', en: 'Freq. Balance' }
                          };

                          const statusColors: { [key: string]: string } = {
                            excellent: '#10b981',
                            good: '#3b82f6',
                            warning: '#f59e0b',
                            critical: '#ef4444'
                          };

                          const orderedKeys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'lufs', 'lufs_(integrated)', 'loudness', 'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance'];
                          const displayedKeys = orderedKeys.filter(key => bars[key]);

                          return displayedKeys.map((key) => {
                            const bar = bars[key];
                            const label = metricLabels[key] || { es: key, en: key };
                            const color = statusColors[bar.status] || '#6b7280';

                            return (
                              <div
                                key={key}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                              >
                                <div style={{
                                  minWidth: '100px',
                                  maxWidth: '120px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: '#4b5563',
                                  textAlign: 'right'
                                }}>
                                  {lang === 'es' ? label.es : label.en}
                                </div>
                                <div style={{
                                  flex: 1,
                                  background: '#e5e7eb',
                                  borderRadius: '9999px',
                                  height: '0.5rem',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    background: color,
                                    height: '100%',
                                    borderRadius: '9999px',
                                    width: `${bar.percentage}%`,
                                    transition: 'width 0.5s ease-out'
                                  }} />
                                </div>
                                <div style={{
                                  minWidth: '45px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: color,
                                  textAlign: 'right'
                                }}>
                                  {bar.percentage}%
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Legend */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        marginTop: '1rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb',
                        fontSize: '0.65rem',
                        color: '#6b7280'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                          {lang === 'es' ? 'Margen cómodo' : 'Comfortable'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                          {lang === 'es' ? 'Margen suficiente' : 'Sufficient'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                          {lang === 'es' ? 'Margen reducido' : 'Reduced'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                          {lang === 'es' ? 'Margen comprometido' : 'Compromised'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Text Report */}
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.875rem',
                    lineHeight: '1.8',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#374151'
                  }}>
                    {cleanReportText(selectedAnalysis.report_visual || '') || (lang === 'es' ? 'No hay datos de análisis rápido disponibles.' : 'No quick analysis data available.')}
                  </div>
                </div>
              )}
              {reportTab === 'summary' && (
                <div style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: '1.8',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  margin: 0,
                  color: '#374151'
                }}>
                  {cleanReportText(selectedAnalysis.report_short || '') || (lang === 'es' ? 'No hay datos de resumen disponibles.' : 'No summary data available.')}
                </div>
              )}
              {reportTab === 'complete' && isPro && (
                <div style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: '1.8',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  margin: 0,
                  color: '#374151'
                }}>
                  {cleanReportText(selectedAnalysis.report_write || '') || (lang === 'es' ? 'No hay datos de análisis completo disponibles.' : 'No complete analysis data available.')}
                </div>
              )}

              {/* CTA — dynamic based on score */}
              {(() => {
                const cta = getCtaForScore(selectedAnalysis.score, lang)
                const score = selectedAnalysis.score
                const emoji = score >= 85 ? '🎧' : score >= 60 ? '🔧' : score >= 40 ? '🔍' : score >= 20 ? '🔍' : '💬'
                return (
                  <div style={{
                    background: 'linear-gradient(to bottom right, #818cf8 0%, #6366f1 100%)',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    marginTop: '1.5rem',
                    color: 'white',
                    boxShadow: '0 10px 25px rgba(99, 102, 241, 0.15)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      {/* Icon circle — dynamic */}
                      <div style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '1.375rem' }}>{emoji}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                          {cta.title}
                        </p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.9, margin: 0, lineHeight: 1.4 }}>
                          {cta.subtext}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowContactModal(true)}
                      style={{
                        background: 'white',
                        color: '#6366f1',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        transition: 'all 0.2s',
                        marginLeft: '3.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                      }}
                    >
                      {cta.button}
                    </button>
                  </div>
                )
              })()}

              {/* Download Buttons */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                {/* Download Rápido - Available for all */}
                {reportTab === 'rapid' && selectedAnalysis.report_visual && (
                  <button
                    onClick={() => {
                      const content = `MasteringReady - Análisis Rápido\n${'='.repeat(40)}\n\nArchivo: ${selectedAnalysis.filename}\nPuntuación: ${selectedAnalysis.score}/100\nFecha: ${new Date(selectedAnalysis.created_at).toLocaleDateString()}\n\n${selectedAnalysis.report_visual}`
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${selectedAnalysis.filename.replace(/\.[^/.]+$/, '')}_rapido.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Download size={16} />
                    {lang === 'es' ? 'Descargar Rápido' : 'Download Quick'}
                  </button>
                )}

                {/* Download Resumen - Available for all */}
                {reportTab === 'summary' && selectedAnalysis.report_short && (
                  <button
                    onClick={() => {
                      const content = `MasteringReady - Resumen\n${'='.repeat(40)}\n\nArchivo: ${selectedAnalysis.filename}\nPuntuación: ${selectedAnalysis.score}/100\nFecha: ${new Date(selectedAnalysis.created_at).toLocaleDateString()}\n\n${selectedAnalysis.report_short}`
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${selectedAnalysis.filename.replace(/\.[^/.]+$/, '')}_resumen.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Download size={16} />
                    {lang === 'es' ? 'Descargar Resumen' : 'Download Summary'}
                  </button>
                )}

                {/* Download Completo - Pro only */}
                {reportTab === 'complete' && isPro && selectedAnalysis.report_write && (
                  <button
                    onClick={() => {
                      const content = `MasteringReady - Análisis Completo\n${'='.repeat(40)}\n\nArchivo: ${selectedAnalysis.filename}\nPuntuación: ${selectedAnalysis.score}/100\nFecha: ${new Date(selectedAnalysis.created_at).toLocaleDateString()}\n\n${selectedAnalysis.report_write}`
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${selectedAnalysis.filename.replace(/\.[^/.]+$/, '')}_completo.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Download size={16} />
                    {lang === 'es' ? 'Descargar Completo' : 'Download Complete'}
                  </button>
                )}

                {/* Upgrade prompt for Completo when not Pro */}
                {reportTab === 'complete' && !isPro && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Crown size={16} />
                    {lang === 'es' ? 'Ver con Pro' : 'View with Pro'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>

            {/* Crown Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Crown size={28} style={{ color: '#d97706' }} />
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.375rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              {t.unlockComplete}
            </h3>

            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {t.upgradeDescription}
            </p>

            {/* Benefits */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              {t.unlockBenefits.map((benefit, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <TrendingUp size={12} style={{ color: '#16a34a' }} />
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#374151' }}>
                    {benefit}
                  </span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div style={{
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              {proPrice.showLocal ? (
                <>
                  <span style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: '#111827'
                  }}>
                    ~{proPrice.formattedLocal}
                  </span>
                  <span style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    display: 'block',
                    marginTop: '0.25rem'
                  }}>
                    ({proPrice.formatted}/{lang === 'es' ? 'mes' : 'month'})
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    display: 'block',
                    marginTop: '0.25rem'
                  }}>
                    {lang === 'es' ? 'Cobro en USD' : 'Charged in USD'}
                  </span>
                </>
              ) : (
                <span style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#111827'
                }}>
                  {proPrice.formatted}/{lang === 'es' ? 'mes' : 'month'}
                </span>
              )}
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                setShowUpgradeModal(false)
                handleCheckout('pro_monthly')
              }}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Crown size={18} />
              {t.getProNow}
            </button>

            {/* Single purchase option */}
            <div style={{
              textAlign: 'center',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                {lang === 'es' ? 'O compra un análisis individual' : 'Or buy a single analysis'}
              </p>
              <button
                onClick={() => {
                  setShowUpgradeModal(false)
                  handleCheckout('single')
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  color: '#667eea',
                  border: '1px solid #667eea',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {singlePrice.showLocal ? (
                  <>~{singlePrice.formattedLocal}</>
                ) : (
                  <>{singlePrice.formatted}</>
                )} - {lang === 'es' ? '1 análisis' : '1 analysis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div
          onClick={() => setShowContactModal(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowContactModal(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6b7280', padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎧</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? '¡Trabajemos juntos!' : "Let's work together!"}
              </h3>
              <p style={{ color: '#6b7280' }}>
                {lang === 'es' ? 'Elige cómo prefieres contactarme:' : 'Choose how you prefer to contact me:'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* WhatsApp */}
              <a
                href={`https://wa.me/573155576115?text=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola! Acabo de analizar mi mezcla en Mastering Ready y me gustaría hablar sobre el mastering.\n\nPuntuación obtenida: ${selectedAnalysis?.score || 'N/A'}/100`
                    : `Hi! I just analyzed my mix on Mastering Ready and would like to talk about mastering.\n\nScore obtained: ${selectedAnalysis?.score || 'N/A'}/100`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', background: '#f0fdf4',
                  border: '1px solid #86efac', borderRadius: '0.75rem',
                  textDecoration: 'none', color: '#166534', cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📱</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>WhatsApp</div>
                  <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
                    {lang === 'es' ? 'Mensaje directo instantáneo' : 'Instant direct message'}
                  </div>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:mat@matcarvy.com?subject=${encodeURIComponent(
                  lang === 'es' ? 'Solicitud de Mastering - Mastering Ready' : 'Mastering Request - Mastering Ready'
                )}&body=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola Matías,\n\nAcabo de analizar mi mezcla en Mastering Ready y me gustaría hablar sobre el proceso de mastering.\n\nPuntuación obtenida: ${selectedAnalysis?.score || 'N/A'}/100\nArchivo: ${selectedAnalysis?.filename || 'N/A'}\n\nGracias!`
                    : `Hi Matías,\n\nI just analyzed my mix on Mastering Ready and would like to discuss the mastering process.\n\nScore obtained: ${selectedAnalysis?.score || 'N/A'}/100\nFile: ${selectedAnalysis?.filename || 'N/A'}\n\nThanks!`
                )}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', background: '#eff6ff',
                  border: '1px solid #93c5fd', borderRadius: '0.75rem',
                  textDecoration: 'none', color: '#1e40af', cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>mat@matcarvy.com</div>
                </div>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/matcarvy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', background: '#fdf2f8',
                  border: '1px solid #f9a8d4', borderRadius: '0.75rem',
                  textDecoration: 'none', color: '#9f1239', cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📷</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Instagram</div>
                  <div style={{ fontSize: '0.875rem', color: '#be123c' }}>@matcarvy</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
