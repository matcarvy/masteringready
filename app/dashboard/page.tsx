'use client'

/**
 * Dashboard Page / Página del Dashboard
 * Shows user's analysis history and account info
 * Muestra historial de análisis e información de cuenta
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth'
import { supabase } from '@/lib/supabase'
import {
  Music,
  FileAudio,
  Calendar,
  TrendingUp,
  Lock,
  Crown,
  ChevronRight,
  ArrowLeft,
  Zap,
  FileText,
  BarChart3,
  Clock,
  Star,
  X
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
    upgradeDescription: 'Desbloquea análisis completos, descargas ilimitadas y más',
    analysesThisMonth: 'Análisis este mes',
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
      'Análisis ilimitados',
      'Procesamiento prioritario'
    ],
    monthlyPrice: '$9.99/mes',
    getProNow: 'Obtener Pro'
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
    upgradeDescription: 'Unlock complete analyses, unlimited downloads and more',
    analysesThisMonth: 'Analyses this month',
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
      'Unlimited analyses',
      'Priority processing'
    ],
    monthlyPrice: '$9.99/month',
    getProNow: 'Get Pro'
  }
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
  preferred_language: string
}

interface Subscription {
  id: string
  status: string
  plan: {
    type: 'free' | 'pro' | 'studio'
    name: string
  }
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

  const t = translations[lang]
  const isPro = subscription?.plan?.type === 'pro' || subscription?.plan?.type === 'studio'

  // Detect language
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#6b7280',
                textDecoration: 'none',
                fontSize: '0.875rem'
              }}
            >
              <ArrowLeft size={16} />
              {t.backToHome}
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Language Toggle - Single button like main page */}
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              style={{
                padding: '0.375rem 0.75rem',
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

            {/* Logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
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
              <span style={{ fontWeight: '700', color: '#111827' }}>MasteringReady</span>
            </div>
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
              {t.welcome}, {profile?.full_name || user.email?.split('@')[0]}!
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
          </div>

          {/* Analyses This Month */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Clock size={20} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t.analysesThisMonth}</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
              {profile?.analyses_this_month || 0}
              <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}>
                {' '}/ {isPro ? '∞' : '3'}
              </span>
            </p>
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
                href="/"
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
                    !isPro ? <Lock size={16} /> : <TrendingUp size={16} />
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
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  margin: 0,
                  color: '#374151'
                }}>
                  {selectedAnalysis.report_visual || lang === 'es' ? 'No hay datos de análisis rápido disponibles.' : 'No quick analysis data available.'}
                </pre>
              )}
              {reportTab === 'summary' && (
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  margin: 0,
                  color: '#374151'
                }}>
                  {selectedAnalysis.report_short || lang === 'es' ? 'No hay datos de resumen disponibles.' : 'No summary data available.'}
                </pre>
              )}
              {reportTab === 'complete' && isPro && (
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  margin: 0,
                  color: '#374151'
                }}>
                  {selectedAnalysis.report_write || lang === 'es' ? 'No hay datos de análisis completo disponibles.' : 'No complete analysis data available.'}
                </pre>
              )}
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
              <span style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#111827'
              }}>
                {t.monthlyPrice}
              </span>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                // TODO: Implement Stripe checkout
                alert(lang === 'es' ? 'Próximamente! Stripe checkout' : 'Coming soon! Stripe checkout')
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
          </div>
        </div>
      )}
    </div>
  )
}
