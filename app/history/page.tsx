'use client'

/**
 * History Page / Página de Historial
 * Shows all user analyses with filters and pagination
 * Muestra todos los análisis del usuario con filtros y paginación
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAuth, UserMenu } from '@/components/auth'
import { supabase } from '@/lib/supabase'
import { fetchHistoryData } from '@/lib/queries/history'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { ThemeToggle } from '@/components/ThemeToggle'
import { clearNotification } from '@/components/NotificationBadge'
import { SkeletonBox, SkeletonText, SkeletonCircle } from '@/components/Skeleton'
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
import Select from '@/components/Select'

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

function getCtaForScore(score: number, lang: 'es' | 'en'): { title: string; body: string; button: string; action: string } {
  if (score >= 95) {
    return lang === 'es'
      ? { title: 'Tu mezcla está lista.', body: 'Está técnicamente preparada para el mastering. Si quieres, escríbenos y coordinamos.', button: 'Masterizar este track', action: 'mastering' }
      : { title: 'Your mix is ready.', body: "It's technically prepared for mastering. If you'd like, write us and we'll coordinate.", button: 'Master this track', action: 'mastering' }
  }
  if (score >= 85) {
    return lang === 'es'
      ? { title: 'Tu mezcla está en muy buen estado.', body: 'Hay detalles menores que no comprometen el resultado. Si quieres avanzar, escríbenos.', button: 'Masterizar este track', action: 'mastering' }
      : { title: 'Your mix is in great shape.', body: "There are minor details that won't compromise the result. If you'd like to move forward, write us.", button: 'Master this track', action: 'mastering' }
  }
  if (score >= 75) {
    return lang === 'es'
      ? { title: 'Tu mezcla está cerca.', body: 'Hay aspectos técnicos que vale la pena revisar antes del mastering. Si necesitas orientación, escríbenos.', button: 'Preparar mi mezcla', action: 'preparation' }
      : { title: 'Your mix is close.', body: 'There are technical aspects worth reviewing before mastering. If you need guidance, write us.', button: 'Prepare my mix', action: 'preparation' }
  }
  if (score >= 60) {
    return lang === 'es'
      ? { title: 'Tu mezcla necesita ajustes antes del mastering.', body: 'Hay decisiones técnicas que pueden afectar el resultado. Si quieres que te ayudemos, escríbenos.', button: 'Revisar mi mezcla', action: 'preparation' }
      : { title: 'Your mix needs adjustments before mastering.', body: "There are technical decisions that could affect the result. If you'd like help, write us.", button: 'Review my mix', action: 'preparation' }
  }
  if (score >= 40) {
    return lang === 'es'
      ? { title: 'Tu mezcla necesita trabajo en áreas clave.', body: 'Enviarlo en este estado limita el margen de maniobra del mastering. Si quieres, escríbenos.', button: 'Trabajar mi mezcla', action: 'review' }
      : { title: 'Your mix needs work in key areas.', body: "In this state, mastering has limited room to work. If you'd like, write us.", button: 'Work on my mix', action: 'review' }
  }
  if (score >= 20) {
    return lang === 'es'
      ? { title: 'Tu mezcla tiene problemas técnicos importantes.', body: 'No recomiendo masterizar en este estado. Si quieres, escríbenos y trabajamos juntos.', button: 'Trabajar mi mezcla', action: 'review' }
      : { title: 'Your mix has significant technical issues.', body: "I don't recommend mastering in this state. If you'd like, write us and we'll work through it together.", button: 'Work on my mix', action: 'review' }
  }
  return lang === 'es'
    ? { title: 'Tu mezcla necesita una revisión profunda.', body: 'Hay decisiones fundamentales que resolver antes del mastering. Si quieres, escríbenos.', button: 'Revisar mi proyecto', action: 'review' }
    : { title: 'Your mix needs a deep review.', body: "There are fundamental decisions to resolve before mastering. If you'd like, write us.", button: 'Review my project', action: 'review' }
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
// HELPER: Score-based verdict (matches analyzer score_report exactly)
// ============================================================================

function scoreToVerdictLabel(score: number, lang: 'es' | 'en'): string {
  if (lang === 'es') {
    if (score >= 95) return '✅ Margen óptimo para mastering'
    if (score >= 85) return '✅ Lista para mastering'
    if (score >= 75) return '⚠️ Margen suficiente (revisar sugerencias)'
    if (score >= 60) return '⚠️ Margen reducido - revisar antes de mastering'
    if (score >= 40) return '⚠️ Margen limitado - ajustes recomendados'
    if (score >= 20) return '❌ Margen comprometido para mastering'
    if (score >= 5) return '❌ Requiere revisión'
    return '❌ Sin margen para procesamiento adicional'
  }
  if (score >= 95) return '✅ Optimal margin for mastering'
  if (score >= 85) return '✅ Ready for mastering'
  if (score >= 75) return '⚠️ Sufficient margin (review suggestions)'
  if (score >= 60) return '⚠️ Reduced margin - review before mastering'
  if (score >= 40) return '⚠️ Limited margin - adjustments recommended'
  if (score >= 20) return '❌ Compromised margin for mastering'
  if (score >= 5) return '❌ Requires review'
  return '❌ No margin for additional processing'
}

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
    .replace(/✅\s*✅/g, '✅')
    .replace(/⚠️\s*⚠️/g, '⚠️')
    // Remove recommendation lines (CTA card handles this)
    .replace(/\n*💡\s*Recomendaci[óo]n:[^\n]*/g, '')
    .replace(/\n*💡\s*Recommendation:[^\n]*/g, '')
    .replace(/\n*Recomendaci[óo]n:[^\n]*/g, '')
    .replace(/\n*Recommendation:[^\n]*/g, '')
    // Remove mode note (📊 Análisis realizado con estándares...)
    .replace(/\n*📊\s*An[áa]lisis realizado[^\n]*/gu, '')
    .replace(/\n*📊\s*Analysis performed[^\n]*/gu, '')
    // Remove inline CTA section (already shown as CTA card below)
    .replace(/\n*[🎧🔧🔍💬]\s*(Tu mezcla|Your mix|Escr[íi]benos|Write us|No recomiendo|I don't recommend|Enviarlo|Sending it|Hay aspectos|There are|Hay decisiones|Hay problemas|No significa|Está técnicamente)[^\n]*/gu, '')
    // Remove any remaining lines starting with CTA emojis followed by text
    .replace(/\n*[🎧🔧🔍💬][^\n]*/gu, '')
    // Remove CTA continuation lines (contain "escríbenos" or "write us")
    .replace(/\n*[^\n]*(escr[íi]benos|write us)[^\n]*/gi, '')
    // Remove orphaned emoji lines (single emoji on its own line, broken rendering)
    .replace(/^\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]\s*$/gmu, '')
    // Remove lone surrogates (broken rendering as small squares)
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

function HistorySkeleton({ lang, isMobile }: { lang: string; isMobile: boolean }) {
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
          {/* Left side: Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          </div>

          {/* Right side: Placeholder actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
            <SkeletonBox width={40} height={28} borderRadius="0.25rem" />
            <SkeletonCircle size={28} />
            <SkeletonBox width={isMobile ? 80 : 100} height={32} borderRadius="9999px" />
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '1rem' : '2rem 1.5rem'
      }}>
        {/* Title */}
        <SkeletonText width="40%" style={{ marginBottom: '0.5rem', height: '1.5rem' }} />
        <SkeletonText width="55%" style={{ marginBottom: '1.5rem', height: '0.875rem' }} />

        {/* Filter bar */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <SkeletonBox width={120} height={36} borderRadius="0.5rem" />
          <SkeletonBox width={120} height={36} borderRadius="0.5rem" />
          <SkeletonBox width={120} height={36} borderRadius="0.5rem" />
        </div>

        {/* Analysis rows */}
        <div style={{
          background: 'var(--mr-bg-card)',
          borderRadius: '1rem',
          padding: isMobile ? '1rem' : '1.5rem',
          boxShadow: 'var(--mr-shadow)'
        }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 0',
              borderBottom: i < 3 ? '1px solid var(--mr-border)' : 'none'
            }}>
              <SkeletonCircle size={40} />
              <div style={{ flex: 1 }}>
                <SkeletonText width="60%" style={{ marginBottom: '0.5rem' }} />
                <SkeletonText width="30%" style={{ height: '0.75rem' }} />
              </div>
              <SkeletonBox width={60} height={24} borderRadius="0.25rem" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function HistoryPage() {
  const router = useRouter()
  const { user, session, loading: authLoading, isAdmin } = useAuth()

  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [isMobile, setIsMobile] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [reportTab, setReportTab] = useState<'rapid' | 'summary' | 'complete'>('rapid')

  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [showContactModal, setShowContactModal] = useState(false)
  const [ctaAction, setCtaAction] = useState('')

  // React Query — single fetch for all history data
  const { data, isLoading } = useQuery({
    queryKey: ['history', user?.id],
    queryFn: () => fetchHistoryData({
      accessToken: session!.access_token,
      refreshToken: session!.refresh_token,
      userId: user!.id,
    }),
    enabled: !!user && !!session?.access_token,
  })

  const loading = isLoading
  const analyses = data?.analyses ?? []
  const isPro = data?.isPro ?? false

  // Free users get Completo + PDF for their first 2 analyses (by creation date). Pro/admin get all.
  const hasFullAccess = isPro || isAdmin || (() => {
    if (!selectedAnalysis || analyses.length === 0) return false
    const sorted = [...analyses].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const idx = sorted.findIndex(a => a.id === selectedAnalysis.id)
    return idx >= 0 && idx < 2
  })()

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

  // Modal scroll lock
  useEffect(() => {
    const anyModalOpen = !!selectedAnalysis || showContactModal
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedAnalysis, showContactModal])

  // Redirect if not logged in (to home, not login — home has login options in header)
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = `/?lang=${lang}`
    }
  }, [authLoading, user, lang])

  // Clear notifications when data loads
  useEffect(() => {
    if (data) {
      clearNotification()
      sessionStorage.removeItem('mr_new_analyses')
      sessionStorage.removeItem('mr_hist_reload')
    }
  }, [data])

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
    if (score >= 80) return 'var(--mr-green)'
    if (score >= 60) return 'var(--mr-blue)'
    if (score >= 40) return 'var(--mr-amber)'
    return 'var(--mr-red)'
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'ready': return 'var(--mr-green)'
      case 'almost_ready': return 'var(--mr-blue)'
      case 'needs_work': return 'var(--mr-amber)'
      case 'critical': return 'var(--mr-red)'
      default: return 'var(--mr-text-secondary)'
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
    if (tab === 'complete' && !hasFullAccess) return
    setReportTab(tab)
  }

  // Loading state — isLoading only true on first load, not background refetches
  if (authLoading || isLoading) {
    return <HistorySkeleton lang={lang} isMobile={isMobile} />
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
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: 'var(--mr-text-primary)',
            marginBottom: '0.5rem'
          }}>
            {t.title}
          </h1>
          <p style={{ color: 'var(--mr-text-secondary)', fontSize: '0.95rem' }}>
            {t.subtitle}
          </p>
        </div>

        {analyses.length === 0 ? (
          /* Empty State */
          <div style={{
            background: 'var(--mr-bg-card)',
            borderRadius: '1rem',
            padding: '3rem 1.5rem',
            boxShadow: 'var(--mr-shadow)',
            textAlign: 'center'
          }}>
            <FileAudio size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--mr-text-secondary)' }} />
            <p style={{ fontSize: '1.125rem', color: 'var(--mr-text-primary)', marginBottom: '1.5rem' }}>
              {t.noAnalyses}
            </p>
            <Link
              href="/#analyze"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--mr-gradient)',
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
              background: 'var(--mr-bg-card)',
              borderRadius: '1rem',
              padding: '1rem 1.5rem',
              boxShadow: 'var(--mr-shadow)',
              marginBottom: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <SlidersHorizontal size={18} style={{ color: 'var(--mr-text-secondary)' }} />

              {/* Sort By */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)', fontWeight: '500' }}>
                  {t.sortBy}:
                </label>
                <Select
                  compact
                  value={sortBy}
                  onChange={(v) => setSortBy(v as SortOption)}
                  options={[
                    { value: 'newest', label: t.sortNewest },
                    { value: 'oldest', label: t.sortOldest },
                    { value: 'score_high', label: t.sortScoreHigh },
                    { value: 'score_low', label: t.sortScoreLow },
                  ]}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)', fontWeight: '500' }}>
                  {t.statusFilter}:
                </label>
                <Select
                  compact
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as StatusFilter)}
                  options={[
                    { value: 'all', label: t.statusAll },
                    { value: 'ready', label: t.statusReady },
                    { value: 'needs_work', label: t.statusNeedsWork },
                    { value: 'review', label: t.statusReview },
                  ]}
                />
              </div>
            </div>

            {/* Analyses List */}
            <div style={{
              background: 'var(--mr-bg-card)',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: 'var(--mr-shadow)'
            }}>
              {filteredAnalyses.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  color: 'var(--mr-text-secondary)'
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
                          background: 'var(--mr-bg-base)',
                          borderRadius: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: '1px solid transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--mr-primary)'
                          e.currentTarget.style.background = 'var(--mr-bg-hover)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent'
                          e.currentTarget.style.background = 'var(--mr-bg-base)'
                        }}
                      >
                        {/* Score */}
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: `conic-gradient(${getScoreColor(analysis.score)} ${analysis.score * 3.6}deg, var(--mr-border) 0deg)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: 'var(--mr-bg-card)',
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
                            color: 'var(--mr-text-primary)',
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
                            color: 'var(--mr-text-secondary)'
                          }}>
                            <span style={{
                              color: getVerdictColor(analysis.verdict),
                              fontWeight: '500'
                            }}>
                              {scoreToVerdictLabel(analysis.score, lang)}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} />
                              {formatDate(analysis.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight size={20} style={{ color: 'var(--mr-text-tertiary)', flexShrink: 0 }} />
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
                      borderTop: '1px solid var(--mr-border)'
                    }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)' }}>
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
                            border: '1px solid var(--mr-border-strong)',
                            borderRadius: '0.375rem',
                            background: currentPage === 1 ? 'var(--mr-bg-elevated)' : 'var(--mr-bg-card)',
                            color: currentPage === 1 ? 'var(--mr-text-tertiary)' : 'var(--mr-text-primary)',
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
                            border: '1px solid var(--mr-border-strong)',
                            borderRadius: '0.375rem',
                            background: currentPage === totalPages ? 'var(--mr-bg-elevated)' : 'var(--mr-bg-card)',
                            color: currentPage === totalPages ? 'var(--mr-text-tertiary)' : 'var(--mr-text-primary)',
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
        <div
          onClick={() => setSelectedAnalysis(null)}
          style={{
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
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
            background: 'var(--mr-bg-card)',
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
              borderBottom: '1px solid var(--mr-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontWeight: '700', color: 'var(--mr-text-primary)', marginBottom: '0.25rem' }}>
                  {selectedAnalysis.filename}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-secondary)' }}>
                  {formatDate(selectedAnalysis.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--mr-text-secondary)',
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
              background: 'var(--mr-bg-base)',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `conic-gradient(${getScoreColor(selectedAnalysis.score)} ${selectedAnalysis.score * 3.6}deg, var(--mr-border) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '66px',
                  height: '66px',
                  borderRadius: '50%',
                  background: 'var(--mr-bg-card)',
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
                  {scoreToVerdictLabel(selectedAnalysis.score, lang)}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)' }}>
                  {t.score}: {selectedAnalysis.score}/100
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--mr-border)',
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
                    borderBottom: reportTab === tab ? '2px solid var(--mr-primary)' : '2px solid transparent',
                    color: reportTab === tab ? 'var(--mr-primary)' : 'var(--mr-text-secondary)',
                    fontWeight: reportTab === tab ? '600' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s, background 0.2s'
                  }}
                  onMouseEnter={(e) => { if (reportTab !== tab) { e.currentTarget.style.color = 'var(--mr-text-primary)'; e.currentTarget.style.background = 'var(--mr-bg-hover)' } }}
                  onMouseLeave={(e) => { if (reportTab !== tab) { e.currentTarget.style.color = 'var(--mr-text-secondary)'; e.currentTarget.style.background = 'none' } }}
                >
                  {tab === 'rapid' && <Zap size={16} />}
                  {tab === 'summary' && <FileText size={16} />}
                  {tab === 'complete' && (!hasFullAccess ? <Crown size={16} style={{ color: 'var(--mr-amber)' }} /> : <TrendingUp size={16} />)}
                  {t.tabs[tab]}
                  {tab === 'complete' && !hasFullAccess && (
                    <span style={{
                      fontSize: '0.625rem',
                      background: 'var(--mr-amber-bg)',
                      color: 'var(--mr-amber-text)',
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
                    color: 'var(--mr-text-primary)',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    ⚡ {lang === 'es' ? 'Análisis Rápido' : 'Quick Analysis'}
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)', marginBottom: '1.5rem' }}>
                    🎵 {lang === 'es' ? 'Sobre' : 'About'} "{selectedAnalysis.filename}"
                  </p>

                  {/* Metrics Bars */}
                  {selectedAnalysis.metrics?.metrics_bars && Object.keys(selectedAnalysis.metrics.metrics_bars).length > 0 && (
                    <div style={{
                      background: 'var(--mr-amber-bg)',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                      border: '1px solid var(--mr-amber)'
                    }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'var(--mr-text-primary)',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        📊 {lang === 'es' ? 'Áreas de Atención Prioritaria' : 'Priority Attention Areas'}
                      </h4>
                      <p style={{
                        fontSize: '0.7rem',
                        color: 'var(--mr-text-secondary)',
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
                            excellent: 'var(--mr-green)',
                            good: 'var(--mr-blue)',
                            warning: 'var(--mr-amber)',
                            critical: 'var(--mr-red)'
                          }
                          const orderedKeys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'lufs', 'lufs_(integrated)', 'loudness', 'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance']
                          const displayedKeys = orderedKeys.filter(key => bars[key])

                          return displayedKeys.map((key) => {
                            const bar = bars[key]
                            const label = metricLabels[key] || { es: key, en: key }
                            const color = statusColors[bar.status] || 'var(--mr-text-secondary)'
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  minWidth: 'clamp(70px, 18vw, 120px)',
                                  maxWidth: 'clamp(80px, 20vw, 120px)',
                                  fontSize: 'clamp(0.6875rem, 1.5vw, 0.75rem)',
                                  fontWeight: '500',
                                  color: 'var(--mr-text-secondary)',
                                  textAlign: 'right'
                                }}>
                                  {lang === 'es' ? label.es : label.en}
                                </div>
                                <div style={{
                                  flex: 1,
                                  background: 'var(--mr-border)',
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

                      {/* Genre badge — shows detected or user-selected genre */}
                      {(() => {
                        const genreLabels: { [key: string]: { es: string; en: string } } = {
                          'Pop/Balada': { es: 'Pop / Balada', en: 'Pop / Ballad' },
                          'Rock': { es: 'Rock', en: 'Rock' },
                          'Hip-Hop/Trap': { es: 'Hip-Hop / Trap', en: 'Hip-Hop / Trap' },
                          'EDM/Electrónica': { es: 'EDM / Electrónica', en: 'EDM / Electronic' },
                          'R&B/Soul': { es: 'R&B / Soul', en: 'R&B / Soul' },
                          'Latin/Reggaeton': { es: 'Latino / Reggaeton', en: 'Latin / Reggaeton' },
                          'Metal': { es: 'Metal', en: 'Metal' },
                          'Jazz/Acústico': { es: 'Jazz / Acústica', en: 'Jazz / Acoustic' },
                          'Clásica': { es: 'Clásica', en: 'Classical' },
                          'Country': { es: 'Country', en: 'Country' },
                        }
                        const metricsArr = selectedAnalysis.metrics?.metrics || []
                        const freqMetric = Array.isArray(metricsArr) ? metricsArr.find((m: any) => m.internal_key === 'Frequency Balance') : null
                        const userGenre = selectedAnalysis.metrics?.user_genre || null
                        const detectedGenre = freqMetric?.detected_genre
                        const genreConfidence = freqMetric?.genre_confidence
                        const genreDescription = freqMetric?.genre_description
                        const genreKey = userGenre || detectedGenre
                        if (!genreKey) return null
                        const displayGenre = genreLabels[genreKey] ? (lang === 'es' ? genreLabels[genreKey].es : genreLabels[genreKey].en) : genreKey
                        const isUserSelected = !!userGenre
                        const confidencePct = genreConfidence ? Math.round(genreConfidence * 100) : null
                        return (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--mr-bg-elevated)',
                            borderRadius: 'var(--mr-radius-sm)',
                            border: '1px solid var(--mr-border)',
                            fontSize: '0.75rem',
                            color: 'var(--mr-text-secondary)'
                          }}>
                            <Music size={14} style={{ color: 'var(--mr-primary)', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: 'var(--mr-text-primary)' }}>{displayGenre}</span>
                            <span style={{ color: 'var(--mr-text-tertiary)' }}>
                              {isUserSelected
                                ? (lang === 'es' ? '(seleccionado)' : '(selected)')
                                : confidencePct
                                  ? `(${confidencePct}% ${lang === 'es' ? 'coincidencia' : 'match'})`
                                  : ''
                              }
                            </span>
                            {genreDescription && (
                              <span style={{ marginLeft: 'auto', fontStyle: 'italic', color: 'var(--mr-text-tertiary)', fontSize: '0.7rem' }}>
                                {genreDescription}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <div style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.875rem',
                    lineHeight: '1.8',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: 'var(--mr-text-primary)'
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
                  color: 'var(--mr-text-primary)'
                }}>
                  {cleanReportText(selectedAnalysis.report_short || '') || (lang === 'es' ? 'No hay datos de resumen disponibles.' : 'No summary data available.')}
                </div>
              )}
              {reportTab === 'complete' && hasFullAccess && (
                <div style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: '1.8',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: 'var(--mr-text-primary)'
                }}>
                  {cleanReportText(selectedAnalysis.report_write || '') || (lang === 'es' ? 'No hay datos de análisis completo disponibles.' : 'No complete analysis data available.')}
                </div>
              )}

              {/* Download */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--mr-border)'
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
                      background: 'var(--mr-bg-card)',
                      border: '2px solid var(--mr-primary)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--mr-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mr-bg-elevated)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mr-bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
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
                      background: 'var(--mr-bg-card)',
                      border: '2px solid var(--mr-primary)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--mr-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mr-bg-elevated)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mr-bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <Download size={16} />
                    {lang === 'es' ? 'Descargar Resumen' : 'Download Summary'}
                  </button>
                )}
                {reportTab === 'complete' && hasFullAccess && selectedAnalysis.report_write && (
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
                      background: 'var(--mr-bg-card)',
                      border: '2px solid var(--mr-primary)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--mr-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mr-bg-elevated)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mr-bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <Download size={16} />
                    {lang === 'es' ? 'Descargar Completo' : 'Download Complete'}
                  </button>
                )}
                {reportTab === 'complete' && !hasFullAccess && (
                  <button
                    onClick={() => {/* Could open upgrade modal */}}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'var(--mr-gradient)',
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
                {hasFullAccess && (
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
                      background: 'var(--mr-gradient)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <Download size={16} />
                    {lang === 'es' ? 'Descargar PDF' : 'Download PDF'}
                  </button>
                )}
              </div>

              {/* CTA — dynamic based on score (after downloads) */}
              {(() => {
                const cta = getCtaForScore(selectedAnalysis.score, lang)
                const score = selectedAnalysis.score
                const emoji = score >= 85 ? '🎧' : score >= 60 ? '🔧' : score >= 40 ? '🔍' : score >= 20 ? '🔍' : '💬'
                return (
                  <div style={{
                    background: 'linear-gradient(to bottom right, #818cf8 0%, #6366f1 100%)',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    marginTop: '1rem',
                    color: 'white',
                    boxShadow: 'var(--mr-shadow-lg)'
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
                          {cta.body}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setCtaAction(cta.action); setShowContactModal(true) }}
                      style={{
                        background: '#ffffff',
                        color: '#6366f1',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: 'var(--mr-shadow)',
                        marginLeft: isMobile ? '0' : '3.5rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = 'var(--mr-shadow-lg)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'var(--mr-shadow)'
                      }}
                    >
                      {cta.button}
                    </button>
                  </div>
                )
              })()}
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
            padding: '1.5rem',
            overscrollBehavior: 'contain'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--mr-bg-card)',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: 'var(--mr-shadow-lg)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <button
              onClick={() => setShowContactModal(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--mr-text-secondary)', padding: '0.75rem'
              }}
              aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎧</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? 'Hablemos de tu track' : 'Let\u2019s talk about your track'}
              </h3>
              <p style={{ color: 'var(--mr-text-secondary)' }}>
                {lang === 'es' ? 'Elige cómo contactarme:' : 'Choose how to reach me:'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* WhatsApp */}
              <a
                href={`https://wa.me/573155576115?text=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola Matías, acabo de analizar "${selectedAnalysis?.filename || 'mi mezcla'}" en Mastering Ready (${selectedAnalysis?.score || 'N/A'}/100). ${ctaAction === 'mastering' ? 'Me interesa el mastering de este track.' : ctaAction === 'preparation' ? 'Me gustaría preparar mi mezcla antes del mastering.' : 'Me gustaría revisar mi mezcla con ayuda profesional.'}`
                    : `Hi Matías, I just analyzed "${selectedAnalysis?.filename || 'my mix'}" on Mastering Ready (${selectedAnalysis?.score || 'N/A'}/100). ${ctaAction === 'mastering' ? 'I\'m interested in mastering this track.' : ctaAction === 'preparation' ? 'I\'d like to prepare my mix before mastering.' : 'I\'d like to review my mix with professional help.'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', background: 'var(--mr-green-bg)',
                  border: '1px solid var(--mr-green)', borderRadius: '0.75rem',
                  textDecoration: 'none', color: 'var(--mr-green-text)', cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📱</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>WhatsApp</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--mr-green-text)' }}>
                    {lang === 'es' ? 'Mensaje directo instantáneo' : 'Instant direct message'}
                  </div>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:mat@matcarvy.com?subject=${encodeURIComponent(
                  lang === 'es'
                    ? `${ctaAction === 'mastering' ? 'Mastering' : ctaAction === 'preparation' ? 'Preparación de mezcla' : 'Revisión de mezcla'}: ${selectedAnalysis?.filename || 'Mi track'}`
                    : `${ctaAction === 'mastering' ? 'Mastering' : ctaAction === 'preparation' ? 'Mix preparation' : 'Mix review'}: ${selectedAnalysis?.filename || 'My track'}`
                )}&body=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola Matías,\n\nAnalicé "${selectedAnalysis?.filename || 'mi mezcla'}" en Mastering Ready.\nPuntuación: ${selectedAnalysis?.score || 'N/A'}/100\n\n${ctaAction === 'mastering' ? 'Me interesa el mastering de este track.' : ctaAction === 'preparation' ? 'Me gustaría preparar mi mezcla antes del mastering.' : 'Me gustaría revisar mi mezcla con ayuda profesional.'}\n\nGracias.`
                    : `Hi Matías,\n\nI analyzed "${selectedAnalysis?.filename || 'my mix'}" on Mastering Ready.\nScore: ${selectedAnalysis?.score || 'N/A'}/100\n\n${ctaAction === 'mastering' ? 'I\'m interested in mastering this track.' : ctaAction === 'preparation' ? 'I\'d like to prepare my mix before mastering.' : 'I\'d like to review my mix with professional help.'}\n\nThanks.`
                )}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', background: 'var(--mr-blue-bg)',
                  border: '1px solid var(--mr-blue)', borderRadius: '0.75rem',
                  textDecoration: 'none', color: 'var(--mr-blue-text)', cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--mr-blue-text)' }}>mat@matcarvy.com</div>
                </div>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/matcarvy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', background: 'var(--mr-red-bg)',
                  border: '1px solid var(--mr-red)', borderRadius: '0.75rem',
                  textDecoration: 'none', color: 'var(--mr-red-text)', cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📷</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Instagram</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--mr-red-text)' }}>@matcarvy</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
