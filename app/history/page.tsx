'use client'

/**
 * History Page / Página de Historial
 * Shows all user analyses with filters and pagination
 * Muestra todos los análisis del usuario con filtros y paginación
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserMenu } from '@/components/auth'
import { supabase, createFreshQueryClient } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import {
  Music,
  FileAudio,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Zap,
  X,
  TrendingUp,
  Crown,
  FileText,
  Download,
  SlidersHorizontal
} from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Historial de Análisis',
    subtitle: 'Todos tus análisis en un solo lugar',
    loading: 'Cargando...',
    noAnalyses: 'No tienes análisis aún. ¡Sube tu primera mezcla!',
    analyzeFirst: 'Analizar mi primera mezcla',
    sortBy: 'Ordenar por',
    sortNewest: 'Más recientes',
    sortOldest: 'Más antiguos',
    sortScoreHigh: 'Mayor puntuación',
    sortScoreLow: 'Menor puntuación',
    statusFilter: 'Estado',
    statusAll: 'Todos',
    statusReady: 'Listas para mastering',
    statusNeedsWork: 'Necesitan ajustes',
    statusReview: 'Requieren revisión',
    showing: 'Mostrando',
    of: 'de',
    analyses: 'análisis',
    previous: 'Anterior',
    next: 'Siguiente',
    score: 'Puntuación',
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
    analyze: 'Analizar'
  },
  en: {
    title: 'Analysis History',
    subtitle: 'All your analyses in one place',
    loading: 'Loading...',
    noAnalyses: "You don't have any analyses yet. Upload your first mix!",
    analyzeFirst: 'Analyze my first mix',
    sortBy: 'Sort by',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    sortScoreHigh: 'Highest score',
    sortScoreLow: 'Lowest score',
    statusFilter: 'Status',
    statusAll: 'All',
    statusReady: 'Ready for mastering',
    statusNeedsWork: 'Need adjustments',
    statusReview: 'Require review',
    showing: 'Showing',
    of: 'of',
    analyses: 'analyses',
    previous: 'Previous',
    next: 'Next',
    score: 'Score',
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
    analyze: 'Analyze'
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
  interpretations: any
  strict_mode: boolean
  created_at: string
  lang: string
  duration_seconds: number | null
  sample_rate: number | null
  bit_depth: number | null
  file_size_bytes: number | null
  file_format: string | null
  channels: number | null
}

type SortOption = 'newest' | 'oldest' | 'score_high' | 'score_low'
type StatusFilter = 'all' | 'ready' | 'needs_work' | 'review'

const PAGE_SIZE = 20

// ============================================================================
// HELPER: Clean report text
// ============================================================================

const cleanReportText = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/^🎵\s*Sobre\s*"[^"]*"\s*\n*/i, '')
    .replace(/^🎵\s*About\s*"[^"]*"\s*\n*/i, '')
    .replace(/^Puntuación:\s*\d+\/100\s*\n*/im, '')
    .replace(/^Score:\s*\d+\/100\s*\n*/im, '')
    .replace(/^Puntuación MR:\s*\d+\/100\s*\n*/im, '')
    .replace(/^MR Score:\s*\d+\/100\s*\n*/im, '')
    .replace(/^Veredicto:\s*[^\n]+\s*\n*/im, '')
    .replace(/^Verdict:\s*[^\n]+\s*\n*/im, '')
    .replace(/[═─━_]{3,}/g, '')
    .replace(/^[═─━_\s]+$/gm, '')
    .replace(/[═─━]{2,}/g, '')
    .replace(/(?<!✅\s)ASPECTOS POSITIVOS/g, '✅ Aspectos Positivos')
    .replace(/(?<!✅\s)POSITIVE ASPECTS/g, '✅ Positive Aspects')
    .replace(/(?<!⚠️\s)ASPECTOS PARA REVISAR/g, '⚠️ Aspectos para Revisar')
    .replace(/(?<!⚠️\s)AREAS TO REVIEW/g, '⚠️ Areas to Review')
    .replace(/(?<!⚠️\s)ÁREAS A MEJORAR/g, '⚠️ Áreas a Mejorar')
    .replace(/(?<!⚠️\s)AREAS TO IMPROVE/g, '⚠️ Areas to Improve')
    .replace(/(?<!⚠️\s)SI ESTE ARCHIVO CORRESPONDE A UNA MEZCLA:/g, '⚠️ Si este archivo corresponde a una mezcla:')
    .replace(/(?<!⚠️\s)IF THIS FILE IS A MIX:/g, '⚠️ If this file is a mix:')
    .replace(/(?<!✅\s)SI ESTE ES TU MASTER FINAL:/g, '✅ Si este es tu master final:')
    .replace(/(?<!✅\s)IF THIS IS YOUR FINAL MASTER:/g, '✅ If this is your final master:')
    .replace(/^✓\s*/gm, '• ')
    .replace(/^→\s*/gm, '• ')
    .replace(/(?<!💡\s)Recomendación:/g, '💡 Recomendación:')
    .replace(/(?<!💡\s)Recommendation:/g, '💡 Recommendation:')
    .replace(/✅\s*✅/g, '✅')
    .replace(/⚠️\s*⚠️/g, '⚠️')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function HistoryPage() {
  const router = useRouter()
  const { user, session, loading: authLoading } = useAuth()

  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [isMobile, setIsMobile] = useState(false)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [reportTab, setReportTab] = useState<'rapid' | 'summary' | 'complete'>('rapid')

  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Check if Pro (for complete tab)
  const [isPro, setIsPro] = useState(false)

  const t = translations[lang]

  // Detect language
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

  // Fetch data (fresh client avoids stale singleton after SPA navigation)
  useEffect(() => {
    async function fetchData() {
      if (!user || !session?.access_token) return
      setLoading(true)

      try {
        const client = await createFreshQueryClient(
          { access_token: session.access_token, refresh_token: session.refresh_token }
        )
        if (!client) return

        // Check subscription
        const { data: subData } = await client
          .from('subscriptions')
          .select('*, plan:plans(type, name)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (subData?.plan?.type === 'pro' || subData?.plan?.type === 'studio') {
          setIsPro(true)
        }

        // Fetch ALL analyses (no limit for history)
        const { data: analysesData } = await client
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (analysesData) {
          setAnalyses(analysesData)
        }
      } catch (error) {
        console.error('Error fetching history data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && session?.access_token) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [sortBy, statusFilter])

  // Filtered and sorted analyses
  const filteredAnalyses = analyses
    .filter(a => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'ready') return a.score >= 85
      if (statusFilter === 'needs_work') return a.score >= 60 && a.score < 85
      if (statusFilter === 'review') return a.score < 60
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'score_high': return b.score - a.score
        case 'score_low': return a.score - b.score
        default: return 0
      }
    })

  // Pagination
  const totalPages = Math.ceil(filteredAnalyses.length / PAGE_SIZE)
  const paginatedAnalyses = filteredAnalyses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const showingStart = filteredAnalyses.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const showingEnd = Math.min(currentPage * PAGE_SIZE, filteredAnalyses.length)

  // Helpers
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#3b82f6'
    if (score >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'ready': return '#10b981'
      case 'almost_ready': return '#3b82f6'
      case 'needs_work': return '#f59e0b'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleTabClick = (tab: 'rapid' | 'summary' | 'complete') => {
    if (tab === 'complete' && !isPro) return
    setReportTab(tab)
  }

  // Safety timeout — if fetch hangs (stale connections from SPA navigation), auto-reload
  useEffect(() => {
    if (!loading) return
    const timeout = setTimeout(() => {
      console.warn('[History] Fetch stalled — reloading page')
      window.location.reload()
    }, 8000)
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
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowX: 'hidden'
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
            {!isMobile && (
              <span style={{
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                setLang(newLang)
                setLanguageCookie(newLang)
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

            <UserMenu lang={lang} isMobile={isMobile} />

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
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            {t.title}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            {t.subtitle}
          </p>
        </div>

        {analyses.length === 0 ? (
          /* Empty State */
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '3rem 1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <FileAudio size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#6b7280' }} />
            <p style={{ fontSize: '1.125rem', color: '#374151', marginBottom: '1.5rem' }}>
              {t.noAnalyses}
            </p>
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
              {t.analyzeFirst}
            </Link>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <SlidersHorizontal size={18} style={{ color: '#6b7280' }} />

              {/* Sort By */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  {t.sortBy}:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="newest">{t.sortNewest}</option>
                  <option value="oldest">{t.sortOldest}</option>
                  <option value="score_high">{t.sortScoreHigh}</option>
                  <option value="score_low">{t.sortScoreLow}</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  {t.statusFilter}:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="all">{t.statusAll}</option>
                  <option value="ready">{t.statusReady}</option>
                  <option value="needs_work">{t.statusNeedsWork}</option>
                  <option value="review">{t.statusReview}</option>
                </select>
              </div>
            </div>

            {/* Analyses List */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              {filteredAnalyses.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  color: '#6b7280'
                }}>
                  <p style={{ fontSize: '0.95rem' }}>
                    {lang === 'es' ? 'No hay análisis con este filtro' : 'No analyses match this filter'}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {paginatedAnalyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        onClick={() => {
                          setSelectedAnalysis(analysis)
                          setReportTab('rapid')
                        }}
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

                  {/* Pagination */}
                  {filteredAnalyses.length > PAGE_SIZE && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '1.5rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {t.showing} {showingStart}-{showingEnd} {t.of} {filteredAnalyses.length} {t.analyses}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            background: currentPage === 1 ? '#f3f4f6' : 'white',
                            color: currentPage === 1 ? '#9ca3af' : '#374151',
                            fontSize: '0.875rem',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <ChevronLeft size={16} />
                          {t.previous}
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            background: currentPage === totalPages ? '#f3f4f6' : 'white',
                            color: currentPage === totalPages ? '#9ca3af' : '#374151',
                            fontSize: '0.875rem',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {t.next}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
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
          padding: '1rem',
          overscrollBehavior: 'contain'
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
                  padding: '0.75rem'
                }}
                aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
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
                    fontSize: '0.875rem'
                  }}
                >
                  {tab === 'rapid' && <Zap size={16} />}
                  {tab === 'summary' && <FileText size={16} />}
                  {tab === 'complete' && (!isPro ? <Crown size={16} style={{ color: '#d97706' }} /> : <TrendingUp size={16} />)}
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

                  {/* Metrics Bars */}
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
                          const bars = selectedAnalysis.metrics.metrics_bars
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
                          }
                          const statusColors: { [key: string]: string } = {
                            excellent: '#10b981',
                            good: '#3b82f6',
                            warning: '#f59e0b',
                            critical: '#ef4444'
                          }
                          const orderedKeys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'lufs', 'lufs_(integrated)', 'loudness', 'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance']
                          const displayedKeys = orderedKeys.filter(key => bars[key])

                          return displayedKeys.map((key) => {
                            const bar = bars[key]
                            const label = metricLabels[key] || { es: key, en: key }
                            const color = statusColors[bar.status] || '#6b7280'
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  minWidth: 'clamp(70px, 18vw, 120px)',
                                  maxWidth: 'clamp(80px, 20vw, 120px)',
                                  fontSize: 'clamp(0.6875rem, 1.5vw, 0.75rem)',
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
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}

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
                  color: '#374151'
                }}>
                  {cleanReportText(selectedAnalysis.report_write || '') || (lang === 'es' ? 'No hay datos de análisis completo disponibles.' : 'No complete analysis data available.')}
                </div>
              )}

              {/* CTA */}
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
                    <a
                      href={`https://wa.me/573155576115?text=${encodeURIComponent(
                        lang === 'es'
                          ? `Hola! Acabo de analizar mi mezcla "${selectedAnalysis.filename}" en Mastering Ready. Puntuación: ${selectedAnalysis.score}/100`
                          : `Hi! I just analyzed my mix "${selectedAnalysis.filename}" on Mastering Ready. Score: ${selectedAnalysis.score}/100`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        background: 'white',
                        color: '#6366f1',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '0.5rem',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        textDecoration: 'none',
                        marginLeft: 'clamp(0rem, 5vw, 3.5rem)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {cta.button}
                    </a>
                  </div>
                )
              })()}

              {/* Download */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                {reportTab === 'rapid' && selectedAnalysis.report_visual && (
                  <button
                    onClick={() => {
                      const content = `Mastering Ready - Análisis Rápido\n${'='.repeat(40)}\n\nArchivo: ${selectedAnalysis.filename}\nPuntuación: ${selectedAnalysis.score}/100\nFecha: ${new Date(selectedAnalysis.created_at).toLocaleDateString()}\n\n${selectedAnalysis.report_visual}`
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
                {reportTab === 'summary' && selectedAnalysis.report_short && (
                  <button
                    onClick={() => {
                      const content = `Mastering Ready - Resumen\n${'='.repeat(40)}\n\nArchivo: ${selectedAnalysis.filename}\nPuntuación: ${selectedAnalysis.score}/100\nFecha: ${new Date(selectedAnalysis.created_at).toLocaleDateString()}\n\n${selectedAnalysis.report_short}`
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
                      color: '#374141',
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
                {reportTab === 'complete' && isPro && selectedAnalysis.report_write && (
                  <button
                    onClick={() => {
                      const content = `Mastering Ready - Análisis Completo\n${'='.repeat(40)}\n\nArchivo: ${selectedAnalysis.filename}\nPuntuación: ${selectedAnalysis.score}/100\nFecha: ${new Date(selectedAnalysis.created_at).toLocaleDateString()}\n\n${selectedAnalysis.report_write}`
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
                {reportTab === 'complete' && !isPro && (
                  <button
                    onClick={() => {/* Could open upgrade modal */}}
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

                {/* Download PDF - Pro only */}
                {isPro && (
                  <button
                    onClick={async () => {
                      try {
                        const formData = new FormData()
                        formData.append('lang', lang)
                        formData.append('analysis_data', JSON.stringify({
                          score: selectedAnalysis.score,
                          verdict: selectedAnalysis.verdict,
                          filename: selectedAnalysis.filename,
                          created_at: selectedAnalysis.created_at,
                          duration_seconds: selectedAnalysis.duration_seconds,
                          sample_rate: selectedAnalysis.sample_rate,
                          bit_depth: selectedAnalysis.bit_depth,
                          metrics: selectedAnalysis.metrics,
                          interpretations: selectedAnalysis.interpretations,
                          strict_mode: selectedAnalysis.strict_mode,
                          report_visual: selectedAnalysis.report_visual,
                          report_short: selectedAnalysis.report_short,
                          report_write: selectedAnalysis.report_write,
                        }))
                        const envUrl = process.env.NEXT_PUBLIC_API_URL
                        const backendUrl = (envUrl && !envUrl.includes('your-backend')) ? envUrl : 'https://masteringready.onrender.com'
                        const response = await fetch(`${backendUrl}/api/download/pdf`, { method: 'POST', body: formData })
                        if (response.ok) {
                          const blob = await response.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `masteringready-${lang === 'es' ? 'detallado' : 'detailed'}-${selectedAnalysis.filename.replace(/\.[^/.]+$/, '')}.pdf`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        } else {
                          alert(lang === 'es' ? 'Error al generar el PDF. Intenta de nuevo.' : 'Error generating PDF. Please try again.')
                        }
                      } catch {
                        alert(lang === 'es' ? 'Error al descargar el PDF.' : 'Error downloading PDF.')
                      }
                    }}
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
                    <Download size={16} />
                    {lang === 'es' ? 'Descargar PDF' : 'Download PDF'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
