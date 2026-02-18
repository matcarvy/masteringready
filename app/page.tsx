'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Download, Check, Upload, Zap, Shield, TrendingUp, Play, Music, Crown, X, AlertTriangle, Globe, Headphones, Menu } from 'lucide-react'
import { UserMenu, useAuth, AuthModal } from '@/components/auth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { analyzeFile, checkIpLimit, IpCheckResult } from '@/lib/api'
import { startAnalysisPolling, getAnalysisStatus } from '@/lib/api'
import { compressAudioFile, parseFileHeader } from '@/lib/audio-compression'
import { supabase, createFreshQueryClient, checkCanAnalyze, AnalysisStatus } from '@/lib/supabase'
import { useGeo } from '@/lib/useGeo'
import { getAllPricesForCountry } from '@/lib/pricing-config'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { getErrorMessage, ERROR_MESSAGES } from '@/lib/error-messages'
import { NotificationBadge, setNotification, clearNotification } from '@/components/NotificationBadge'

// Module-level quota cache — survives React state resets / component remounts
// (GoTrueClient conflicts cause auth state flicker → state loss)
let _quotaCache: AnalysisStatus | null = null

// ============================================================================
// Helper: Map score to database verdict enum (deterministic, mirrors backend score_report)
// ============================================================================
function scoreToVerdictEnum(score: number): 'ready' | 'almost_ready' | 'needs_work' | 'critical' {
  if (score >= 85) return 'ready'
  if (score >= 60) return 'almost_ready'
  if (score >= 40) return 'needs_work'
  return 'critical'
}

// ============================================================================
// Helper: Save analysis directly to database for logged-in users
// ============================================================================
async function saveAnalysisToDatabase(userId: string, analysis: any, fileObj?: File, countryCode?: string, isTestAnalysis?: boolean, sessionTokens?: { access_token: string; refresh_token: string }) {
  // Use a fresh client to avoid stale singleton state after analysis
  // (analysis makes multiple auth/quota checks that can leave the singleton locked)
  let client = supabase
  if (sessionTokens) {
    const fresh = await createFreshQueryClient(sessionTokens)
    if (fresh) client = fresh
  }

  const mappedVerdict = scoreToVerdictEnum(analysis.score)
  const reportShort = analysis.report_short || analysis.report || null
  const reportWrite = analysis.report_write || analysis.report || null
  const reportVisual = analysis.report_visual || analysis.report_short || analysis.report || null

  // Combine metrics and metrics_bars into one object for storage
  const metricsData = {
    metrics: analysis.metrics || [],
    metrics_bars: analysis.metrics_bars || null
  }

  // Extract file metadata from API response
  const fileInfo = analysis.file || {}
  const fileExtension = (analysis.filename || '').split('.').pop()?.toLowerCase() || null

  // Run INSERT + increment counter in PARALLEL (both are independent operations)
  // This halves save time and frees Supabase client faster for dashboard navigation
  const [insertResult, incrementResult] = await Promise.all([
    client
      .from('analyses')
      .insert({
        user_id: userId,
        filename: analysis.filename || 'Unknown',
        score: analysis.score,
        verdict: mappedVerdict,
        lang: analysis.lang || 'es',
        strict_mode: analysis.strict || false,
        report_mode: 'write',
        metrics: metricsData,
        interpretations: analysis.interpretations || null,
        report_short: reportShort,
        report_write: reportWrite,
        report_visual: reportVisual,
        created_at: analysis.created_at || new Date().toISOString(),
        // File metadata
        file_size_bytes: fileObj?.size || fileInfo.size || null,
        file_format: fileExtension,
        duration_seconds: fileInfo.duration || null,
        sample_rate: fileInfo.sample_rate || null,
        bit_depth: fileInfo.bit_depth || null,
        channels: fileInfo.channels || null,
        // Analysis metadata
        processing_time_seconds: analysis.analysis_time_seconds || null,
        analysis_version: analysis.analysis_version || null,
        is_chunked_analysis: analysis.is_chunked_analysis || false,
        chunk_count: analysis.chunk_count || null,
        // v1.5: New data capture fields
        spectral_6band: analysis.spectral_6band || null,
        energy_analysis: analysis.energy_analysis || null,
        categorical_flags: analysis.categorical_flags || null,
        // v1.6: Country + timezone for admin analytics
        client_country: countryCode || null,
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        // Admin test flag
        is_test_analysis: isTestAnalysis || false,
        // Request ID for PDF download from dashboard
        api_request_id: analysis.api_request_id || null
      })
      .select(),
    client.rpc('increment_analysis_count', { p_user_id: userId })
  ])

  if (insertResult.error) {
    console.error('[SaveAnalysis] INSERT ERROR:', insertResult.error.message)
    throw insertResult.error
  }

  return insertResult.data
}

// Interpretative Section Component
interface InterpretativeSectionProps {
  title: string
  interpretation: string
  recommendation: string
  metrics: {
    [key: string]: any
    status: 'excellent' | 'good' | 'warning' | 'error'
  }
  lang: 'es' | 'en'
}

function InterpretativeSection({ title, interpretation, recommendation, metrics, lang }: InterpretativeSectionProps) {
  const statusColors = {
    excellent: { border: 'var(--mr-green)', bg: 'var(--mr-green-bg)', text: 'var(--mr-green-text)' },
    good: { border: 'var(--mr-blue)', bg: 'var(--mr-blue-bg)', text: 'var(--mr-blue-text)' },
    warning: { border: 'var(--mr-amber)', bg: 'var(--mr-amber-bg)', text: 'var(--mr-amber-text)' },
    error: { border: 'var(--mr-red)', bg: 'var(--mr-red-bg)', text: 'var(--mr-red-text)' }
  }

  const colors = statusColors[metrics.status] || statusColors.good

  return (
    <div style={{
      border: `2px solid ${colors.border}`,
      borderRadius: '1rem',
      padding: '1.5rem',
      background: 'var(--mr-bg-card)',
      marginBottom: '1.5rem'
    }}>
      {/* Title */}
      <h4 style={{
        fontSize: '1.25rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {title}
      </h4>
      
      {/* 1. TECHNICAL METRICS FIRST */}
      <div style={{
        background: 'var(--mr-bg-base)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.25rem',
        border: '1px solid var(--mr-border)'
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: 'var(--mr-text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {Object.entries(metrics).map(([key, value]) => {
            if (key === 'status') return null
            
            // Format key names with correct capitalization
            let formattedKey = key
            
            // Handle specific cases first
            if (key === 'headroom_dbfs') {
              formattedKey = 'Headroom dBFS'
            } else if (key === 'true_peak_dbtp') {
              formattedKey = 'True Peak dBTP'
            } else if (key === 'plr' || key === 'dr_lu') {
              formattedKey = 'PLR'
            } else if (key === 'balance_l_r' || key === 'balance_lr') {
              formattedKey = 'Balance L/R'
            } else if (key === 'ms_ratio') {
              formattedKey = 'M/S Ratio'
            } else if (key === 'correlation') {
              formattedKey = 'Correlation'
            } else if (key === 'lufs') {
              formattedKey = 'LUFS'
            } else {
              // Generic formatting for other keys
              formattedKey = key
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }
            
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{formattedKey}:</strong>
                <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* 2. INTERPRETATION TEXT SECOND */}
      <p style={{
        fontSize: '1rem',
        lineHeight: '1.7',
        marginBottom: '1.25rem',
        color: 'var(--mr-text-primary)'
      }}>
        {interpretation}
      </p>

      {/* 3. RECOMMENDATION THIRD */}
      <div style={{
        background: 'var(--mr-blue-bg)',
        borderLeft: '4px solid var(--mr-blue)',
        padding: '0.75rem 1rem',
        borderRadius: '0.25rem'
      }}>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--mr-blue-text)',
          margin: 0,
          lineHeight: '1.6'
        }}>
          <strong>💡 {lang === 'es' ? 'Recomendación' : 'Recommendation'}:</strong> {recommendation}
        </p>
      </div>
    </div>
  )
}

function Home() {
  // Auth state - check if user is logged in
  const { user, session, loading: authLoading, isAdmin, savePendingAnalysis, pendingAnalysisQuotaExceeded, clearPendingAnalysisQuotaExceeded, pendingAnalysisSaved, clearPendingAnalysisSaved } = useAuth()
  const isLoggedIn = !!user

  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [mode, setMode] = useState<'short' | 'write'>('write')
  const [strict, setStrict] = useState(false)
  const [langDetected, setLangDetected] = useState(false)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)
  const isAnalyzingRef = useRef(false) // Mutex: prevents concurrent handleAnalyze execution
  const [result, setResult] = useState<any>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [fileDuration, setFileDuration] = useState<number | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const [tabTransition, setTabTransition] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [showIpLimitModal, setShowIpLimitModal] = useState(false)
  const [showVpnModal, setShowVpnModal] = useState(false)
  const [vpnServiceName, setVpnServiceName] = useState<string | null>(null)
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false)
  const [userAnalysisStatus, setUserAnalysisStatus] = useState<AnalysisStatus | null>(null)
  const [reportView, setReportView] = useState<'visual' | 'short' | 'write'>('visual')
  const [isPro, setIsPro] = useState(false)
  const [hasPaidAccess, setHasPaidAccess] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedback, setFeedback] = useState({ rating: 0, liked: '', change: '', add: '' })
  // Feedback widget + CTA tracking state
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null)
  const [analysisRating, setAnalysisRating] = useState<boolean | null>(null)
  const [analysisComment, setAnalysisComment] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [showRatingWidget, setShowRatingWidget] = useState(false)
  const [ctaSource, setCtaSource] = useState<string | null>(null)

  // Modal scroll lock
  useEffect(() => {
    const anyModalOpen = showContactModal || showFeedbackModal || showAuthModal ||
      showIpLimitModal || showFreeLimitModal || showVpnModal || showUpgradeModal
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showContactModal, showFeedbackModal, showAuthModal, showIpLimitModal,
      showFreeLimitModal, showVpnModal, showUpgradeModal])

  // Geo detection for regional pricing
  const { geo } = useGeo()
  const prices = getAllPricesForCountry(geo?.countryCode || 'US')

  // Store request ID for PDF download
  const requestIdRef = useRef<string>('')

  // Check Pro subscription + paid access (Pro OR Single purchase OR Admin)
  useEffect(() => {
    if (!user) { setIsPro(false); setHasPaidAccess(false); return }
    // Admin always has full access
    if (isAdmin) { setHasPaidAccess(true); return }
    let cancelled = false
    const checkAccess = async () => {
      // Check Pro subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*, plan:plans(type)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      if (cancelled) return
      const isProUser = subData?.plan?.type === 'pro' || subData?.plan?.type === 'studio'
      setIsPro(isProUser)

      if (isProUser) {
        setHasPaidAccess(true)
        return
      }

      // Check if user has any Single purchase
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'succeeded')
        .limit(1)
      if (cancelled) return
      setHasPaidAccess((purchases && purchases.length > 0) || false)
    }
    checkAccess()
    return () => { cancelled = true }
  }, [user, isAdmin])

  // Free user gets full access (Completo + PDF) for their 2 free analyses. Admin always has full access.
  const effectiveHasPaidAccess = hasPaidAccess || isAdmin ||
    (isLoggedIn && result !== null && userAnalysisStatus?.analyses_used !== undefined && userAnalysisStatus.analyses_used <= 2)

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Delayed rating widget appearance (4s after results load)
  useEffect(() => {
    if (!result) {
      setShowRatingWidget(false)
      return
    }
    const timer = setTimeout(() => setShowRatingWidget(true), 4000)
    return () => clearTimeout(timer)
  }, [result])

  // Score count-up animation
  useEffect(() => {
    if (!result) {
      setDisplayScore(0)
      return
    }
    // Respect reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayScore(result.score)
      return
    }
    const target = result.score
    const duration = 1200
    const start = performance.now()
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    let raf: number
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setDisplayScore(Math.round(easeOut(progress) * target))
      if (progress < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [result])

  // Rotate loading messages: anchor first (6-8s), then random non-repeating
  const shownIndicesRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (!loading) {
      setLoadingMsgIndex(0)
      shownIndicesRef.current = new Set()
      return
    }

    // Start with anchor message (index 0)
    setLoadingMsgIndex(0)
    shownIndicesRef.current = new Set([0])
    let loopCount = 0

    const pickNext = () => {
      const rotatingIndices = [1, 2, 3, 4, 5]
      // Filter out already shown in this loop
      let available = rotatingIndices.filter(i => !shownIndicesRef.current.has(i))

      if (available.length === 0) {
        loopCount++
        if (loopCount >= 1) return // Max 1 full loop (stop after all shown once)
        shownIndicesRef.current = new Set([0]) // Reset for next loop, keep anchor excluded
        available = rotatingIndices
      }

      const nextIndex = available[Math.floor(Math.random() * available.length)]
      shownIndicesRef.current.add(nextIndex)
      setLoadingMsgIndex(nextIndex)
    }

    // Random interval between 6-8 seconds per message
    let timeoutId: NodeJS.Timeout
    const scheduleNext = () => {
      const delay = 6000 + Math.random() * 2000
      timeoutId = setTimeout(() => {
        pickNext()
        scheduleNext()
      }, delay)
    }

    // First rotation after anchor shows for 6-8s
    scheduleNext()

    return () => clearTimeout(timeoutId)
  }, [loading])

  // Progress bar animation duration — computed when loading starts.
  // Pure CSS animation (no React state) prevents the stuck-at-1% issue.
  const [progressAnimDuration, setProgressAnimDuration] = useState(60)
  // Key forces React to unmount/remount the animation div on each analysis — restarts CSS animation
  const [progressKey, setProgressKey] = useState(0)
  // Stable start time for percentage counter — ref avoids useEffect restart on duration changes
  const progressStartRef = useRef<{ time: number; duration: number }>({ time: 0, duration: 60 })

  // Percentage counter — runs alongside CSS animation, uses DOM manipulation (proven reliable)
  useEffect(() => {
    if (!loading) return
    const timer = setInterval(() => {
      const { time: startTime, duration } = progressStartRef.current
      if (startTime === 0) return
      const elapsed = Date.now() - startTime
      const durationMs = duration * 1000
      const el = document.getElementById('mr-progress-percent')
      if (!el) return
      if (elapsed <= durationMs) {
        const fraction = elapsed / durationMs
        // sqrt approximation of ease-out matches CSS keyframe curve closely
        const percent = Math.round(1 + Math.sqrt(fraction) * 92)
        el.textContent = `${percent}%`
      } else {
        // Beyond animation duration — slowly increment to show still working
        const overTime = (elapsed - durationMs) / 1000
        const percent = Math.min(97, Math.round(93 + overTime * 0.1))
        el.textContent = `${percent}%`
      }
    }, 300)
    return () => clearInterval(timer)
  }, [loading]) // Only depends on loading — ref handles duration changes

  // Auto-detect language based on user's location
  // Priority: URL param > cookie > timezone/browser detection
  useEffect(() => {
    if (!langDetected) {
      // 1. Check URL param (e.g., after logout redirect)
      const urlParams = new URLSearchParams(window.location.search)
      const urlLang = urlParams.get('lang')
      if (urlLang === 'es' || urlLang === 'en') {
        setLang(urlLang)
        setLanguageCookie(urlLang)
      } else {
        // 2. Cookie > timezone > browser (centralized in lib/language.ts)
        setLang(detectLanguage())
      }
      setLangDetected(true)
    }
  }, [langDetected])

  // Capture UTM params from URL into sessionStorage (survives navigation to signup/login)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const utmSource = params.get('utm_source')
    if (utmSource) {
      const utm = {
        utm_source: utmSource,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        utm_content: params.get('utm_content') || null,
        utm_term: params.get('utm_term') || null,
      }
      sessionStorage.setItem('mr_utm', JSON.stringify(utm))
    }
  }, [])

  // Scroll to results when analysis completes
  useEffect(() => {
    if (result) {
      const resultsElement = document.getElementById('analysis-results')
      if (resultsElement) {
        setTimeout(() => {
          resultsElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }, 100)
      }
    }
  }, [result])

  // Quota guard: clear results immediately when user logs in
  // "Guilty until proven innocent" — results from anonymous analysis are cleared
  // on login, then quota is checked directly to determine follow-up:
  //   has quota → AuthProvider signal → redirect to dashboard
  //   no quota → FreeLimitModal immediately
  const prevUserRef = useRef<typeof user | 'init'>('init')
  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    // Skip initial render
    if (prevUser === 'init') return

    // User just logged in (was null, now has value)
    if (prevUser === null && user !== null) {
      // Clean up OAuth flow marker (if any)
      localStorage.removeItem('authModalFlow')

      if (result) {
        setResult(null)
        setIsUnlocking(false)

        // Check quota directly — don't rely solely on AuthProvider signal
        // (pendingAnalysis in localStorage may already be consumed)
        checkCanAnalyze().then((status) => {
          setUserAnalysisStatus(status); _quotaCache = status
          if (!status.can_analyze) {
            setShowFreeLimitModal(true)
          }
          // If can_analyze is true, AuthProvider's pendingAnalysisSaved signal
          // will handle the unlock animation + redirect to dashboard
        }).catch(() => {
          // On error, show FreeLimitModal as safety fallback
          setShowFreeLimitModal(true)
        })
      } else {
        // No pending analysis — check if user has existing analyses to nudge them
        // Show notification only if user has unseen analyses from this session
        const unseen = parseInt(sessionStorage.getItem('mr_new_analyses') || '0', 10)
        if (unseen > 0) {
          setNotification({
            type: 'has_analyses',
            message_es: unseen === 1 ? 'Tu análisis está listo' : `Tienes ${unseen} análisis listos`,
            message_en: unseen === 1 ? 'Your analysis is ready' : `You have ${unseen} ${unseen === 1 ? 'analysis' : 'analyses'} ready`,
            href: `/dashboard?lang=${lang}`
          })
        }
      }
    }
  }, [user, result])

  // React to pending analysis save success (from AuthProvider after login)
  // Play unlock animation briefly, then redirect to dashboard
  useEffect(() => {
    if (pendingAnalysisSaved) {
      clearPendingAnalysisSaved()
      // Brief unlock animation → redirect to dashboard
      setIsUnlocking(true)
      setTimeout(() => {
        setIsUnlocking(false)
        window.location.href = `/dashboard?lang=${lang}`
      }, 800)
    }
  }, [pendingAnalysisSaved, clearPendingAnalysisSaved])

  // React to pending analysis quota exceeded (from AuthProvider after login)
  // Clear results so user can't see the analysis for free
  useEffect(() => {
    if (pendingAnalysisQuotaExceeded) {
      setResult(null)
      setIsUnlocking(false)
      setShowFreeLimitModal(true)
      clearPendingAnalysisQuotaExceeded()
    }
  }, [pendingAnalysisQuotaExceeded, clearPendingAnalysisQuotaExceeded])

  // Proactive quota cache — pre-fetch quota status so handleAnalyze can use cached check
  // Modal is NOT shown here; it only appears when user clicks Analyze (conversion-friendly UX)
  useEffect(() => {
    if (authLoading || !isLoggedIn || result || loading) return
    checkCanAnalyze().then((status) => {
      // NO_PLAN means profile may not exist yet (new OAuth user) — retry after 2s
      if (status.reason === 'NO_PLAN') {
        setTimeout(() => {
          checkCanAnalyze().then((retryStatus) => {
            setUserAnalysisStatus(retryStatus); _quotaCache = retryStatus
          }).catch(() => {})
        }, 2000)
      } else {
        setUserAnalysisStatus(status); _quotaCache = status
      }
    }).catch(() => {
      // Don't block page load on failed quota check
    })
  }, [isLoggedIn, authLoading])

  // Detect offline during analysis
  useEffect(() => {
    const handleOffline = () => {
      if (loading) {
        setLoading(false)
        setError(ERROR_MESSAGES.offline[lang])
      }
    }
    window.addEventListener('offline', handleOffline)
    return () => window.removeEventListener('offline', handleOffline)
  }, [loading, lang])

  // Loading messages: anchor (index 0) always first, then 1-5 rotate randomly
  const loadingMessages = [
    { es: '🎧 Aplicando la metodología Mastering Ready…', en: '🎧 Applying Mastering Ready methodology…' },
    { es: '🎧 Evaluando headroom y dinámica…', en: '🎧 Evaluating headroom and dynamics…' },
    { es: '🎧 Analizando balance tonal y frecuencias…', en: '🎧 Analyzing tonal and frequency balance…' },
    { es: '🎧 Revisando picos reales y margen técnico…', en: '🎧 Reviewing true peaks and technical margin…' },
    { es: '🎧 Evaluando imagen estéreo y coherencia mono…', en: '🎧 Evaluating stereo image and mono coherence…' },
    { es: '🎧 Preparando métricas para el mastering…', en: '🎧 Preparing metrics for mastering…' }
  ]

  // File validation helper
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 200 * 1024 * 1024 // 200MB
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/aiff', 'audio/x-aiff', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/opus', 'audio/flac', 'audio/x-flac']
    const allowedExtensions = ['.wav', '.mp3', '.aiff', '.aif', '.aac', '.m4a', '.ogg', '.flac']
    
    const fileName = file.name.toLowerCase()
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
    const hasValidType = allowedTypes.includes(file.type) || hasValidExtension
    
    if (!hasValidType) {
      return {
        valid: false,
        error: ERROR_MESSAGES.format_not_supported[lang]
      }
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: ERROR_MESSAGES.file_too_large[lang]
      }
    }
    
    return { valid: true }
  }

const handleAnalyze = async () => {
  if (!file) return
  // Wait for auth state to be determined — prevents treating a logged-in user
  // as anonymous when navigating back (auth re-initializing)
  if (authLoading) return
  // Mutex: prevent concurrent executions (ref is synchronous, not batched by React)
  if (isAnalyzingRef.current) return
  isAnalyzingRef.current = true

  // Snapshot auth state at start — used to skip redundant post-analysis re-check
  const wasLoggedInAtStart = isLoggedIn

  // Quick check: if cached status already says quota is exhausted, block immediately
  // (prevents re-click after closing FreeLimitModal with file still loaded)
  // Skip if reason is NO_PLAN (new user profile may not exist yet — let RPC re-check)
  if (isLoggedIn && !isAdmin && userAnalysisStatus && !userAnalysisStatus.can_analyze && userAnalysisStatus.reason !== 'NO_PLAN') {
    isAnalyzingRef.current = false // Release mutex — this return is before try/finally
    setShowFreeLimitModal(true)
    return
  }

  // Set CSS animation duration based on file size (before loading starts so first render uses it)
  // Set ONCE — never change mid-handler (causes CSS animation glitch + counter desync)
  const estSeconds = file.size > 50 * 1024 * 1024 ? 90 : file.size > 10 * 1024 * 1024 ? 60 : 35
  setProgressAnimDuration(estSeconds)
  setProgressKey(k => k + 1) // Force CSS animation restart on repeat analyses
  progressStartRef.current = { time: Date.now(), duration: estSeconds }
  setLoading(true)
  progressRef.current = 1
  setProgress(1)
  setResult(null)
  setError(null)
  try {
    // ============================================================
    // QUOTA CHECK — diagnostic + timeout safety net
    // ============================================================
    // Use module-level cache as fallback when React state was lost (GoTrueClient conflicts)
    const effectiveQuotaStatus = userAnalysisStatus || _quotaCache

    // ============================================================
    // IP RATE LIMITING CHECK (for anonymous users only)
    // ============================================================
    if (!isLoggedIn) {
      try {
        const ipCheck = await Promise.race([
          checkIpLimit(false),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('IP check timeout')), 8000))
        ])

        if (!ipCheck.can_analyze) {
          setLoading(false)

          if (ipCheck.reason === 'VPN_DETECTED') {
            setVpnServiceName(ipCheck.vpn_service || null)
            setShowVpnModal(true)
            return
          }

          if (ipCheck.reason === 'LIMIT_REACHED') {
            setShowIpLimitModal(true)
            return
          }
        }
      } catch {
        setLoading(false)
        setError(lang === 'es'
          ? 'No se pudo verificar el acceso. Intenta de nuevo en unos segundos.'
          : 'Could not verify access. Please try again in a few seconds.')
        return
      }
    } else {
      // ============================================================
      // USER LIMIT CHECK (for logged-in users)
      // Use cached status if available and positive — skip RPC round-trip
      // ============================================================
      try {
        let analysisStatus: AnalysisStatus
        if (effectiveQuotaStatus?.can_analyze && effectiveQuotaStatus.reason !== 'ANONYMOUS') {
          analysisStatus = effectiveQuotaStatus
        } else {
          analysisStatus = await Promise.race([
            checkCanAnalyze(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Quota check timeout')), 8000))
          ])
        }
        setUserAnalysisStatus(analysisStatus); _quotaCache = analysisStatus

        // Defensive: if user is logged in but checkCanAnalyze returns ANONYMOUS,
        // the Supabase session may have expired — deny analysis rather than bypass quota
        if (analysisStatus.reason === 'ANONYMOUS') {
          setLoading(false)
          setError(lang === 'es'
            ? 'No se pudo verificar tu sesión. Recarga la página e intenta de nuevo.'
            : 'Could not verify your session. Please reload the page and try again.')
          return
        }

        if (!analysisStatus.can_analyze) {
          setLoading(false)
          setShowFreeLimitModal(true)
          return
        }
      } catch {
        setLoading(false)
        // RPC failed — show upgrade modal as safe fallback (user likely hit limit)
        setShowFreeLimitModal(true)
        return
      }
    }
    // ============================================================

    let fileToAnalyze = file
    let originalMetadata: { sampleRate: number; bitDepth: number; numberOfChannels: number; duration: number; fileSize: number } | undefined = undefined

    progressRef.current = 3

    // Header parse ONLY for files needing compression (>50MB) — captures original metadata
    // before compression destroys it. For smaller files, backend reads metadata directly.
    // This eliminates the only await between setLoading(true) and startAnalysisPolling.
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      try {
        const headerPromise = (async () => {
          const headerBuffer = await file.slice(0, 1024).arrayBuffer()
          return parseFileHeader(headerBuffer, file.name)
        })()
        const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Header parse timeout')), 3000))
        const headerInfo = await Promise.race([headerPromise, timeoutPromise])
        if (headerInfo && headerInfo.sampleRate && headerInfo.numberOfChannels && headerInfo.bitDepth) {
          const headerSize = 44
          const bytesPerSample = headerInfo.bitDepth / 8
          const estimatedDuration = (file.size - headerSize) / (headerInfo.sampleRate * headerInfo.numberOfChannels * bytesPerSample)
          if (estimatedDuration > 0 && isFinite(estimatedDuration)) {
            setFileDuration(estimatedDuration)
          }
          originalMetadata = {
            sampleRate: headerInfo.sampleRate,
            bitDepth: headerInfo.bitDepth,
            numberOfChannels: headerInfo.numberOfChannels,
            duration: estimatedDuration > 0 ? estimatedDuration : 0,
            fileSize: file.size
          }
        }
      } catch {
        // Header parsing failed or timed out — backend will read from file directly
      }
    }

    progressRef.current = 5

    // Compress files over 50MB to prevent Render OOM (512MB RAM limit)
    if (file.size > maxSize) {
      setCompressing(true)
      setCompressionProgress(0)

      const compressionInterval = setInterval(() => {
        setCompressionProgress(prev => Math.min(prev + 2, 92))
      }, 200)

      try {
        const { file: compressedFile, compressed, originalSize, newSize, originalMetadata: metadata } =
          await compressAudioFile(file, 20)

        clearInterval(compressionInterval)
        setCompressionProgress(100)

        fileToAnalyze = compressedFile
        // Only use compression metadata if pre-compression header parse didn't capture it
        if (!originalMetadata) {
          originalMetadata = metadata
        }

        setCompressing(false)
        setCompressionProgress(0)

        // Reset progress animation AFTER compression — the CSS animation and percentage
        // counter were running during compression, making them desync with actual analysis.
        // Recalculate estimated time based on compressed file size + duration.
        const postCompressEst = fileDuration && fileDuration > 120
          ? Math.round((Math.ceil(fileDuration / 60) * 8 + 10) / 10) * 10
          : 35
        setProgressAnimDuration(postCompressEst)
        setProgressKey(k => k + 1) // Restart CSS animation from 0%
        progressStartRef.current = { time: Date.now(), duration: postCompressEst }
      } catch (compressionError) {
        clearInterval(compressionInterval)
        setCompressing(false)
        setCompressionProgress(0)
        throw new Error(ERROR_MESSAGES.corrupt_file[lang])
      }
    }

    progressRef.current = 7

    // START ANALYSIS (returns job_id immediately)
    const startData = await startAnalysisPolling(fileToAnalyze, {
      lang,
      mode,
      strict,
      originalMetadata,
      isAuthenticated: isLoggedIn
    })
    const jobId = startData.job_id

    // Store request ID for PDF download
    requestIdRef.current = jobId

    progressRef.current = 10

    // POLL FOR RESULT — adaptive interval: fast at first, slows down
    const pollStartTime = Date.now()
    const maxPollDuration = 5 * 60 * 1000  // 5 min max
    let pollCount = 0

    const pollForResult = async (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const poll = async () => {
          pollCount++
          const elapsed = Date.now() - pollStartTime

          // Adaptive delay: 1s first 10s, 3s after, 4s after 90s
          const getDelay = () => {
            if (elapsed < 10000) return 1000
            if (elapsed < 90000) return 3000
            return 4000
          }

          try {
            const statusData = await getAnalysisStatus(jobId, lang)

            // Update progress ref — render tick timer syncs to UI
            const newProgress = statusData.progress || 0
            if (newProgress > progressRef.current) {
              progressRef.current = newProgress
            }

            if (statusData.status === 'complete') {
              resolve(statusData.result)
            } else if (statusData.status === 'error') {
              console.error('Analysis error:', statusData.error)
              reject(new Error(statusData.error || 'Analysis failed'))
            } else if (elapsed >= maxPollDuration) {
              console.error('Polling timeout')
              reject(new Error(ERROR_MESSAGES.timeout[lang]))
            } else {
              setTimeout(poll, getDelay())
            }
          } catch (pollError: any) {
            console.error('Polling error:', pollError)
            reject(pollError)
          }
        }
        setTimeout(poll, 1000)  // First poll after 1s
      })
    }
    
    // Wait for result
    const data = await pollForResult()

    progressRef.current = 100

    // Save analysis — quota must be verified before showing results.
    // DB save runs in background to prevent UI from hanging on slow Supabase calls.
    if (data) {
      if (isLoggedIn && user) {
        // If user was logged in at start, quota was already verified by pre-check RPC.
        // Only re-check if user logged in DURING analysis (wasLoggedInAtStart=false).
        if (!wasLoggedInAtStart) {
          try {
            const quotaCheck = await checkCanAnalyze()
            if (!quotaCheck.can_analyze || quotaCheck.reason === 'ANONYMOUS') {
              setUserAnalysisStatus(quotaCheck); _quotaCache = quotaCheck
              setShowFreeLimitModal(true)
              // Do NOT show results — analysis is lost
              progressRef.current = 0
              setProgress(0)
              setLoading(false)
              return
            }
          } catch (quotaErr) {
            console.error('[Analysis] Quota re-check failed, blocking display:', quotaErr)
            setShowFreeLimitModal(true)
            progressRef.current = 0
            setProgress(0)
            setLoading(false)
            return
          }
        }
        // Quota verified — show results immediately
        setResult(data)
        // Optimistically update quota cache (no network call)
        // Use module-level _quotaCache as fallback if React state was lost
        const cachedForUpdate = userAnalysisStatus || _quotaCache
        if (cachedForUpdate) {
          const newUsed = cachedForUpdate.analyses_used + 1
          const limit = cachedForUpdate.analyses_limit
          const updated = {
            ...cachedForUpdate,
            analyses_used: newUsed,
            can_analyze: limit < 0 ? true : newUsed < limit // limit < 0 = admin (unlimited)
          }
          setUserAnalysisStatus(updated)
          _quotaCache = updated
        }
        // Save to database — non-blocking so Supabase client is free for dashboard navigation.
        // SPA navigation does NOT kill JS promises, so the save completes in background.
        saveAnalysisToDatabase(user.id, {
          ...data,
          filename: file.name,
          created_at: new Date().toISOString(),
          lang,
          strict,
          api_request_id: requestIdRef.current || null
        }, file, geo?.countryCode, isAdmin, session ? { access_token: session.access_token, refresh_token: session.refresh_token } : undefined)
          .then(savedData => {
            setSavedAnalysisId(savedData?.[0]?.id || null)
            // Session counter: increments per analysis, resets on dashboard visit
            const prev = parseInt(sessionStorage.getItem('mr_new_analyses') || '0', 10)
            const count = prev + 1
            sessionStorage.setItem('mr_new_analyses', String(count))
            setNotification({
              type: 'analysis_ready',
              message_es: count === 1 ? 'Tu análisis está listo' : `Tienes ${count} análisis listos`,
              message_en: count === 1 ? 'Your analysis is ready' : `You have ${count} ${count === 1 ? 'analysis' : 'analyses'} ready`,
              href: `/dashboard?lang=${lang}`
            })
          })
          .catch(saveErr => {
            console.error('[Analysis] Failed to save to database:', saveErr)
          })
      } else {
        // Anonymous: show results immediately and save to localStorage
        setResult(data)
        const pendingAnalysis = {
          ...data,
          filename: file.name,
          created_at: new Date().toISOString(),
          lang,
          strict
        }
        localStorage.setItem('pendingAnalysis', JSON.stringify(pendingAnalysis))

        // Track anonymous analysis for funnel analytics (fire-and-forget)
        try {
          let anonSessionId = sessionStorage.getItem('mr_anon_session')
          if (!anonSessionId) {
            anonSessionId = crypto.randomUUID()
            sessionStorage.setItem('mr_anon_session', anonSessionId)
          }
          const ua = navigator.userAgent || ''
          const deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|iPhone|Android.*Mobile/i.test(ua) ? 'mobile' : 'desktop'
          void supabase.from('anonymous_analyses').insert({
            session_id: anonSessionId,
            filename: file.name,
            score: data.score,
            verdict: data.verdict,
            duration_seconds: data.file?.duration || null,
            sample_rate: data.file?.sample_rate || null,
            bit_depth: data.file?.bit_depth || null,
            format: file.name.split('.').pop()?.toUpperCase() || null,
            lang,
            client_country: geo?.countryCode || null,
            is_chunked: data.is_chunked_analysis || false,
            user_agent: ua.substring(0, 500),
            device_type: deviceType
          }).then(() => {
            // tracked
          })
        } catch {
          // Silently ignore tracking errors
        }
      }
    }

    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    
  } catch (err: any) {
    console.error('Analysis error:', err)
    setError(getErrorMessage(err, lang))
  } finally {
    isAnalyzingRef.current = false
    setLoading(false)
    progressRef.current = 0
    setProgress(0)
    setCompressing(false)
    setCompressionProgress(0)
  }
}

  const handleReset = () => {
    // Check quota before allowing new upload — don't let user waste time uploading
    // Admin always passes (unlimited analyses)
    const quotaForReset = userAnalysisStatus || _quotaCache
    if (isLoggedIn && !isAdmin && quotaForReset && !quotaForReset.can_analyze && quotaForReset.reason !== 'NO_PLAN') {
      setShowFreeLimitModal(true)
      return
    }

    setFile(null)
    setResult(null)
    setError(null)
    setLoading(false)
    progressRef.current = 0
    setProgress(0)
    setFileDuration(null)
    setSavedAnalysisId(null)
    setAnalysisRating(null)
    setAnalysisComment('')
    setRatingSubmitted(false)
    setShowRatingWidget(false)
    setCtaSource(null)
  }

  // CTA click tracking (fire-and-forget)
  const trackCtaClick = (ctaType: string) => {
    supabase.from('cta_clicks').insert({
      analysis_id: savedAnalysisId,
      user_id: user?.id || null,
      cta_type: ctaType,
      score_at_click: result?.score || null,
      client_country: geo?.countryCode || null
    }).then(() => {})
  }

  // Contact request logging (fire-and-forget)
  const logContactRequest = (contactMethod: string) => {
    supabase.from('contact_requests').insert({
      analysis_id: savedAnalysisId,
      user_id: user?.id || null,
      cta_source: ctaSource,
      contact_method: contactMethod,
      client_country: geo?.countryCode || null
    }).then(() => {})
  }

  // Analysis rating submission
  const submitAnalysisRating = async () => {
    if (analysisRating === null) return
    await supabase.from('user_feedback').insert({
      user_id: user?.id || null,
      analysis_id: savedAnalysisId,
      feedback_type: 'analysis_rating',
      rating_bool: analysisRating,
      message: analysisComment || '',
      subject: analysisRating ? 'Thumbs up' : 'Thumbs down',
      category: 'other',
      lang: lang,
      client_country: geo?.countryCode || null
    })
    setRatingSubmitted(true)
  }

  const handleDownload = () => {
    if (!result) return
    
    let content = ''
    
    if (reportView === 'visual') {
      // Quick mode download - Include ALL visual analysis content
      const visualReport = (result as any).report_visual || result.report_short || result.report || ''
      const cleanedReport = cleanReportText(visualReport)
      
      content = `${lang === 'es' ? 'ANÁLISIS RÁPIDO' : 'QUICK ANALYSIS'}
${'═'.repeat(50)}

${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Puntuación MR' : 'MR Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}

${lang === 'es' ? 'MÉTRICAS PRINCIPALES' : 'MAIN METRICS'}
${'─'.repeat(50)}
Headroom:              ${result.metrics?.find((m: any) => m.name === 'Headroom')?.value || 'N/A'}
True Peak:             ${result.metrics?.find((m: any) => m.name === 'True Peak')?.value || 'N/A'}
${lang === 'es' ? 'Balance Estéreo' : 'Stereo Balance'}:       ${result.metrics?.find((m: any) => m.name === 'Stereo Balance' || m.name === 'Balance Estéreo')?.value || 'N/A'}
LUFS:                  ${result.metrics?.find((m: any) => m.name === 'LUFS')?.value || 'N/A'}
PLR:                   ${result.metrics?.find((m: any) => m.name === 'PLR')?.value || 'N/A'}
${lang === 'es' ? 'Correlación' : 'Correlation'}:           ${result.metrics?.find((m: any) => m.name === 'Correlation' || m.name === 'Correlación')?.value || 'N/A'}

${lang === 'es' ? 'ANÁLISIS DETALLADO' : 'DETAILED ANALYSIS'}
${'─'.repeat(50)}
${cleanedReport}

${'─'.repeat(50)}
${lang === 'es' ? 'Generado por' : 'Generated by'} Mastering Ready
${new Date().toLocaleDateString()}
`
    } else if (reportView === 'short') {
      // Summary mode download
      content = `${lang === 'es' ? 'ANÁLISIS RESUMEN' : 'SUMMARY ANALYSIS'}
${'═'.repeat(50)}

${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Puntuación MR' : 'MR Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}

${'─'.repeat(50)}
${cleanReportText(result.report_short || result.report)}

${'─'.repeat(50)}
${lang === 'es' ? 'Generado por' : 'Generated by'} Mastering Ready
${new Date().toLocaleDateString()}
`
    } else {
      // Complete mode download - Include interpretations
      let completeContent = `${lang === 'es' ? 'ANÁLISIS TÉCNICO DETALLADO' : 'DETAILED TECHNICAL ANALYSIS'}
${'═'.repeat(50)}

${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Puntuación MR' : 'MR Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}
`

      // Add interpretative sections FIRST if they exist
      if (result.interpretations) {
        
        // Helper function to format interpretation section
        const formatInterpretation = (
          sectionKey: string, 
          titleEs: string, 
          titleEn: string
        ) => {
          const section = result.interpretations[sectionKey]
          if (!section) return ''
          
          const title = lang === 'es' ? titleEs : titleEn
          const recLabel = lang === 'es' ? 'Recomendación' : 'Recommendation'
          
          let output = `

${title}
${'─'.repeat(50)}
`
          
          // Add metrics FIRST
          const metrics = section.metrics || {}
          const metricsEntries = Object.entries(metrics).filter(([key]) => key !== 'status')
          
          if (metricsEntries.length > 0) {
            output += `\n${lang === 'es' ? 'Datos técnicos' : 'Technical data'}:\n`
            
            for (const [key, value] of metricsEntries) {
            
            // Format key names with correct capitalization
            let formattedKey = key
            
            // Handle specific cases first (same as visual component)
            if (key === 'headroom_dbfs') {
              formattedKey = 'Headroom dBFS'
            } else if (key === 'true_peak_dbtp') {
              formattedKey = 'True Peak dBTP'
            } else if (key === 'plr' || key === 'dr_lu') {
              formattedKey = 'PLR'
            } else if (key === 'balance_l_r' || key === 'balance_lr') {
              formattedKey = 'Balance L/R'
            } else if (key === 'ms_ratio') {
              formattedKey = 'M/S Ratio'
            } else if (key === 'correlation') {
              formattedKey = 'Correlation'
            } else if (key === 'lufs') {
              formattedKey = 'LUFS'
            } else {
              // Generic formatting for other keys
              formattedKey = key
                .replace(/_/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }
            
            const formattedValue = typeof value === 'number' ? value.toFixed(2) : value
            output += `  • ${formattedKey}: ${formattedValue}\n`
            }
          }
          
          // Add interpretation AFTER metrics
          output += `\n${section.interpretation}\n`
          
          // Add recommendation LAST
          output += `\n💡 ${recLabel}: ${section.recommendation}\n`
          
          return output
        }
        
        // Add all 4 sections
        completeContent += formatInterpretation(
          'headroom',
          '🎚️ HEADROOM & TRUE PEAK',
          '🎚️ HEADROOM & TRUE PEAK'
        )
        
        completeContent += formatInterpretation(
          'dynamic_range',
          '📈 RANGO DINÁMICO',
          '📈 DYNAMIC RANGE'
        )
        
        completeContent += formatInterpretation(
          'overall_level',
          '🔊 NIVEL GENERAL',
          '🔊 OVERALL LEVEL'
        )
        
        completeContent += formatInterpretation(
          'stereo_balance',
          '🎚️ BALANCE ESTÉREO',
          '🎚️ STEREO BALANCE'
        )
      }
      
      // Add complete narrative analysis AFTER technical sections
      completeContent += `

${'═'.repeat(50)}
${lang === 'es' ? 'ANÁLISIS COMPLETO' : 'COMPLETE ANALYSIS'}
${'═'.repeat(50)}

${'─'.repeat(50)}
${cleanReportText(result.report_write || result.report)}
`
      
      // Add footer
      completeContent += `
${'─'.repeat(50)}
${lang === 'es' ? 'Generado por' : 'Generated by'} Mastering Ready
${new Date().toLocaleDateString()}
`
      
      content = completeContent
    }
    
    // Get translated filename
    const getModeFilename = (mode: string) => {
      const modeNames = {
        es: {
          visual: 'rapido',
          short: 'resumen',
          write: 'completo'
        },
        en: {
          visual: 'quick',
          short: 'summary',
          write: 'complete'
        }
      }
      return modeNames[lang][mode as keyof typeof modeNames.es] || mode
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masteringready-${getModeFilename(reportView)}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadFull = async () => {
    if (!result) {
      console.error('No result available')
      alert(lang === 'es' ? 'Error: análisis no disponible' : 'Error: analysis not available')
      return
    }

    // Verify that analysis is actually complete
    if (!result.score || !result.verdict) {
      console.error('Analysis incomplete, missing score or verdict')
      alert(lang === 'es' 
        ? 'El análisis aún no está completo. Por favor espera unos segundos.' 
        : 'Analysis not yet complete. Please wait a few seconds.')
      return
    }
    
    try {
      // Try PDF first if endpoint is available
      if (requestIdRef.current) {

        try {
          const formData = new FormData()
          formData.append('request_id', requestIdRef.current)
          formData.append('lang', lang)

          // Use full backend URL — guard against placeholder values
          const envUrl = process.env.NEXT_PUBLIC_API_URL
          const backendUrl = (envUrl && !envUrl.includes('your-backend'))
            ? envUrl
            : 'https://masteringready.onrender.com'
          const pdfUrl = `${backendUrl}/api/download/pdf`

          const response = await fetch(pdfUrl, {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            // PDF download successful
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const filename = result.filename?.replace(/\.(wav|mp3|flac)$/i, '') || 'análisis'
            a.download = `masteringready-${lang === 'es' ? 'detallado' : 'detailed'}-${filename}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            return
          } else {
            const errorText = await response.text()
            console.error('[PDF Download] Error response:', response.status, errorText)
          }
        } catch (pdfError) {
          console.error('[PDF Download] Exception:', pdfError)
        }
      }
      
      // Fallback to TXT download
      
      const content = `${'═'.repeat(50)}
   MASTERING READY - ${lang === 'es' ? 'Reporte Completo' : 'Complete Report'}
${'═'.repeat(50)}

${lang === 'es' ? 'INFORMACIÓN DEL ARCHIVO' : 'FILE INFORMATION'}
${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
${lang === 'es' ? 'Puntuación MR' : 'MR Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}

${lang === 'es' ? 'ANÁLISIS RÁPIDO' : 'QUICK ANALYSIS'}
${cleanReportText((result as any).report_visual || '')}

${lang === 'es' ? 'ANÁLISIS RESUMEN' : 'SUMMARY ANALYSIS'}
${cleanReportText(result.report_short || '')}

${lang === 'es' ? 'ANÁLISIS COMPLETO' : 'COMPLETE ANALYSIS'}
${cleanReportText(result.report_write || result.report || '')}

${'─'.repeat(50)}
${lang === 'es' ? 'Analizado con' : 'Analyzed with'} Mastering Ready
www.masteringready.com
by Matías Carvajal
`
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = result.filename?.replace(/\.(wav|mp3|flac)$/i, '') || 'análisis'
      a.download = `masteringready-${lang === 'es' ? 'detallado' : 'detailed'}-${filename}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      
    } catch (error) {
      // Only show error if TXT download also failed
      console.error('Complete download failed:', error)
      alert(lang === 'es' 
        ? 'Error al descargar archivo. Por favor intenta de nuevo.' 
        : 'Error downloading file. Please try again.')
    }
  }

  const scrollToAnalyzer = () => {
    document.getElementById('analyze')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Clean report text from decorative lines for better mobile display
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
      // Remove ALL decorative lines
      .replace(/[═─━_]{3,}/g, '')
      .replace(/^[═─━_\s]+$/gm, '')
      .replace(/[═─━]{2,}/g, '')
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

  const isFileTooLarge = file && file.size > 200 * 1024 * 1024 // 200MB hard limit
  const needsCompression = file && file.size > 50 * 1024 * 1024 && file.size <= 200 * 1024 * 1024

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'var(--mr-green)'
    if (score >= 60) return 'var(--mr-amber)'
    return 'var(--mr-red)'
  }

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'var(--mr-green-bg)'
    if (score >= 60) return 'var(--mr-amber-bg)'
    return 'var(--mr-red-bg)'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mr-bg-card)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        background: 'var(--mr-bg-card)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'var(--mr-shadow)',
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '64px', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'var(--mr-gradient)',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Music size={18} color="white" />
              </div>
              {!isMobile && (
                <span style={{
                  fontWeight: '700',
                  background: 'var(--mr-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  whiteSpace: 'nowrap'
                }}>
                  Mastering Ready
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '0.75rem', alignItems: 'center', flexShrink: 0 }}>
              {/* Language Toggle */}
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
                  padding: '0.5rem 0.75rem',
                  minWidth: '2.75rem',
                  minHeight: '2.75rem',
                  textAlign: 'center',
                  background: 'transparent',
                  color: 'var(--mr-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}
                aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>

              {/* Theme Toggle */}
              <ThemeToggle lang={lang} />

              {/* Notification Badge — persistent until clicked or dismissed */}
              {user && <NotificationBadge lang={lang} isMobile={isMobile} />}

              {/* User Menu — hidden on mobile when not logged in (hamburger handles it) */}
              <UserMenu lang={lang} isMobile={isMobile} />

              {/* Analyze CTA — always visible */}
              <button
                onClick={scrollToAnalyzer}
                style={{
                  background: 'var(--mr-gradient)',
                  color: 'white',
                  padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 3vw, 1.5rem)',
                  borderRadius: '9999px',
                  fontWeight: '600',
                  fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  whiteSpace: 'nowrap',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {lang === 'es' ? 'Analizar' : 'Analyze'}
              </button>

              {/* Hamburger menu — mobile only, when not logged in */}
              {isMobile && !user && (
                <div ref={mobileMenuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '44px',
                      height: '44px',
                      background: 'none',
                      border: '1px solid var(--mr-border-strong)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      color: 'var(--mr-text-primary)'
                    }}
                    aria-label={mobileMenuOpen ? (lang === 'es' ? 'Cerrar menú' : 'Close menu') : (lang === 'es' ? 'Abrir menú' : 'Open menu')}
                  >
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>

                  {mobileMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      background: 'var(--mr-bg-card)',
                      borderRadius: '0.75rem',
                      boxShadow: 'var(--mr-shadow-lg)',
                      minWidth: '200px',
                      overflow: 'hidden',
                      zIndex: 50
                    }}>
                      {/* Auth links */}
                      <div style={{ padding: '0.5rem 0' }}>
                        <Link
                          href={`/auth/login?lang=${lang}`}
                          onClick={() => setMobileMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            color: 'var(--mr-text-primary)',
                            textDecoration: 'none',
                            fontSize: '0.95rem',
                            transition: 'background 0.2s'
                          }}
                        >
                          {lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}
                        </Link>
                        <Link
                          href={`/auth/signup?lang=${lang}`}
                          onClick={() => setMobileMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            color: 'var(--mr-primary)',
                            textDecoration: 'none',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            transition: 'background 0.2s'
                          }}
                        >
                          {lang === 'es' ? 'Registrarse' : 'Sign Up'}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" style={{
        paddingBottom: '4rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        background: 'var(--mr-gradient)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '3rem',
            alignItems: 'center'
          }}>
            {/* Left: Copy */}
            <div style={{ color: 'white' }}>
              <div className="methodology-badge" style={{
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '9999px',
                padding: 'clamp(0.375rem, 1vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)'
              }}>
                <span style={{ fontSize: 'clamp(0.8rem, 1.8vw, 1rem)', fontWeight: '500' }}>
                  ✨ {lang === 'es' 
                    ? 'Metodología probada en más de 300 producciones profesionales'
                    : 'Methodology proven in over 300 professional productions'}
                </span>
              </div>
              
              <h1 className="hero-main-title" style={{
                fontSize: 'clamp(1.75rem, 5vw, 3.75rem)',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
                lineHeight: '1.2'
              }}>
                {lang === 'es'
                  ? 'No adivines si tu mezcla está lista'
                  : "Don't guess if your mix is ready"}
              </h1>
              
              <p className="hero-subtitle" style={{
                fontSize: 'clamp(0.95rem, 2vw, 1.5rem)',
                marginBottom: '1.5rem',
                color: '#e9d5ff'
              }}>
                {lang === 'es'
                  ? <>Te decimos qué debes revisar <span style={{ whiteSpace: 'nowrap' }}>antes de</span> <span style={{ whiteSpace: 'nowrap' }}>enviarla a master</span></>
                  : <>We tell you what to check <span style={{ whiteSpace: 'nowrap' }}>before sending it</span> <span style={{ whiteSpace: 'nowrap' }}>to master</span></>}
              </p>
              
              <button
                onClick={scrollToAnalyzer}
                className="hero-cta-button"
                style={{
                  background: '#ffffff',
                  color: '#667eea',
                  padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2rem)',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'
                }}
              >
                {lang === 'es' ? 'Analiza tu mezcla gratis' : 'Analyze your mix free'}
              </button>
              
              <div className="hero-checks" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem' }}>
                {[
                  lang === 'es' ? 'Privacidad primero' : 'Privacy-first',
                  lang === 'es' ? 'Inglés y Español' : 'English & Spanish'
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check size={20} />
                    {text}
                  </div>
                ))}
              </div>

              <p style={{
                marginTop: '1.25rem',
                fontSize: 'clamp(0.85rem, 1.8vw, 1rem)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                {lang === 'es'
                  ? 'No reemplazamos al ingeniero de mastering. Te ayudamos a llegar preparado.'
                  : "We don't replace your mastering engineer. We help you arrive prepared."}
              </p>
            </div>

            {/* Right: Demo Card */}
            <div className="demo-card-container">
              <div style={{
                background: 'var(--mr-bg-card)',
                border: 'var(--mr-card-border)',
                borderRadius: '1rem',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                padding: '2rem',
                transition: 'transform 0.3s'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--mr-text-secondary)', fontWeight: '500', fontSize: '1.125rem' }}>
                      {lang === 'es' ? 'Puntuación MR' : 'MR Score'}
                    </span>
                    <span style={{
                      fontSize: '2.25rem',
                      fontWeight: 'bold',
                      background: 'var(--mr-gradient)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      97/100
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '0.75rem',
                    background: 'var(--mr-bg-hover)',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '97%',
                      height: '100%',
                      background: 'var(--mr-gradient)',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Headroom', value: '-6.2 dBFS' },
                    { label: 'True Peak', value: '-3.1 dBTP' },
                    { label: lang === 'es' ? 'Balance Estéreo' : 'Stereo Balance', value: '0.75' }
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'var(--mr-green-bg)',
                      borderRadius: '0.5rem'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mr-green-text)' }}>
                        <Check size={20} color="var(--mr-green)" />
                        {item.label}
                      </span>
                      <span style={{ color: 'var(--mr-green-text)', fontWeight: '600' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'var(--mr-purple-bg)',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{ fontSize: '1rem', color: 'var(--mr-purple-text)', fontWeight: '600' }}>
                    ✅ {lang === 'es' 
                      ? 'Lista para mastering profesional'
                      : 'Ready for professional mastering'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bridge Statement */}
      <div className="bridge-section" style={{
        textAlign: 'center',
        background: 'var(--mr-bg-base)'
      }}>
        <p className="bridge-text" style={{
          fontWeight: '400',
          fontStyle: 'italic',
          lineHeight: '1.6',
          margin: '0 auto'
        }}>
          {lang === 'es'
            ? 'Lo importante no es la métrica. Es saber qué hacer con ella.'
            : 'The metric isn\u2019t what matters. Knowing what to do with it is.'}
        </p>
      </div>

      {/* Features Section */}
      <section id="features" className="features-section" style={{
        background: 'var(--mr-bg-base)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="features-title-container" style={{
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {lang === 'es' ? '¿Por qué Mastering Ready?' : 'Why Mastering Ready?'}
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--mr-text-secondary)' }}>
              {lang === 'es'
                ? 'Criterio técnico aplicado a tu mezcla'
                : 'Technical judgment applied to your mix'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              {
                icon: <Zap size={48} color="var(--mr-primary)" />,
                title: lang === 'es' ? 'Análisis profesional en 60 segundos' : 'Professional analysis in 60 seconds',
                desc: lang === 'es'
                  ? 'LUFS, True Peak, headroom, correlación estéreo, balance frecuencial y más.'
                  : 'LUFS, True Peak, headroom, stereo correlation, frequency balance and more.'
              },
              {
                icon: <Shield size={48} color="var(--mr-primary)" />,
                title: lang === 'es' ? 'Privacidad garantizada' : 'Privacy guaranteed',
                desc: lang === 'es'
                  ? 'Tu audio nunca se almacena. Análisis en memoria, eliminación inmediata.'
                  : 'Your audio is never stored. In-memory analysis, immediate deletion.'
              },
              {
                icon: <TrendingUp size={48} color="var(--mr-primary)" />,
                title: lang === 'es' ? 'Recomendaciones específicas' : 'Specific recommendations',
                desc: lang === 'es'
                  ? 'No solo números, te decimos qué ajustar y por qué.'
                  : "Not just numbers. We tell you what to adjust and why."
              },
            ].map((feature, i) => (
              <div key={i} style={{
                background: 'var(--mr-bg-card)',
                border: 'var(--mr-card-border)',
                padding: '2rem',
                borderRadius: '1rem',
                boxShadow: 'var(--mr-shadow)',
                transition: 'transform 0.3s, box-shadow 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'
              }}>
                <div style={{ marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--mr-text-secondary)', lineHeight: '1.6' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analyzer Section - Same as before but with inline styles */}
      <section id="analyze" className="analyzer-section" style={{
        background: 'var(--mr-bg-card)'
      }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          {!result ? (
            <>
              <div className="analyzer-title-container" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  {lang === 'es' ? 'Analiza tu mezcla ahora' : 'Analyze your mix now'}
                </h2>
                <p style={{ fontSize: '1.25rem', color: 'var(--mr-text-secondary)' }}>
                  {lang === 'es'
                    ? 'Sube tu archivo y obtén un reporte profesional en 60 segundos'
                    : 'Upload your file and get a professional report in 60 seconds'}
                </p>
              </div>

              {/* Privacy Badge */}
              <div style={{
                background: 'var(--mr-green-bg)',
                border: '1px solid var(--mr-green)',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Shield size={20} color="var(--mr-green)" />
                  <span style={{ fontWeight: '600', color: 'var(--mr-green-text)' }}>
                    {lang === 'es' ? 'Analizador con Privacidad' : 'Privacy-First Analyzer'}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--mr-green-text)' }}>
                  {lang === 'es'
                    ? 'Tu audio se analiza solo en memoria y se elimina inmediatamente.'
                    : 'Your audio is analyzed in-memory only and deleted immediately.'}
                </p>
              </div>

              {/* File Upload */}
              <div style={{
                background: 'var(--mr-bg-card)',
                border: 'var(--mr-card-border)',
                borderRadius: '1rem',
                boxShadow: 'var(--mr-shadow-lg)',
                padding: '2rem',
                marginBottom: '1.5rem'
              }}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={lang === 'es' ? 'Subir archivo de audio para analizar' : 'Upload audio file to analyze'}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !loading && document.getElementById('file-input')?.click() } }}
                  onClick={() => !loading && document.getElementById('file-input')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!loading) {
                      e.currentTarget.style.borderColor = 'var(--mr-purple-text)'
                      e.currentTarget.style.background = 'var(--mr-purple-bg)'
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = 'var(--mr-border-strong)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = 'var(--mr-border-strong)'
                    e.currentTarget.style.background = 'transparent'
                    
                    if (!loading && e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const droppedFile = e.dataTransfer.files[0]
                      
                      // Validate file
                      const validation = validateFile(droppedFile)
                      if (!validation.valid) {
                        setError(validation.error || null)
                        return
                      }
                      
                      setError(null)
                      setFile(droppedFile)
                      
                      // Scroll to analyze section
                      setTimeout(() => {
                        const analyzeSection = document.getElementById('analyze-section')
                        if (analyzeSection) {
                          analyzeSection.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center'
                          })
                        }
                      }, 100)
                    }
                  }}
                  style={{
                    border: '2px dashed var(--mr-border-strong)',
                    borderRadius: '0.75rem',
                    padding: 'clamp(1.25rem, 4vw, 3rem)',
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = 'var(--mr-purple-text)'
                      e.currentTarget.style.background = 'var(--mr-purple-bg)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--mr-border-strong)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <input
                    id="file-input"
                    type="file"
                    aria-label={lang === 'es' ? 'Seleccionar archivo de audio' : 'Select audio file'}
                    accept=".wav,.mp3,.aiff,.aif,.aac,.m4a,.ogg,.flac"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] || null
                      
                      if (selectedFile) {
                        // Validate file
                        const validation = validateFile(selectedFile)
                        if (!validation.valid) {
                          setError(validation.error || null)
                          e.target.value = '' // Reset input
                          return
                        }
                        
                        setError(null)
                        setFile(selectedFile)
                        
                        // Scroll to analyze section when file is selected
                        setTimeout(() => {
                          const analyzeSection = document.getElementById('analyze-section')
                          if (analyzeSection) {
                            analyzeSection.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'center'
                            })
                          }
                        }, 100)
                      }
                    }}
                    style={{ display: 'none' }}
                    disabled={loading}
                  />
                  
                  <Upload size={isMobile ? 48 : 64} color="var(--mr-text-tertiary)" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)', fontWeight: '500', marginBottom: '0.5rem' }}>
                    {lang === 'es' ? 'Arrastra y suelta tu archivo aquí' : 'Drag and drop your file here'}
                  </p>
                  <p style={{ fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', color: 'var(--mr-text-secondary)' }}>
                    {lang === 'es'
                      ? 'o haz click para seleccionar'
                      : 'or click to select'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)', marginTop: '0.5rem' }}>
                    {lang === 'es' ? 'WAV, MP3, AIFF, FLAC, AAC, M4A u OGG • Máximo 200MB' : 'WAV, MP3, AIFF, FLAC, AAC, M4A or OGG • Max 200MB'}
                  </p>
                </div>
              </div>

              {/* Selected File */}
              {file && (
                <div style={{
                  borderRadius: '0.5rem',
                  border: `1px solid ${isFileTooLarge ? 'var(--mr-red)' : needsCompression ? 'var(--mr-amber)' : 'var(--mr-blue)'}`,
                  background: isFileTooLarge ? 'var(--mr-red-bg)' : needsCompression ? 'var(--mr-amber-bg)' : 'var(--mr-blue-bg)',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: isFileTooLarge ? 'var(--mr-red-text)' : needsCompression ? 'var(--mr-amber-text)' : 'var(--mr-blue-text)'
                  }}>
                    {lang === 'es' ? 'Archivo seleccionado:' : 'Selected file:'}
                  </p>
                  <p style={{
                    fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)',
                    fontWeight: 'bold',
                    color: isFileTooLarge ? 'var(--mr-red-text)' : needsCompression ? 'var(--mr-amber-text)' : 'var(--mr-blue-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}>
                    {file.name}
                  </p>
                  <p style={{
                    fontSize: '0.875rem',
                    color: isFileTooLarge ? 'var(--mr-red-text)' : needsCompression ? 'var(--mr-amber-text)' : 'var(--mr-blue-text)'
                  }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {needsCompression && !isFileTooLarge && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: 'var(--mr-amber-bg)',
                      border: '1px solid var(--mr-amber)',
                      borderRadius: '0.25rem',
                      padding: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--mr-amber-text)', fontWeight: '600', marginBottom: '0.25rem' }}>
                        ℹ️ {lang === 'es' 
                          ? 'Archivo grande detectado'
                          : 'Large file detected'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--mr-amber-text)' }}>
                        {lang === 'es'
                          ? `Tu archivo será comprimido automáticamente de ${(file.size / 1024 / 1024).toFixed(1)}MB a ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB antes del análisis. Esto no afecta la fidelidad del análisis. Toma ~10-15 segundos.`
                          : `Your file will be automatically compressed from ${(file.size / 1024 / 1024).toFixed(1)}MB to ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB before analysis. This does not affect analysis fidelity. Takes ~10-15 seconds.`}
                      </p>
                    </div>
                  )}
                  {isFileTooLarge && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: 'var(--mr-red-bg)',
                      border: '1px solid var(--mr-red)',
                      borderRadius: '0.25rem',
                      padding: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--mr-red-text)', fontWeight: '600', marginBottom: '0.25rem' }}>
                        ⚠️ {lang === 'es' 
                          ? 'Archivo demasiado grande'
                          : 'File too large'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--mr-red-text)' }}>
                        {lang === 'es'
                          ? `El límite máximo es 200MB. Tu archivo tiene ${(file.size / 1024 / 1024).toFixed(1)}MB. Por favor, usa un archivo más pequeño.`
                          : `Maximum limit is 200MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please use a smaller file.`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Options */}
              {file && !isFileTooLarge && (
                <div 
                  id="analyze-section"
                  style={{
                    background: 'var(--mr-bg-card)',
                    borderRadius: '0.75rem',
                    boxShadow: 'var(--mr-shadow)',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}
                >
                  <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '1rem' }}>
                    {lang === 'es' ? 'Opciones de Análisis' : 'Analysis Options'}
                  </h3>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      {lang === 'es' ? 'Modo de Reporte' : 'Report Mode'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.5rem' }}>
                      {['visual', 'short', 'write'].map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setReportView(m as 'visual' | 'short' | 'write')
                            if (m !== 'visual') {
                              setMode(m as 'short' | 'write')
                            }
                          }}
                          style={{
                            padding: 'clamp(0.5rem, 1.5vw, 0.625rem) 1rem',
                            minHeight: '44px',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: reportView === m ? 'var(--mr-gradient)' : 'var(--mr-bg-elevated)',
                            color: reportView === m ? 'var(--mr-text-inverse)' : 'var(--mr-text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)'
                          }}
                        >
                          {m === 'visual' ? (lang === 'es' ? '⚡ Rápido' : '⚡ Quick') :
                           m === 'short' ? (lang === 'es' ? '📝 Resumen' : '📝 Summary') :
                           (lang === 'es' ? '📄 Completo' : '📄 Complete')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={strict}
                        onChange={(e) => setStrict(e.target.checked)}
                        style={{ width: '1rem', height: '1rem', borderRadius: '0.25rem' }}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        {lang === 'es' ? 'Modo Strict' : 'Strict Mode'}
                      </span>
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-secondary)', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                      {lang === 'es'
                        ? 'Estándares comerciales más exigentes'
                        : 'More demanding commercial standards'}
                    </p>
                  </div>
                </div>
              )}

              {/* Analyze Button / Progress Display */}
              {file && !isFileTooLarge && (
                <>
                {compressing ? (
                  <div style={{
                    background: 'var(--mr-bg-elevated)',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--mr-border)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '1.5rem', width: '1.5rem', color: 'var(--mr-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                          {lang === 'es' ? 'Comprimiendo...' : 'Compressing...'}
                        </span>
                      </div>
                      <div style={{ width: '100%' }}>
                        <div style={{
                          width: '100%',
                          background: 'var(--mr-bg-hover)',
                          borderRadius: '9999px',
                          height: '1rem',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: 'var(--mr-gradient)',
                            height: '1rem',
                            borderRadius: '9999px',
                            transition: 'width 0.4s ease-out',
                            width: `${compressionProgress}%`,
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                          }} />
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '0.75rem',
                          fontSize: '0.875rem',
                          opacity: 0.9
                        }}>
                          <span style={{ fontWeight: '600' }}>{compressionProgress}%</span>
                          <span>
                            {lang === 'es'
                              ? `${(file.size / 1024 / 1024).toFixed(1)}MB → ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB`
                              : `${(file.size / 1024 / 1024).toFixed(1)}MB → ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : loading ? (
                  <div style={{
                    background: 'var(--mr-bg-elevated)',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--mr-border)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
                      {/* Spinner + rotating methodology message */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '1.25rem', width: '1.25rem', color: 'var(--mr-primary)', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p
                          key={loadingMsgIndex}
                          style={{
                            textAlign: 'center',
                            fontSize: '1.05rem',
                            fontWeight: '500',
                            color: 'var(--mr-text-primary)',
                            animation: 'fadeInMsg 0.5s ease-in-out',
                            margin: 0
                          }}
                        >
                          {loadingMessages[loadingMsgIndex][lang]}
                        </p>
                      </div>

                      {/* Progress bar — pure CSS animation (no React state) */}
                      <div style={{ width: '100%' }}>
                        <div style={{
                          width: '100%',
                          background: 'var(--mr-bg-hover)',
                          borderRadius: '9999px',
                          height: '1rem',
                          overflow: 'hidden'
                        }}>
                          <div key={progressKey} style={{
                            background: 'var(--mr-gradient)',
                            height: '1rem',
                            borderRadius: '9999px',
                            animation: `progressFill ${progressAnimDuration}s ease-out forwards`,
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                          }} />
                        </div>
                        <div style={{
                          textAlign: 'center',
                          marginTop: '0.5rem',
                          fontSize: '0.8rem',
                          color: 'var(--mr-text-tertiary)',
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}>
                          <span id="mr-progress-percent" style={{ fontWeight: '500', color: 'var(--mr-primary)' }}>1%</span>
                          <span>
                          {(() => {
                            let estSec: number
                            if (fileDuration !== null && fileDuration > 120) {
                              const chunks = Math.ceil(fileDuration / 60)
                              estSec = Math.round((chunks * 8 + 10) / 10) * 10
                            } else if (fileDuration !== null) {
                              estSec = 25
                            } else {
                              estSec = file && file.size > 50 * 1024 * 1024 ? 90 : 30
                            }
                            return lang === 'es'
                              ? `· Estimado: ~${estSec} segundos`
                              : `· Estimated: ~${estSec} seconds`
                          })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                <button
                  onClick={handleAnalyze}
                  style={{
                    width: '100%',
                    background: 'var(--mr-gradient)',
                    color: 'white',
                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                    borderRadius: '0.75rem',
                    fontWeight: '600',
                    fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)',
                    minHeight: '48px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                    opacity: 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {needsCompression ? (
                      <>
                        <Play size={18} style={{ marginRight: '0.5rem' }} />
                        {lang === 'es' ? 'Comprimir y Analizar' : 'Compress & Analyze'}
                      </>
                    ) : (
                      <>
                        <Play size={18} style={{ marginRight: '0.5rem' }} />
                        {lang === 'es' ? 'Analizar Mezcla' : 'Analyze Mix'}
                      </>
                    )}
                  </div>
                </button>
                )}
              </>
              )}

              {/* Message when file is too large (>200MB) */}
              {file && isFileTooLarge && (
                <div style={{
                  width: '100%',
                  background: 'var(--mr-red-bg)',
                  border: '2px solid var(--mr-red)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: 'var(--mr-red-text)',
                    marginBottom: '0.5rem'
                  }}>
                    🚫 {lang === 'es' ? 'Archivo demasiado grande' : 'File too large'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--mr-red-text)' }}>
                    {lang === 'es'
                      ? `El límite máximo es 200MB. Tu archivo tiene ${(file.size / 1024 / 1024).toFixed(1)}MB.`
                      : `Maximum limit is 200MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--mr-red-text)', marginTop: '0.5rem' }}>
                    {lang === 'es'
                      ? 'Contáctanos en support@masteringready.com para archivos más grandes.'
                      : 'Contact us at support@masteringready.com for larger files.'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background: 'var(--mr-red-bg)',
                  border: '1px solid var(--mr-red)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginTop: '1rem',
                  animation: 'errorSlideIn 0.35s ease-out'
                }}>
                  <p style={{ color: 'var(--mr-red-text)', fontWeight: '500' }}>Error:</p>
                  <p style={{ color: 'var(--mr-red-text)' }}>{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Results - Same structure but inline styles */
            <div id="analysis-results" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: 'var(--mr-bg-card)',
                borderRadius: '1rem',
                boxShadow: 'var(--mr-shadow-lg)',
                padding: '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: typeof window !== 'undefined' && window.innerWidth < 768 ? '1rem' : '1.5rem'
                }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {lang === 'es' ? 'Resultados del Análisis' : 'Analysis Results'}
                  </h2>
                  <button
                    onClick={handleReset}
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--mr-purple-text)',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontWeight: '500'
                    }}
                  >
                    {lang === 'es' ? 'Analizar otro archivo' : 'Analyze another file'}
                  </button>
                </div>

                {/* Score Card */}
                <div style={{
                  borderRadius: '0.75rem',
                  border: `1px solid ${result.score >= 85 ? 'var(--mr-green)' : result.score >= 60 ? 'var(--mr-amber)' : 'var(--mr-red)'}`,
                  background: getScoreBg(result.score),
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '1rem',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ color: 'var(--mr-text-primary)', fontWeight: '500', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                        {lang === 'es' ? 'Puntuación MR' : 'MR Score'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 'clamp(2rem, 6vw, 3rem)',
                        fontWeight: 'bold',
                        color: getScoreColor(result.score)
                      }}>
                        {displayScore}/100
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    background: 'var(--mr-bg-hover)',
                    borderRadius: '9999px',
                    height: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      background: 'var(--mr-gradient)',
                      height: '0.75rem',
                      borderRadius: '9999px',
                      width: `${displayScore}%`,
                      transition: 'width 0.08s linear'
                    }} />
                  </div>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>{result.verdict}</p>
                  <p style={{
                    fontSize: '0.7rem',
                    color: 'var(--mr-text-secondary)',
                    fontStyle: 'italic',
                    marginTop: '0.5rem',
                    filter: (!isLoggedIn && !isUnlocking) ? 'blur(3px)' : 'none',
                    transition: 'filter 0.6s ease-out',
                    userSelect: (!isLoggedIn && !isUnlocking) ? 'none' : 'auto'
                  }}>
                    {lang === 'es'
                      ? 'Este índice evalúa margen técnico para procesamiento, no calidad artística.'
                      : 'This index evaluates technical margin for processing, not artistic quality.'}
                  </p>
                </div>

                {/* File Technical Info Strip */}
                {(result as any).file && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: isMobile ? '0.375rem 0.75rem' : '1.25rem',
                    background: 'var(--mr-bg-base)',
                    borderRadius: '0.75rem',
                    padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--mr-border)',
                    fontSize: 'clamp(0.6875rem, 1.8vw, 0.8rem)',
                    color: 'var(--mr-text-secondary)'
                  }}>
                    {(result as any).file.duration != null && (
                      <span>{lang === 'es' ? 'Duración' : 'Duration'}: <strong>{Math.floor((result as any).file.duration / 60)}:{String(Math.round((result as any).file.duration % 60)).padStart(2, '0')}</strong></span>
                    )}
                    {(result as any).file.sample_rate != null && (
                      <span>Sample Rate: <strong>{((result as any).file.sample_rate / 1000).toFixed((result as any).file.sample_rate % 1000 === 0 ? 0 : 1)} kHz</strong></span>
                    )}
                    {(result as any).file.bit_depth != null && (
                      <span>Bit Depth: <strong>{(result as any).file.bit_depth}-bit</strong></span>
                    )}
                    {(result as any).file.channels != null && (
                      <span>{(result as any).file.channels === 2 ? (lang === 'es' ? 'Estéreo' : 'Stereo') : (result as any).file.channels === 1 ? 'Mono' : `${(result as any).file.channels}ch`}</span>
                    )}
                    {file && (
                      <span>{lang === 'es' ? 'Tamaño' : 'Size'}: <strong>{file.size >= 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`}</strong></span>
                    )}
                    <span>{lang === 'es' ? 'Formato' : 'Format'}: <strong>{(result.filename || '').split('.').pop()?.toUpperCase() || 'N/A'}</strong></span>
                  </div>
                )}

                {/* Report View Toggle */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                  background: 'var(--mr-bg-elevated)',
                  padding: '0.25rem',
                  borderRadius: '0.5rem'
                }}>
                  {(['visual', 'short', 'write'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => {
                        // Check if user is logged in for Resumen/Completo tabs
                        if ((view === 'short' || view === 'write') && !isLoggedIn) {
                          setShowAuthModal(true)
                          return
                        }
                        // Completo requires paid access (Pro, Single purchase, or free user's 1st analysis)
                        if (view === 'write' && isLoggedIn && !effectiveHasPaidAccess) {
                          setShowUpgradeModal(true)
                          return
                        }
                        if (view === reportView) return
                        setTabTransition(true)
                        setTimeout(() => {
                          setReportView(view)
                          setTabTransition(false)
                        }, 150)
                      }}
                      style={{
                        flex: '1 1 calc(33.333% - 0.5rem)',
                        minWidth: '90px',
                        padding: '0.625rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        background: reportView === view ? 'var(--mr-bg-card)' : 'transparent',
                        color: reportView === view ? 'var(--mr-primary)' : 'var(--mr-text-secondary)',
                        fontWeight: reportView === view ? '600' : '500',
                        fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: reportView === view ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        position: 'relative'
                      }}
                    >
                      {/* Crown icon for non-logged users on Resumen, unpaid on Completo */}
                      {((view === 'short' && !isLoggedIn) || (view === 'write' && (!isLoggedIn || !effectiveHasPaidAccess))) && (
                        <Crown size={12} style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          color: '#d97706'
                        }} />
                      )}
                      {view === 'visual' ? (lang === 'es' ? '⚡ Rápido' : '⚡ Quick') :
                       view === 'short' ? (lang === 'es' ? '📝 Resumen' : '📝 Summary') :
                       (lang === 'es' ? '📄 Completo' : '📄 Complete')}
                    </button>
                  ))}
                </div>

                {/* Inline signup banner for anonymous users — visible near locked tabs */}
                {!isLoggedIn && result && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.625rem 1rem',
                    marginBottom: '1rem',
                    background: 'var(--mr-purple-bg)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--mr-purple)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                      color: 'var(--mr-purple-text)',
                      flex: '1 1 auto',
                      minWidth: '200px'
                    }}>
                      {lang === 'es'
                        ? 'Crea tu cuenta gratis para desbloquear Resumen, Completo y PDF'
                        : 'Create your free account to unlock Summary, Complete and PDF'}
                    </span>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      style={{
                        padding: '0.375rem 1rem',
                        background: 'var(--mr-gradient)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {lang === 'es' ? 'Crear cuenta' : 'Sign up'}
                    </button>
                  </div>
                )}

                {/* Tab Content Wrapper with cross-fade */}
                <div style={{
                  opacity: tabTransition ? 0 : 1,
                  transform: tabTransition ? 'translateY(4px)' : 'translateY(0)',
                  transition: 'opacity 0.15s ease, transform 0.15s ease'
                }}>

                {/* Visual Mode */}
                {reportView === 'visual' && (
                  <div style={{
                    background: 'var(--mr-bg-base)',
                    borderRadius: '0.75rem',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ fontWeight: '600', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', marginBottom: '0.5rem' }}>
                      {lang === 'es' ? '⚡ Análisis Rápido' : '⚡ Quick Analysis'}
                    </h3>
                    
                    {/* File name subtitle */}
                    <p style={{
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                      color: 'var(--mr-text-secondary)',
                      marginBottom: '1.5rem',
                      fontStyle: 'italic'
                    }}>
                      {lang === 'es' ? '🎵 Sobre' : '🎵 About'} "{result.filename || 'archivo'}"
                    </p>

                    {/* NEW v7.3.50: Metrics Bars Visual */}
                    {(result as any).metrics_bars && Object.keys((result as any).metrics_bars).length > 0 && (
                      <div style={{
                        background: 'var(--mr-bg-card)',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--mr-border)'
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
                        
                        {/* Subtexto explicativo - MasteringReady philosophy */}
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
                            const bars = (result as any).metrics_bars;
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
                              excellent: 'var(--mr-green)',
                              good: 'var(--mr-blue)',
                              warning: 'var(--mr-amber)',
                              critical: 'var(--mr-red)'
                            };
                            
                            // Filter and order the metrics we want to show
                            const orderedKeys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'lufs', 'lufs_(integrated)', 'loudness', 'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance'];
                            const displayedKeys = orderedKeys.filter(key => bars[key]);
                            
                            return displayedKeys.map((key) => {
                              const bar = bars[key];
                              const label = metricLabels[key] || { es: key, en: key };
                              const color = statusColors[bar.status] || 'var(--mr-text-secondary)';
                              
                              // Get tooltip from backend or use default
                              const tooltip = lang === 'es' 
                                ? (bar.tooltip_es || '')
                                : (bar.tooltip_en || '');
                              
                              return (
                                <div 
                                  key={key} 
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                  title={tooltip}
                                >
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
                                    background: 'var(--mr-bg-hover)',
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
                                    minWidth: 'clamp(38px, 10vw, 45px)',
                                    fontSize: 'clamp(0.6875rem, 1.5vw, 0.75rem)', 
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
                        
                        {/* Legend - MasteringReady philosophy: margin, not judgment */}
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap',
                          gap: '0.75rem', 
                          marginTop: '1rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid var(--mr-border)',
                          fontSize: '0.65rem',
                          color: 'var(--mr-text-secondary)'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Dentro del rango recomendado por Mastering Ready' : 'Within Mastering Ready recommended range'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mr-green)' }}></span>
                            {lang === 'es' ? 'Margen cómodo' : 'Comfortable margin'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Funcional, con margen suficiente para el máster' : 'Functional, with sufficient margin for mastering'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mr-blue)' }}></span>
                            {lang === 'es' ? 'Margen suficiente' : 'Sufficient margin'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Revisar si buscas máxima compatibilidad y margen' : 'Review if you want maximum compatibility and margin'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mr-amber)' }}></span>
                            {lang === 'es' ? 'Margen reducido' : 'Reduced margin'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Revisión prioritaria antes del máster final' : 'Priority review before final master'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mr-red)' }}></span>
                            {lang === 'es' ? 'Margen comprometido' : 'Compromised margin'}
                          </span>
                        </div>
                        
                        {/* Footer note */}
                        <p style={{
                          fontSize: '0.6rem',
                          color: 'var(--mr-text-tertiary)',
                          marginTop: '0.5rem',
                          textAlign: 'center',
                          filter: (!isLoggedIn && !isUnlocking) ? 'blur(3px)' : 'none',
                          transition: 'filter 0.6s ease-out',
                          userSelect: (!isLoggedIn && !isUnlocking) ? 'none' : 'auto'
                        }}>
                          {lang === 'es'
                            ? 'Basado en criterios de Mastering Ready para compatibilidad, margen y traducción.'
                            : 'Based on Mastering Ready criteria for compatibility, margin and translation.'}
                        </p>
                      </div>
                    )}
                    
                    {/* Report content with blur for non-logged users */}
                    <div
                      style={{ position: 'relative' }}
                      onClick={() => {
                        if (!isLoggedIn) setShowAuthModal(true)
                      }}
                    >
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                        lineHeight: '1.6',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        overflowX: 'auto',
                        maxWidth: '100%',
                        margin: 0,
                        filter: !isLoggedIn ? 'blur(5px)' : 'none',
                        transition: 'filter 0.6s ease-out',
                        userSelect: !isLoggedIn ? 'none' : 'auto',
                        cursor: !isLoggedIn ? 'pointer' : 'auto'
                      }}>
                        {cleanReportText((result as any).report_visual || result.report_short || result.report)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Short Mode */}
                {reportView === 'short' && (
                  <div style={{
                    background: 'var(--mr-bg-base)',
                    borderRadius: '0.75rem',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ fontWeight: '600', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', marginBottom: '0.5rem' }}>
                      {lang === 'es' ? '📝 Análisis Resumen' : '📝 Summary Analysis'}
                    </h3>

                    {/* File name subtitle */}
                    <p style={{
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                      color: 'var(--mr-text-secondary)',
                      marginBottom: '1.5rem',
                      fontStyle: 'italic'
                    }}>
                      {lang === 'es' ? '🎵 Sobre' : '🎵 About'} "{result.filename || 'archivo'}"
                    </p>
                    
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                      lineHeight: '1.6',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      overflowX: 'auto',
                      maxWidth: '100%',
                      margin: 0
                    }}>
                      {cleanReportText(result.report_short || result.report)}
                    </pre>
                  </div>
                )}

                {/* Write Mode */}
                {reportView === 'write' && (
                  <>
                    {/* NEW: Interpretative Sections FIRST */}
                    {result.interpretations && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ 
                          fontWeight: '700', 
                          fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', 
                          marginBottom: '0.5rem',
                          color: 'var(--mr-text-primary)'
                        }}>
                          {lang === 'es' ? '📊 Análisis Técnico Detallado' : '📊 Detailed Technical Analysis'}
                        </h3>

                        {/* File name subtitle */}
                        <p style={{
                          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                          color: 'var(--mr-text-secondary)',
                          marginBottom: '1.5rem',
                          fontStyle: 'italic'
                        }}>
                          {lang === 'es' ? '🎵 Sobre' : '🎵 About'} "{result.filename || 'archivo'}"
                        </p>

                        {/* Headroom & True Peak */}
                        {result.interpretations.headroom && (
                          <InterpretativeSection
                            title={lang === 'es' ? '🎚️ Headroom & True Peak' : '🎚️ Headroom & True Peak'}
                            interpretation={result.interpretations.headroom.interpretation}
                            recommendation={result.interpretations.headroom.recommendation}
                            metrics={result.interpretations.headroom.metrics}
                            lang={lang}
                          />
                        )}

                        {/* Dynamic Range */}
                        {result.interpretations.dynamic_range && (
                          <InterpretativeSection
                            title={lang === 'es' ? '📈 Rango Dinámico' : '📈 Dynamic Range'}
                            interpretation={result.interpretations.dynamic_range.interpretation}
                            recommendation={result.interpretations.dynamic_range.recommendation}
                            metrics={result.interpretations.dynamic_range.metrics}
                            lang={lang}
                          />
                        )}

                        {/* Overall Level */}
                        {result.interpretations.overall_level && (
                          <InterpretativeSection
                            title={lang === 'es' ? '🔊 Nivel General' : '🔊 Overall Level'}
                            interpretation={result.interpretations.overall_level.interpretation}
                            recommendation={result.interpretations.overall_level.recommendation}
                            metrics={result.interpretations.overall_level.metrics}
                            lang={lang}
                          />
                        )}

                        {/* Stereo Balance */}
                        {result.interpretations.stereo_balance && (
                          <InterpretativeSection
                            title={lang === 'es' ? '🎚️ Balance Estéreo' : '🎚️ Stereo Balance'}
                            interpretation={result.interpretations.stereo_balance.interpretation}
                            recommendation={result.interpretations.stereo_balance.recommendation}
                            metrics={result.interpretations.stereo_balance.metrics}
                            lang={lang}
                          />
                        )}
                      </div>
                    )}

                    {/* Original Report Text SECOND */}
                    <div style={{
                      background: 'var(--mr-bg-base)',
                      borderRadius: '0.75rem',
                      padding: 'clamp(1rem, 3vw, 1.5rem)',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{ fontWeight: '600', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', marginBottom: '1rem' }}>
                        {lang === 'es' ? '📄 Análisis Completo' : '📄 Complete Analysis'}
                      </h3>
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                        lineHeight: '1.6',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        overflowX: 'auto',
                        maxWidth: '100%',
                        margin: 0
                      }}>
                        {cleanReportText(result.report_write || result.report)}
                      </pre>
                    </div>
                  </>
                )}

                </div>{/* End tab content cross-fade wrapper */}

                {/* Download Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Download Current View */}
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        setShowAuthModal(true)
                        return
                      }
                      handleDownload()
                    }}
                    style={{
                      flex: 1,
                      minWidth: '160px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.875rem 1.25rem',
                      background: !isLoggedIn ? 'var(--mr-gradient)' : 'var(--mr-bg-card)',
                      color: !isLoggedIn ? 'var(--mr-text-inverse)' : 'var(--mr-primary)',
                      border: !isLoggedIn ? 'none' : '2px solid var(--mr-primary)',
                      borderRadius: '0.75rem',
                      fontWeight: '600',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: !isLoggedIn ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoggedIn) {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                      } else {
                        e.currentTarget.style.background = 'var(--mr-bg-elevated)'
                      }
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoggedIn) {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                      } else {
                        e.currentTarget.style.background = 'var(--mr-bg-card)'
                      }
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {!isLoggedIn ? (
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Headphones size={18} />
                          {lang === 'es' ? 'Ver mi análisis' : 'View my analysis'}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'rgba(255,255,255,0.8)' }}>
                          {lang === 'es' ? 'Gratis. Sin tarjeta.' : 'Free. No credit card.'}
                        </span>
                      </span>
                    ) : (
                      <>
                        <Download size={18} />
                        {lang === 'es'
                          ? `Descargar ${reportView === 'visual' ? 'Rápido' : reportView === 'short' ? 'Resumen' : 'Completo'}`
                          : `Download ${reportView === 'visual' ? 'Quick' : reportView === 'short' ? 'Summary' : 'Complete'}`}
                      </>
                    )}
                  </button>

                  {/* Download Full Report — hidden for anonymous (single CTA funnel), shown for logged-in users */}
                  {isLoggedIn && (
                  <button
                    onClick={() => {
                      if (!effectiveHasPaidAccess) {
                        setShowUpgradeModal(true)
                        return
                      }
                      handleDownloadFull()
                    }}
                    style={{
                      flex: 1,
                      minWidth: '160px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.875rem 1.25rem',
                      background: effectiveHasPaidAccess ? 'var(--mr-gradient)' : 'var(--mr-bg-card)',
                      color: effectiveHasPaidAccess ? 'var(--mr-text-inverse)' : 'var(--mr-text-secondary)',
                      border: effectiveHasPaidAccess ? 'none' : '2px solid var(--mr-border-strong)',
                      borderRadius: '0.75rem',
                      fontWeight: '600',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: effectiveHasPaidAccess ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      if (effectiveHasPaidAccess) {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                      } else {
                        e.currentTarget.style.background = 'var(--mr-bg-elevated)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      if (effectiveHasPaidAccess) {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                      } else {
                        e.currentTarget.style.background = 'var(--mr-bg-card)'
                      }
                    }}
                  >
                    {!effectiveHasPaidAccess ? (
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Crown size={18} style={{ color: '#d97706' }} />
                          {lang === 'es' ? 'Análisis detallado' : 'Detailed analysis'}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'var(--mr-text-tertiary)' }}>
                          {lang === 'es' ? 'Desde $5.99' : 'From $5.99'}
                        </span>
                      </span>
                    ) : (
                      <>
                        <Download size={18} />
                        {lang === 'es' ? 'Análisis Detallado' : 'Detailed Analysis'}
                      </>
                    )}
                  </button>
                  )}
                </div>
              </div>

              {/* CTA for Mastering Service — dynamic from backend based on score */}
              {result.cta_message && result.cta_button && (
                <div style={{
                  background: 'linear-gradient(to bottom right, #818cf8 0%, #6366f1 100%)',
                  borderRadius: '1.5rem',
                  padding: isMobile ? '1.5rem' : '2.5rem 2rem',
                  color: 'white',
                  boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Icon circle — dynamic based on score */}
                    <div style={{
                      width: '4rem',
                      height: '4rem',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '2rem' }}>
                        {result.score >= 85 ? '🎧' :
                         result.score >= 60 ? '🔧' :
                         result.score >= 40 ? '🔍' :
                         result.score >= 20 ? '🔍' : '💬'}
                      </span>
                    </div>

                    {/* Message */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: isMobile ? '1.125rem' : '1.375rem',
                        lineHeight: '1.3',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        marginTop: '0.25rem'
                      }}>
                        {(() => {
                          let title = result.cta_message.split('\n')[0]
                          title = title.replace(/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+/gu, '')
                          return title
                        })()}
                      </h3>
                      <p style={{
                        fontSize: isMobile ? '0.9rem' : '1.0625rem',
                        lineHeight: '1.5',
                        opacity: 0.95,
                        margin: 0
                      }}>
                        {(() => {
                          const fullText = result.cta_message.split('\n').slice(1).join(' ')
                          if (isMobile) {
                            const firstSentence = fullText.split('.')[0]
                            return firstSentence.length > 80
                              ? firstSentence.substring(0, 77) + '...'
                              : firstSentence + '.'
                          }
                          return fullText
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div style={{ paddingLeft: isMobile ? '0' : '5rem' }}>
                    <button
                      onClick={() => {
                        const action = (result as any).cta_action || 'mastering'
                        trackCtaClick(action)
                        setCtaSource(action)
                        setShowContactModal(true)
                      }}
                      style={{
                        background: 'var(--mr-bg-card)',
                        color: 'var(--mr-primary)',
                        padding: '1rem 2rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '1.125rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s',
                        width: isMobile ? '100%' : 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {result.cta_button}
                    </button>
                    {(result as any).cta_subline && (
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--mr-text-secondary)',
                        marginTop: '0.5rem',
                        textAlign: 'center'
                      }}>
                        {(result as any).cta_subline}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Analysis Rating Widget — appears with fade-in after 4s */}
              {!ratingSubmitted && (
                <div style={{
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                  opacity: showRatingWidget ? 1 : 0,
                  transform: showRatingWidget ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 0.6s ease, transform 0.6s ease',
                  pointerEvents: showRatingWidget ? 'auto' : 'none'
                }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)', marginBottom: '0.75rem' }}>
                    {lang === 'es'
                      ? '¿Te resultó útil el análisis?'
                      : 'Was the analysis useful?'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: analysisRating !== null ? '0.75rem' : '0' }}>
                    <button
                      onClick={() => setAnalysisRating(true)}
                      style={{
                        width: '3.25rem',
                        height: '3.25rem',
                        borderRadius: '50%',
                        border: analysisRating === true ? '2px solid var(--mr-green)' : '2px solid var(--mr-border)',
                        background: analysisRating === true ? 'var(--mr-green-bg)' : 'var(--mr-bg-card)',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={lang === 'es' ? 'Me fue bien' : 'Good experience'}
                      aria-label={lang === 'es' ? 'Me fue bien' : 'Good experience'}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => setAnalysisRating(false)}
                      style={{
                        width: '3.25rem',
                        height: '3.25rem',
                        borderRadius: '50%',
                        border: analysisRating === false ? '2px solid var(--mr-red)' : '2px solid var(--mr-border)',
                        background: analysisRating === false ? 'var(--mr-red-bg)' : 'var(--mr-bg-card)',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={lang === 'es' ? 'Podría mejorar' : 'Could be better'}
                      aria-label={lang === 'es' ? 'Podría mejorar' : 'Could be better'}
                    >
                      👎
                    </button>
                  </div>
                  {analysisRating !== null && (
                    <div style={{
                      opacity: 1,
                      transition: 'opacity 0.3s ease'
                    }}>
                      <input
                        type="text"
                        placeholder={lang === 'es' ? 'Comentario opcional...' : 'Optional comment...'}
                        value={analysisComment}
                        onChange={(e) => setAnalysisComment(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '320px',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--mr-border)',
                          fontSize: '0.875rem',
                          marginBottom: '0.5rem',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--mr-primary)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--mr-border)'}
                      />
                      <br />
                      <button
                        onClick={submitAnalysisRating}
                        style={{
                          background: 'var(--mr-primary)',
                          color: 'var(--mr-text-inverse)',
                          padding: '0.5rem 1.5rem',
                          borderRadius: '9999px',
                          border: 'none',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--mr-primary-dark)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--mr-primary)'}
                      >
                        {lang === 'es' ? 'Enviar' : 'Submit'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Thank you message after rating */}
              {ratingSubmitted && (
                <div style={{
                  background: 'var(--mr-green-bg)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  border: '1px solid var(--mr-green)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {analysisRating ? '👍' : '👎'}
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--mr-green-text)', marginBottom: '0.25rem' }}>
                    {lang === 'es' ? '¡Gracias por tu feedback!' : 'Thank you for your feedback!'}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--mr-green-text)' }}>
                    {lang === 'es'
                      ? 'Tu opinión nos ayuda a mejorar Mastering Ready.'
                      : 'Your input helps us improve Mastering Ready.'}
                  </p>
                </div>
              )}

              {/* Mini-Glossary (per spec Section 12) */}
              <div style={{
                background: 'var(--mr-bg-base)',
                borderRadius: '0.75rem',
                border: '1px solid var(--mr-border)',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => setGlossaryOpen(!glossaryOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--mr-text-primary)' }}>
                    {lang === 'es' ? '📘 ¿Qué significan estos términos?' : '📘 What do these terms mean?'}
                  </span>
                  <span style={{
                    transform: glossaryOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                    fontSize: '1.25rem',
                    color: 'var(--mr-text-secondary)'
                  }}>
                    ▾
                  </span>
                </button>

                <div style={{
                  maxHeight: glossaryOpen ? 'min(600px, 70vh)' : '0',
                  opacity: glossaryOpen ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
                }}>
                  <div style={{ padding: '0 1.25rem 1.25rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)', marginBottom: '1rem' }}>
                      {lang === 'es'
                        ? 'Algunos conceptos técnicos usados en este análisis están explicados brevemente aquí.'
                        : 'Some technical concepts used in this analysis are briefly explained here.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Headroom */}
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--mr-text-primary)', fontSize: '0.9rem' }}>Headroom</span>
                        <p style={{ fontSize: '0.825rem', color: 'var(--mr-text-secondary)', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Espacio dinámico disponible antes del clipping. Permite al ingeniero de mastering trabajar sin distorsión.'
                            : 'Dynamic space available before clipping. Allows the mastering engineer to work without distortion.'}
                        </p>
                      </div>

                      {/* True Peak */}
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--mr-text-primary)', fontSize: '0.9rem' }}>True Peak</span>
                        <p style={{ fontSize: '0.825rem', color: 'var(--mr-text-secondary)', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Nivel real máximo considerando la reconstrucción digital. Importante para evitar distorsión en conversión.'
                            : 'Actual maximum level considering digital reconstruction. Important to avoid distortion during conversion.'}
                        </p>
                      </div>

                      {/* LUFS */}
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--mr-text-primary)', fontSize: '0.9rem' }}>LUFS (Integrated)</span>
                        <p style={{ fontSize: '0.825rem', color: 'var(--mr-text-secondary)', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Medida del volumen percibido. Es informativo: el volumen final se ajusta en mastering.'
                            : 'Measure of perceived loudness. Informative only: final loudness is adjusted in mastering.'}
                        </p>
                      </div>

                      {/* PLR */}
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--mr-text-primary)', fontSize: '0.9rem' }}>PLR (Peak-to-Loudness Ratio)</span>
                        <p style={{ fontSize: '0.825rem', color: 'var(--mr-text-secondary)', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Relación entre el pico y el nivel promedio. Indica cuánta dinámica tiene tu mezcla.'
                            : 'Ratio between peak and average level. Indicates how much dynamics your mix has.'}
                        </p>
                      </div>

                      {/* Stereo Image */}
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--mr-text-primary)', fontSize: '0.9rem' }}>
                          {lang === 'es' ? 'Imagen Estéreo' : 'Stereo Image'}
                        </span>
                        <p style={{ fontSize: '0.825rem', color: 'var(--mr-text-secondary)', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Distribución espacial del contenido entre izquierda y derecha. Afecta la amplitud y compatibilidad mono.'
                            : 'Spatial distribution of content between left and right. Affects width and mono compatibility.'}
                        </p>
                      </div>

                      {/* Frequency Balance */}
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--mr-text-primary)', fontSize: '0.9rem' }}>
                          {lang === 'es' ? 'Balance de Frecuencias' : 'Frequency Balance'}
                        </span>
                        <p style={{ fontSize: '0.825rem', color: 'var(--mr-text-secondary)', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Distribución tonal entre graves, medios y agudos. Un balance saludable facilita el mastering.'
                            : 'Tonal distribution between lows, mids, and highs. A healthy balance makes mastering easier.'}
                        </p>
                      </div>
                    </div>

                    {/* eBook link */}
                    <div style={{
                      marginTop: '1.25rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--mr-border)'
                    }}>
                      <p style={{ fontSize: '0.825rem', color: 'var(--mr-text-secondary)', marginBottom: '0.75rem' }}>
                        {lang === 'es'
                          ? 'Para un glosario completo y la metodología completa de Mastering Ready, puedes profundizar en el eBook.'
                          : 'For a complete glossary and the full Mastering Ready methodology, you can dive deeper in the eBook.'}
                      </p>
                      <a
                        href="https://masteringready.com/ebook"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: 'var(--mr-primary)',
                          textDecoration: 'none',
                          padding: '0.5rem 1rem',
                          border: '1px solid var(--mr-primary)',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--mr-primary)'
                          e.currentTarget.style.color = 'var(--mr-text-inverse)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--mr-primary)'
                        }}
                      >
                        {lang === 'es' ? 'Ver metodología completa en el eBook' : 'See full methodology in the eBook'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* eBook Section */}
      <section className="ebook-section" style={{
        background: 'var(--mr-bg-base)',
        padding: '4rem 1.5rem',
        borderTop: '1px solid var(--mr-border)'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: '2rem',
            alignItems: 'center'
          }}>
            {/* Content */}
            <div style={{ textAlign: 'center' }}>
              {/* Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--mr-gradient)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span>📖</span>
                <span>{lang === 'es' ? 'Profundiza en la metodología' : 'Go deeper into the methodology'}</span>
              </div>

              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
                fontWeight: '800',
                color: 'var(--mr-text-primary)',
                marginBottom: '1.5rem',
                lineHeight: '1.2'
              }}>
                {lang === 'es' 
                  ? '¿Quieres preparar tus mezclas con criterio profesional?' 
                  : 'Want to prepare your mixes with professional judgment?'}
              </h2>

              <div style={{
                fontSize: '1.125rem',
                color: 'var(--mr-text-secondary)',
                marginBottom: '2rem',
                lineHeight: '1.8',
                maxWidth: '650px',
                margin: '0 auto 2rem',
                textAlign: 'center'
              }}>
                {lang === 'es' ? (
                  <>
                    <p style={{ marginBottom: '1rem' }}>
                      El eBook Mastering Ready te ayuda a entender qué decisiones realmente importan cuando preparas una mezcla para mastering.
                    </p>
                    <p style={{ marginBottom: '1rem' }}>
                      No se trata de presets ni de fórmulas rápidas. Se trata de escuchar mejor, tomar decisiones conscientes y evitar errores comunes que afectan el resultado final.
                    </p>
                    <p>
                      Es el mismo criterio aplicado en más de 300 producciones reales.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ marginBottom: '1rem' }}>
                      The Mastering Ready eBook helps you understand which decisions actually matter when preparing a mix for mastering.
                    </p>
                    <p style={{ marginBottom: '1rem' }}>
                      It's not about presets or quick formulas. It's about listening better, making conscious decisions, and avoiding common mistakes that affect the final result.
                    </p>
                    <p>
                      This is the same professional judgment applied across more than 300 real-world productions.
                    </p>
                  </>
                )}
              </div>

              {/* Features list */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                {[
                  lang === 'es' ? 'Headroom y control dinámico' : 'Headroom and dynamic control',
                  lang === 'es' ? 'Balance de frecuencias' : 'Frequency balance',
                  lang === 'es' ? 'Errores comunes antes del mastering' : 'Common pre-mastering mistakes',
                  lang === 'es' ? 'Checklist profesional de entrega' : 'Professional delivery checklist'
                ].map((feature, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'var(--mr-bg-card)',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    color: 'var(--mr-text-secondary)',
                    border: '1px solid var(--mr-border)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <Check size={14} style={{ color: 'var(--mr-green)' }} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Closing line - human touch */}
              <p style={{
                fontSize: '1rem',
                color: 'var(--mr-text-secondary)',
                fontStyle: 'italic',
                marginBottom: '1.5rem',
                maxWidth: '500px',
                margin: '0 auto 1.5rem'
              }}>
                {lang === 'es'
                  ? 'Si mezclas música y quieres que el mastering funcione como debería, este libro es para ti.'
                  : 'If you mix music and want mastering to work the way it should, this book is for you.'}
              </p>

              {/* CTA Button */}
              <a
                href="https://payhip.com/b/TXrCn"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--mr-gradient)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '0.75rem',
                  fontWeight: '700',
                  fontSize: '1.125rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.35)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.45)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.35)'
                }}
              >
                <span>{lang === 'es' ? 'Ver eBook' : 'View eBook'}</span>
                <span style={{ opacity: 0.7 }}>·</span>
                <span>15 USD</span>
              </a>

              {/* Discount info - separated */}
              <div style={{
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--mr-green-text)',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  <span style={{
                    background: 'var(--mr-green-bg)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem'
                  }}>
                    -37%
                  </span>
                  <span>{lang === 'es' ? 'Precio especial por tiempo limitado' : 'Limited-time special price'}</span>
                </div>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--mr-text-secondary)',
                  margin: 0
                }}>
                  {lang === 'es'
                    ? '15 USD con código READY15'
                    : '15 USD with code READY15'}
                </p>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--mr-text-tertiary)',
                  margin: '0.5rem 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem'
                }}>
                  <span>📘</span>
                  {lang === 'es' 
                    ? 'Disponible en español. Al comprar tendrás acceso a la versión en inglés cuando esté disponible.'
                    : 'Currently in Spanish. Purchase now and get access to the English version when released.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section" style={{
        background: 'linear-gradient(to bottom, #1e1b4b 0%, #312e81 100%)',
        color: 'white',
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="footer-grid" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            textAlign: 'left'
          }}>
            {/* Brand */}
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Music size={24} style={{ color: '#ffffff', flexShrink: 0 }} /> Mastering Ready
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                {lang === 'es'
                  ? 'Analiza tu mezcla antes de masterizar.'
                  : 'Analyze your mix before mastering.'}
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="footer-heading" style={{ 
                fontWeight: '600', 
                color: '#ffffff' 
              }}>
                {lang === 'es' ? 'Contacto' : 'Contact'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a 
                  href="mailto:mat@matcarvy.com"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📧</span>
                  <span>mat@matcarvy.com</span>
                </a>
                <a 
                  href="https://wa.me/573155576115"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📱</span>
                  <span>WhatsApp</span>
                </a>
                <a 
                  href="https://instagram.com/matcarvy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📷</span>
                  <span>@matcarvy</span>
                </a>
              </div>
            </div>

            {/* Resources */}
            <div>
              <h4 className="footer-heading" style={{ 
                fontWeight: '600', 
                color: '#ffffff' 
              }}>
                {lang === 'es' ? 'Acerca de' : 'About'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                  {lang === 'es'
                    ? 'Análisis profesional de mezclas basado en la metodología Mastering Ready.'
                    : 'Professional mix analysis based on the Mastering Ready methodology.'}
                </p>
                <a 
                  href="https://payhip.com/b/TXrCn"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📖</span>
                  <span>{lang === 'es' ? 'Profundiza en el eBook' : 'Learn more in the eBook'}</span>
                </a>
                <a
                  href="https://www.masteringready.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  masteringready.com
                </a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="footer-heading" style={{
                fontWeight: '600',
                color: '#ffffff'
              }}>
                {lang === 'es' ? 'Legal' : 'Legal'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  href="/terms"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📄</span>
                  <span>{lang === 'es' ? 'Términos de Servicio' : 'Terms of Service'}</span>
                </Link>
                <Link
                  href="/privacy"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>🛡️</span>
                  <span>{lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="footer-copyright" style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
            textAlign: 'center' 
          }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem' }}>
              {lang === 'es'
                ? '© 2026 Mastering Ready. Todos los derechos reservados.'
                : '© 2026 Mastering Ready. All rights reserved.'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              {lang === 'es'
                ? 'Basado en la metodología "Mastering Ready"'
                : 'Based on the "Mastering Ready" methodology'}
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div
          onClick={() => setShowContactModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'clamp(0.75rem, 3vw, 1.5rem)',
            animation: 'modalBackdropIn 0.25s ease-out',
            overscrollBehavior: 'contain'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--mr-bg-card)',
              borderRadius: '1rem',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              maxWidth: '500px',
              width: 'calc(100% - 1rem)',
              boxShadow: 'var(--mr-shadow-lg)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowContactModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
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

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎧</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? 'Hablemos de tu track' : 'Let\u2019s talk about your track'}
              </h3>
              <p style={{ color: 'var(--mr-text-secondary)' }}>
                {lang === 'es'
                  ? 'Elige cómo contactarme:'
                  : 'Choose how to reach me:'}
              </p>
            </div>

            {/* Contact options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* WhatsApp */}
              <a
                href={`https://wa.me/573155576115?text=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola Matías, acabo de analizar "${result?.filename || 'mi mezcla'}" en Mastering Ready (${result?.score || 'N/A'}/100). ${ctaSource === 'mastering' ? 'Me interesa el mastering de este track.' : ctaSource === 'preparation' ? 'Me gustaría preparar mi mezcla antes del mastering.' : 'Me gustaría revisar mi mezcla con ayuda profesional.'}`
                    : `Hi Matías, I just analyzed "${result?.filename || 'my mix'}" on Mastering Ready (${result?.score || 'N/A'}/100). ${ctaSource === 'mastering' ? 'I\'m interested in mastering this track.' : ctaSource === 'preparation' ? 'I\'d like to prepare my mix before mastering.' : 'I\'d like to review my mix with professional help.'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logContactRequest('whatsapp')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: 'var(--mr-green-bg)',
                  border: '1px solid var(--mr-green)',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: 'var(--mr-green-text)',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--mr-green-bg)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--mr-green-bg)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
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
                    ? `${ctaSource === 'mastering' ? 'Mastering' : ctaSource === 'preparation' ? 'Preparación de mezcla' : 'Revisión de mezcla'}: ${result?.filename || 'Mi track'}`
                    : `${ctaSource === 'mastering' ? 'Mastering' : ctaSource === 'preparation' ? 'Mix preparation' : 'Mix review'}: ${result?.filename || 'My track'}`
                )}&body=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola Matías,\n\nAnalicé "${result?.filename || 'mi mezcla'}" en Mastering Ready.\nPuntuación: ${result?.score || 'N/A'}/100\n\n${ctaSource === 'mastering' ? 'Me interesa el mastering de este track.' : ctaSource === 'preparation' ? 'Me gustaría preparar mi mezcla antes del mastering.' : 'Me gustaría revisar mi mezcla con ayuda profesional.'}\n\nGracias.`
                    : `Hi Matías,\n\nI analyzed "${result?.filename || 'my mix'}" on Mastering Ready.\nScore: ${result?.score || 'N/A'}/100\n\n${ctaSource === 'mastering' ? 'I\'m interested in mastering this track.' : ctaSource === 'preparation' ? 'I\'d like to prepare my mix before mastering.' : 'I\'d like to review my mix with professional help.'}\n\nThanks.`
                )}`}
                onClick={() => logContactRequest('email')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: 'var(--mr-blue-bg)',
                  border: '1px solid var(--mr-blue)',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: 'var(--mr-blue-text)',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--mr-blue-bg)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--mr-blue-bg)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
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
                onClick={() => logContactRequest('instagram')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: 'var(--mr-red-bg)',
                  border: '1px solid var(--mr-red)',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: 'var(--mr-red-text)',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--mr-red-bg)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--mr-red-bg)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div
          onClick={() => {
            setShowFeedbackModal(false)
            setFeedback({ rating: 0, liked: '', change: '', add: '' })
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'clamp(0.75rem, 3vw, 1.5rem)',
            animation: 'modalBackdropIn 0.25s ease-out',
            overscrollBehavior: 'contain'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--mr-bg-card)',
              borderRadius: '1rem',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              maxWidth: '500px',
              width: 'calc(100% - 1rem)',
              boxShadow: 'var(--mr-shadow-lg)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowFeedbackModal(false)
                setFeedback({ rating: 0, liked: '', change: '', add: '' })
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--mr-text-secondary)',
                width: '2.75rem',
                height: '2.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                transition: 'all 0.2s'
              }}
              aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--mr-bg-elevated)'
                e.currentTarget.style.color = 'var(--mr-text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = 'var(--mr-text-secondary)'
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💬</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? '¿Cómo te fue?' : 'How was it?'}
              </h3>
              <p style={{ color: 'var(--mr-text-secondary)', fontSize: '0.875rem' }}>
                {lang === 'es'
                  ? 'Tu feedback nos ayuda a mejorar Mastering Ready'
                  : 'Your feedback helps us improve Mastering Ready'}
              </p>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Rating 1-10 */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', display: 'block', textAlign: 'center' }}>
                  {lang === 'es' ? '¿Qué tan útil fue el análisis?' : 'How useful was the analysis?'}
                </label>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 'clamp(0.25rem, 1vw, 0.5rem)', 
                  justifyContent: 'center',
                  marginBottom: '0.5rem',
                  maxWidth: '100%'
                }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setFeedback({...feedback, rating: num})}
                      style={{
                        width: '100%',
                        minWidth: '1.75rem',
                        height: 'clamp(2.75rem, 10vw, 3rem)',
                        borderRadius: '0.5rem',
                        border: feedback.rating === num ? '2px solid var(--mr-primary)' : '1px solid var(--mr-border-strong)',
                        background: feedback.rating === num ? 'var(--mr-gradient)' : 'var(--mr-bg-card)',
                        color: feedback.rating === num ? 'var(--mr-text-inverse)' : 'var(--mr-text-primary)',
                        fontWeight: '600',
                        fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (feedback.rating !== num) {
                          e.currentTarget.style.borderColor = 'var(--mr-primary)'
                          e.currentTarget.style.transform = 'scale(1.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (feedback.rating !== num) {
                          e.currentTarget.style.borderColor = 'var(--mr-border-strong)'
                          e.currentTarget.style.transform = 'scale(1)'
                        }
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--mr-text-secondary)',
                  paddingLeft: '0.5rem',
                  paddingRight: '0.5rem'
                }}>
                  <span>😞 {lang === 'es' ? 'No útil' : 'Not useful'}</span>
                  <span>{lang === 'es' ? 'Muy útil' : 'Very useful'} 😍</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  {lang === 'es' ? '¿Qué te gustó?' : 'What did you like?'}
                  <span style={{ color: 'var(--mr-red)' }}> *</span>
                </label>
                <textarea
                  value={feedback.liked}
                  onChange={(e) => setFeedback({...feedback, liked: e.target.value})}
                  placeholder={lang === 'es' ? 'Ej: La velocidad del análisis...' : 'E.g: The analysis speed...'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--mr-border-strong)',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  {lang === 'es' ? '¿Qué cambiarías?' : 'What would you change?'}
                  <span style={{ color: 'var(--mr-text-tertiary)', fontSize: '0.75rem' }}> ({lang === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <textarea
                  value={feedback.change}
                  onChange={(e) => setFeedback({...feedback, change: e.target.value})}
                  placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--mr-border-strong)',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  {lang === 'es' ? '¿Qué agregarías?' : 'What would you add?'}
                  <span style={{ color: 'var(--mr-text-tertiary)', fontSize: '0.75rem' }}> ({lang === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <textarea
                  value={feedback.add}
                  onChange={(e) => setFeedback({...feedback, add: e.target.value})}
                  placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--mr-border-strong)',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                onClick={() => {
                  const feedbackText = `FEEDBACK - Mastering Ready\n\n⭐ Utilidad: ${feedback.rating}/10\n\n✅ Qué gustó:\n${feedback.liked}\n\n🔄 Qué cambiaría:\n${feedback.change || 'N/A'}\n\n➕ Qué agregaría:\n${feedback.add || 'N/A'}\n\nScore obtenido: ${result?.score || 'N/A'}/100`
                  window.open(`https://wa.me/573155576115?text=${encodeURIComponent(feedbackText)}`, '_blank')
                  setFeedbackSubmitted(true)
                  setShowFeedbackModal(false)
                }}
                disabled={!feedback.liked || feedback.rating === 0}
                style={{
                  background: (feedback.liked && feedback.rating > 0) ? 'var(--mr-gradient)' : 'var(--mr-border-strong)',
                  color: 'white',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (feedback.liked && feedback.rating > 0) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  fontSize: '1rem',
                  marginTop: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (feedback.liked && feedback.rating > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {lang === 'es' ? 'Enviar Feedback' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal - Inline login/signup with unlock animation */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          // Don't trigger unlock animation here — wait for AuthProvider to signal
          // either pendingAnalysisSaved (→ unlock) or pendingAnalysisQuotaExceeded (→ paywall)
        }}
        lang={lang}
      />

      {/* Unlock Animation Overlay - Ripple effect when auth succeeds */}
      {isUnlocking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 99,
          overflow: 'hidden'
        }}>
          {/* Multiple ripples - purple theme matching the page */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.5) 0%, rgba(118, 75, 162, 0.2) 50%, transparent 70%)',
            borderRadius: '50%',
            animation: 'unlockRipple 1.4s ease-out forwards'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(118, 75, 162, 0.4) 0%, rgba(102, 126, 234, 0.15) 50%, transparent 70%)',
            borderRadius: '50%',
            animation: 'unlockRipple 1.4s ease-out 0.2s forwards'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.1) 50%, transparent 70%)',
            borderRadius: '50%',
            animation: 'unlockRipple 1.4s ease-out 0.4s forwards'
          }} />
          {/* Center unlock icon - purple gradient */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '64px',
            height: '64px',
            background: 'var(--mr-gradient)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.5)',
            animation: 'unlockPop 0.7s ease-out forwards'
          }}>
            <Headphones size={28} style={{ color: 'white' }} />
          </div>
        </div>
      )}

      {/* CSS for unlock animation */}
      <style jsx global>{`
        @keyframes unlockRipple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(30);
            opacity: 0;
          }
        }
        @keyframes unlockPop {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
          40% {
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 1;
          }
          70% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
        }
      `}</style>

      {/* IP Limit Reached Modal - Anonymous user already used free analysis */}
      {showIpLimitModal && (
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
          padding: 'clamp(0.75rem, 3vw, 1rem)',
          animation: 'modalBackdropIn 0.25s ease-out',
          overscrollBehavior: 'contain'
        }}>
          <div style={{
            background: 'var(--mr-bg-card)',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowIpLimitModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
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

            {/* Warning Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={24} style={{ color: 'var(--mr-red)' }} />
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.375rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '0.75rem',
              color: 'var(--mr-text-primary)'
            }}>
              {lang === 'es' ? 'Ya usaste tus análisis gratis' : 'You already used your free analyses'}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '1rem',
              color: 'var(--mr-text-secondary)',
              textAlign: 'center',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              {lang === 'es'
                ? 'Cada dispositivo tiene 1 análisis de prueba. Crea una cuenta para tus 2 análisis completos gratis.'
                : 'Each device gets 1 trial analysis. Create an account for your 2 free full analyses.'}
            </p>

            {/* Benefits reminder */}
            <div style={{
              background: 'var(--mr-bg-elevated)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--mr-text-primary)',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                {lang === 'es' ? 'Con una cuenta gratis obtienes:' : 'With a free account you get:'}
              </p>
              <ul style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.875rem',
                color: 'var(--mr-text-secondary)',
                lineHeight: '1.6'
              }}>
                <li>{lang === 'es' ? '2 análisis completos gratis' : '2 free full analyses'}</li>
                <li>{lang === 'es' ? 'Informe Completo + PDF' : 'Full Report + PDF'}</li>
                <li>{lang === 'es' ? 'Historial de análisis' : 'Analysis history'}</li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={`/auth/signup?lang=${lang}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.875rem',
                  background: 'var(--mr-gradient)',
                  color: 'white',
                  textAlign: 'center',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                {lang === 'es' ? 'Crear cuenta gratis' : 'Create free account'}
              </a>

              <a
                href={`/auth/login?lang=${lang}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.875rem',
                  background: 'transparent',
                  color: 'var(--mr-primary)',
                  textAlign: 'center',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: '2px solid var(--mr-primary)',
                  boxSizing: 'border-box'
                }}
              >
                {lang === 'es' ? 'Ya tengo cuenta' : 'I have an account'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Free Limit Reached Modal - Logged-in user used all free analyses */}
      {showFreeLimitModal && (
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
          padding: 'clamp(0.75rem, 3vw, 1rem)',
          animation: 'modalBackdropIn 0.25s ease-out',
          overscrollBehavior: 'contain'
        }}>
          <div style={{
            background: 'var(--mr-bg-card)',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowFreeLimitModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
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

            {/* Crown Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Crown size={24} style={{ color: '#d97706' }} />
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.375rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '0.75rem',
              color: 'var(--mr-text-primary)'
            }}>
              {lang === 'es' ? 'Has usado tus 2 análisis completos gratis' : "You've used your 2 free full analyses"}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '1rem',
              color: 'var(--mr-text-secondary)',
              textAlign: 'center',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              {lang === 'es'
                ? '¿Trabajando en más canciones? Elige cómo continuar:'
                : 'Working on more songs? Choose how to continue:'}
            </p>

            {/* Pro Plan Highlight */}
            <div style={{
              background: 'var(--mr-purple-bg)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid var(--mr-purple)'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--mr-purple-text)',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Mastering Ready Pro · {prices.pro_monthly}/{lang === 'es' ? 'mes' : 'mo'}
              </p>
              <ul style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.875rem',
                color: 'var(--mr-purple-text)',
                lineHeight: '1.6'
              }}>
                <li>{lang === 'es' ? '30 análisis al mes' : '30 analyses per month'}</li>
                <li>{lang === 'es' ? 'Reportes PDF completos' : 'Full PDF reports'}</li>
                <li>{lang === 'es' ? 'Historial de análisis' : 'Analysis history'}</li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={`/dashboard?upgrade=pro&lang=${lang}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.875rem',
                  background: 'var(--mr-gradient)',
                  color: 'white',
                  textAlign: 'center',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                {lang === 'es' ? 'Actualizar a Pro' : 'Upgrade to Pro'}
              </a>

              <a
                href={`/dashboard?upgrade=single&lang=${lang}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.875rem',
                  background: 'transparent',
                  color: 'var(--mr-primary)',
                  textAlign: 'center',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: '2px solid var(--mr-primary)',
                  boxSizing: 'border-box'
                }}
              >
                {lang === 'es' ? 'Comprar 1 análisis' : 'Buy 1 analysis'} ({prices.single})
              </a>
            </div>
          </div>
        </div>
      )}

      {/* VPN Detected Modal */}
      {showVpnModal && (
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
          padding: 'clamp(0.75rem, 3vw, 1rem)',
          animation: 'modalBackdropIn 0.25s ease-out',
          overscrollBehavior: 'contain'
        }}>
          <div style={{
            background: 'var(--mr-bg-card)',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowVpnModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
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

            {/* Globe Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Globe size={24} style={{ color: '#d97706' }} />
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.375rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '0.75rem',
              color: 'var(--mr-text-primary)'
            }}>
              {lang === 'es' ? 'VPN o Proxy detectado' : 'VPN or Proxy detected'}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '1rem',
              color: 'var(--mr-text-secondary)',
              textAlign: 'center',
              marginBottom: '1rem',
              lineHeight: '1.5'
            }}>
              {lang === 'es'
                ? 'Para usar el análisis gratuito, desactiva tu VPN o proxy y recarga la página.'
                : 'To use the free analysis, please disable your VPN or proxy and reload the page.'}
            </p>

            {vpnServiceName && (
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--mr-text-tertiary)',
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}>
                {lang === 'es' ? 'Servicio detectado: ' : 'Detected service: '}{vpnServiceName}
              </p>
            )}

            {/* Alternative */}
            <div style={{
              background: 'var(--mr-bg-elevated)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--mr-text-primary)',
                marginBottom: '0'
              }}>
                {lang === 'es'
                  ? 'Alternativamente, crea una cuenta para analizar sin restricciones.'
                  : 'Alternatively, create an account to analyze without restrictions.'}
              </p>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowVpnModal(false)
                  window.location.reload()
                }}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: 'var(--mr-bg-elevated)',
                  color: 'var(--mr-text-primary)',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: '1px solid var(--mr-border)',
                  cursor: 'pointer'
                }}
              >
                {lang === 'es' ? 'Recargar página' : 'Reload page'}
              </button>

              <a
                href={`/auth/signup?lang=${lang}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.875rem',
                  background: 'var(--mr-gradient)',
                  color: 'white',
                  textAlign: 'center',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                {lang === 'es' ? 'Crear cuenta gratis' : 'Create free account'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade to Pro Modal */}
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
          padding: 'clamp(0.75rem, 3vw, 1rem)',
          animation: 'modalBackdropIn 0.25s ease-out',
          overscrollBehavior: 'contain'
        }}>
          <div style={{
            background: 'var(--mr-bg-card)',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
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

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
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

            <h3 style={{
              fontSize: '1.375rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '0.5rem',
              color: 'var(--mr-text-primary)'
            }}>
              {lang === 'es' ? 'Desbloquea el Análisis Completo' : 'Unlock Complete Analysis'}
            </h3>

            <p style={{
              textAlign: 'center',
              color: 'var(--mr-text-secondary)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {lang === 'es'
                ? 'Accede al análisis completo, descarga de PDFs y más con Mastering Ready Pro'
                : 'Access complete analysis, PDF downloads and more with Mastering Ready Pro'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                lang === 'es' ? '30 análisis al mes' : '30 analyses per month',
                lang === 'es' ? 'Análisis Completo y Detallado' : 'Complete & Detailed Analysis',
                lang === 'es' ? 'Descarga de PDFs profesionales' : 'Professional PDF downloads',
                lang === 'es' ? 'Historial de análisis' : 'Analysis history'
              ].map((benefit, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--mr-green-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <TrendingUp size={12} style={{ color: 'var(--mr-green)' }} />
                  </div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--mr-text-primary)' }}>{benefit}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--mr-text-primary)' }}>
                {prices.pro_monthly}/{lang === 'es' ? 'mes' : 'month'}
              </span>
            </div>

            <a
              href={`/subscription?lang=${lang}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '1rem',
                background: 'var(--mr-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              <Crown size={18} />
              {lang === 'es' ? 'Obtener Pro' : 'Get Pro'}
            </a>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeInMsg {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalContentIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes errorSlideIn {
          0% { opacity: 0; transform: translateY(-10px); }
          60% { opacity: 1; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes progressFill {
          0% { width: 1%; }
          5% { width: 15%; }
          15% { width: 35%; }
          30% { width: 55%; }
          50% { width: 70%; }
          70% { width: 82%; }
          85% { width: 89%; }
          100% { width: 93%; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* ============================================
           DESKTOP STYLES (default)
           ============================================ */
        
        /* Hero Section */
        .hero-section {
          padding-top: 6rem;
          padding-bottom: 4.25rem;
        }
        
        .methodology-badge {
          margin-bottom: 1rem;
        }
        
        .hero-main-title {
          margin-top: 0.125rem; /* Baja un tris para igualar espacios */
        }
        
        .demo-card-container {
          margin-top: -0.75rem; /* Sube más para alinearse con metodología */
          padding-bottom: 0;
        }

        /* Bridge Statement — tighter spacing, feels like hero closure */
        .bridge-section {
          padding: 1.25rem 1.5rem 0.125rem 1.5rem;
        }
        .bridge-text {
          font-size: 1.25rem;
          max-width: 600px;
          color: #667eea;
        }
        [data-theme="dark"] .bridge-text {
          color: #8b9cf5;
        }

        /* Features Section */
        .features-section {
          padding: 0.625rem 1.5rem;
        }

        .features-title-container {
          margin-bottom: 2.5rem;
        }

        /* Analyzer Section */
        .analyzer-section {
          padding: 1.25rem 1.5rem;
        }
        
        .analyzer-title-container {
          margin-bottom: 2.5rem;
        }

        /* Footer - alineación perfecta */
        .footer-section {
          padding: 2.5rem 1.5rem 1.75rem;
        }

        /* eBook Section */
        .ebook-section {
          padding: 4rem 1.5rem;
        }
        
        .footer-grid {
          gap: 2.5rem;
          margin-bottom: 1.5rem;
        }
        
        /* Alinear TODOS los títulos a la misma altura */
        .footer-heading {
          margin-bottom: 0.75rem;
          margin-top: 0.25rem;
        }
        
        /* MasteringReady baja para alinearse */
        .footer-grid > div:first-child > div:first-child {
          margin-bottom: 0.75rem;
          margin-top: 0.25rem;
        }
        
        /* Igualar espacios entre título y contenido */
        .footer-grid > div > div:first-child {
          margin-bottom: 0.75rem;
        }
        
        .footer-copyright {
          padding-top: 0.875rem;
        }

        /* ============================================
           MOBILE STYLES (max-width: 767px)
           ============================================ */
        @media (max-width: 767px) {
          /* Hero Section */
          .hero-section {
            padding-top: calc(4.5rem + 10px); /* +10px más aire arriba */
            padding-bottom: 4rem;
          }
          
          /* 1️⃣ Badge presentado, no pegado */
          .methodology-badge {
            margin-bottom: calc(1.5rem - 12px); /* -12px: compactar badge → H1 */
          }
          
          /* 2️⃣ H1 y subtítulo compactos (mensaje es uno) */
          .hero-main-title {
            margin-top: 0;
            margin-bottom: calc(1.5rem - 10px); /* -10px: compactar H1 → subtítulo */
          }
          
          /* 3️⃣ CLAVE: Más aire antes del CTA (decisión, no texto) */
          .hero-subtitle {
            margin-bottom: calc(2rem + 9px) !important; /* +9px en lugar de +14px: look más compacto */
          }
          
          /* 4️⃣ Checks pegados al CTA (tranquilizadores post-decisión) */
          .hero-cta-button {
            margin-bottom: calc(2rem - 4px) !important; /* -4px: checks más cerca */
          }
          
          .demo-card-container {
            margin-top: 0;
          }
          
          /* Jerarquía de intención creada:
             - Arriba: respirar
             - Mensaje: compacto  
             - CTA: aislado
             - Reaseguro: pegado al CTA
          */
          
          /* Bridge Statement — tighter spacing, feels like hero closure */
          .bridge-section {
            padding: 0.875rem 1.5rem 0.0625rem 1.5rem;
          }
          .bridge-text {
            font-size: 1.065rem;
            max-width: 85vw;
          }

          /* Features Section */
          .features-section {
            padding: 0.375rem 1.5rem 2rem 1.5rem;
          }

          .features-title-container {
            margin-bottom: 1.5rem;
          }
          
          /* Analyzer Section */
          .analyzer-section {
            padding: 1.125rem 1.5rem;
          }
          
          .analyzer-title-container {
            margin-bottom: 2.25rem;
          }
          
          /* Footer - espaciado mejorado */
          .footer-section {
            padding: 1.75rem 1.5rem 1.5rem;
          }

          /* eBook Section - mobile */
          .ebook-section {
            padding: 3rem 1.5rem;
          }
          
          .footer-grid {
            gap: 1.25rem;
            margin-bottom: 0.75rem;
          }
          
          /* Separación entre secciones del footer */
          .footer-grid > div:nth-child(2) {
            margin-bottom: 1rem; /* Espacio entre Contacto y Acerca de */
          }
          
          .footer-heading {
            margin-bottom: 0.625rem;
            margin-top: 0;
          }
          
          .footer-grid > div:first-child > div:first-child {
            margin-bottom: 0.625rem;
            margin-top: 0;
          }
          
          .footer-copyright {
            padding-top: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Home

