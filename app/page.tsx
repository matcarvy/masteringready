'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Download, Check, Upload, Zap, Shield, TrendingUp, Play, Music, Crown, X, AlertTriangle, Globe, Headphones, Menu } from 'lucide-react'
import { UserMenu, useAuth, AuthModal } from '@/components/auth'
import { analyzeFile, checkIpLimit, IpCheckResult } from '@/lib/api'
import { startAnalysisPolling, getAnalysisStatus } from '@/lib/api'
import { compressAudioFile } from '@/lib/audio-compression'
import { supabase, checkCanAnalyze, AnalysisStatus } from '@/lib/supabase'
import { useGeo } from '@/lib/useGeo'
import { getPlanDisplayPrice, PRICING } from '@/lib/geoip'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { getErrorMessage, ERROR_MESSAGES } from '@/lib/error-messages'

// ============================================================================
// Helper: Map verdict string to database enum
// ============================================================================
function mapVerdictToEnum(verdict: string): 'ready' | 'almost_ready' | 'needs_work' | 'critical' {
  if (!verdict) return 'needs_work'
  const v = verdict.toLowerCase()
  if (v.includes('óptimo') || v.includes('optimo') || v.includes('listo') ||
      v.includes('ready') || v.includes('excellent') || v.includes('excelente')) {
    return 'ready'
  }
  if (v.includes('casi') || v.includes('almost') || v.includes('good') ||
      v.includes('bien') || v.includes('aceptable')) {
    return 'almost_ready'
  }
  if (v.includes('critical') || v.includes('crítico') || v.includes('critico') ||
      v.includes('serious') || v.includes('grave')) {
    return 'critical'
  }
  return 'needs_work'
}

// ============================================================================
// Helper: Save analysis directly to database for logged-in users
// ============================================================================
async function saveAnalysisToDatabase(userId: string, analysis: any, fileObj?: File, countryCode?: string) {
  console.log('[SaveAnalysis] Saving for logged-in user:', userId, 'file:', analysis.filename)
  console.log('[SaveAnalysis] API response keys:', Object.keys(analysis).join(', '))
  console.log('[SaveAnalysis] Report fields:', {
    report: analysis.report ? `${analysis.report.substring(0, 50)}...` : null,
    report_short: analysis.report_short ? `${analysis.report_short.substring(0, 50)}...` : null,
    report_write: analysis.report_write ? `${analysis.report_write.substring(0, 50)}...` : null,
    report_visual: analysis.report_visual ? `${analysis.report_visual.substring(0, 50)}...` : null
  })

  const mappedVerdict = mapVerdictToEnum(analysis.verdict)
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

  // Insert to analyses table
  const { data: insertedData, error } = await supabase
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
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
    })
    .select()

  if (error) {
    console.error('[SaveAnalysis] INSERT ERROR:', error.message)
    throw error
  }

  console.log('[SaveAnalysis] Insert successful:', insertedData)

  // Call increment function which handles all plan-specific counter logic
  // (updates analyses_lifetime_used for free, analyses_used_this_cycle for pro, etc.)
  const { data: incrementResult } = await supabase.rpc('increment_analysis_count', { p_user_id: userId })
  console.log('[SaveAnalysis] Analysis count incremented:', incrementResult)

  return insertedData
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
    excellent: { border: '#10b981', bg: '#d1fae5', text: '#065f46' },
    good: { border: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
    warning: { border: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
    error: { border: '#ef4444', bg: '#fee2e2', text: '#991b1b' }
  }

  const colors = statusColors[metrics.status] || statusColors.good

  return (
    <div style={{
      border: `2px solid ${colors.border}`,
      borderRadius: '1rem',
      padding: '1.5rem',
      background: 'white',
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
        background: '#f9fafb',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.25rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          fontSize: '0.875rem', 
          color: '#6b7280',
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
        color: '#374151'
      }}>
        {interpretation}
      </p>
      
      {/* 3. RECOMMENDATION THIRD */}
      <div style={{
        background: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        padding: '0.75rem 1rem',
        borderRadius: '0.25rem'
      }}>
        <p style={{
          fontSize: '0.875rem',
          color: '#1e40af',
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
  const { user, loading: authLoading, savePendingAnalysis, pendingAnalysisQuotaExceeded, clearPendingAnalysisQuotaExceeded, pendingAnalysisSaved, clearPendingAnalysisSaved } = useAuth()
  const isLoggedIn = !!user

  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [mode, setMode] = useState<'short' | 'write'>('write')
  const [strict, setStrict] = useState(false)
  const [langDetected, setLangDetected] = useState(false)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
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
  const proPrice = getPlanDisplayPrice(PRICING.PRO_MONTHLY, geo)
  const singlePrice = getPlanDisplayPrice(PRICING.SINGLE, geo)

  // Store request ID for PDF download
  const requestIdRef = useRef<string>('')

  // Check Pro subscription status
  useEffect(() => {
    if (!user) { setIsPro(false); return }
    const checkPro = async () => {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*, plan:plans(type)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      setIsPro(subData?.plan?.type === 'pro' || subData?.plan?.type === 'studio')
    }
    checkPro()
  }, [user])

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

  // Check for OAuth redirect and trigger unlock animation
  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      try {
        const authFlowData = localStorage.getItem('authModalFlow')
        if (authFlowData) {
          const { fromModal, timestamp } = JSON.parse(authFlowData)
          const fiveMinutes = 5 * 60 * 1000

          // Check if flag is recent (within 5 minutes)
          if (fromModal && timestamp && (Date.now() - timestamp) < fiveMinutes) {
            // Clear the flag
            localStorage.removeItem('authModalFlow')

            // Trigger unlock animation if there's a pending analysis
            const pendingAnalysis = localStorage.getItem('pendingAnalysis')
            if (pendingAnalysis) {
              setIsUnlocking(true)
              // Animation duration: 800ms
              setTimeout(() => {
                setIsUnlocking(false)
              }, 800)
            }
          } else {
            // Clear expired flag
            localStorage.removeItem('authModalFlow')
          }
        }
      } catch (e) {
        console.error('Error checking auth flow:', e)
        localStorage.removeItem('authModalFlow')
      }
    }
  }, [isLoggedIn, authLoading])

  // React to pending analysis save success (from AuthProvider after login)
  // Only NOW play the unlock animation — quota was checked before saving
  useEffect(() => {
    if (pendingAnalysisSaved) {
      setIsUnlocking(true)
      setTimeout(() => setIsUnlocking(false), 1500)
      clearPendingAnalysisSaved()
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

  // Proactive quota check — show free limit modal immediately if user can't analyze
  // Prevents UX issue where user navigates back from dashboard, uploads a file,
  // and only finds out they can't analyze after clicking the button
  useEffect(() => {
    if (authLoading || !isLoggedIn || result || loading) return
    checkCanAnalyze().then((status) => {
      setUserAnalysisStatus(status)
      if (!status.can_analyze) {
        setShowFreeLimitModal(true)
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
    { es: '🎧 Aplicando la metodología MasteringReady…', en: '🎧 Applying MasteringReady methodology…' },
    { es: '🎧 Evaluando headroom y dinámica…', en: '🎧 Evaluating headroom and dynamics…' },
    { es: '🎧 Analizando balance tonal y frecuencias…', en: '🎧 Analyzing tonal and frequency balance…' },
    { es: '🎧 Revisando picos reales y margen técnico…', en: '🎧 Reviewing true peaks and technical margin…' },
    { es: '🎧 Evaluando imagen estéreo y coherencia mono…', en: '🎧 Evaluating stereo image and mono coherence…' },
    { es: '🎧 Preparando métricas para el mastering…', en: '🎧 Preparing metrics for mastering…' }
  ]

  // File validation helper
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 500 * 1024 * 1024 // 500MB
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/aiff', 'audio/x-aiff', 'audio/aac', 'audio/mp4', 'audio/x-m4a']
    const allowedExtensions = ['.wav', '.mp3', '.aiff', '.aac', '.m4a']
    
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
  setLoading(true)
  setProgress(0)
  setError(null)
  try {
    // ============================================================
    // IP RATE LIMITING CHECK (for anonymous users only)
    // ============================================================
    if (!isLoggedIn) {
      try {
        const ipCheck = await checkIpLimit(false)

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
      } catch (ipError) {
        console.warn('IP check failed, DENYING analysis:', ipError)
        setLoading(false)
        setError(lang === 'es'
          ? 'No se pudo verificar el acceso. Intenta de nuevo en unos segundos.'
          : 'Could not verify access. Please try again in a few seconds.')
        return
      }
    } else {
      // ============================================================
      // USER LIMIT CHECK (for logged-in users)
      // ============================================================
      try {
        const analysisStatus = await checkCanAnalyze()
        setUserAnalysisStatus(analysisStatus)

        if (!analysisStatus.can_analyze) {
          setLoading(false)

          // Show the free limit modal with upgrade options
          setShowFreeLimitModal(true)
          return
        }
      } catch (statusError) {
        console.warn('User status check failed, DENYING analysis:', statusError)
        setLoading(false)
        setError(lang === 'es'
          ? 'No se pudo verificar tu plan. Intenta de nuevo en unos segundos.'
          : 'Could not verify your plan. Please try again in a few seconds.')
        return
      }
    }
    // ============================================================

    let fileToAnalyze = file
    let originalMetadata = undefined

    // Check if file needs compression
    // API accepts up to 200MB — only compress very large files to avoid
    // losing stereo info or bit depth through Web Audio API re-encoding
    const maxSize = 100 * 1024 * 1024  // 100MB threshold
    if (file.size > maxSize) {
      setCompressing(true)
      setCompressionProgress(0)
      
      // Simulate compression progress
      const compressionInterval = setInterval(() => {
        setCompressionProgress(prev => Math.min(prev + 10, 90))
      }, 500)
      
      try {
        const { file: compressedFile, compressed, originalSize, newSize, originalMetadata: metadata } =
          await compressAudioFile(file, 20)
        
        clearInterval(compressionInterval)
        setCompressionProgress(100)
        
        if (compressed) {
        }
        
        fileToAnalyze = compressedFile
        originalMetadata = metadata
        
        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 500))
        setCompressing(false)
        setCompressionProgress(0)
      } catch (compressionError) {
        clearInterval(compressionInterval)
        setCompressing(false)
        setCompressionProgress(0)
        throw new Error(ERROR_MESSAGES.corrupt_file[lang])
      }
    }
    
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
    
    setProgress(10)
    
    // POLL FOR RESULT
    let pollAttempts = 0
    const maxPollAttempts = 60  // 60 attempts * 3 sec = 3 min max
    
    const pollForResult = async (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          pollAttempts++
          
          try {
            const statusData = await getAnalysisStatus(jobId, lang)
            
            
            // Update progress bar (don't allow it to go backwards)
            setProgress(prev => Math.max(prev, statusData.progress || 0))
            
            if (statusData.status === 'complete') {
              clearInterval(pollInterval)
              resolve(statusData.result)
              
            } else if (statusData.status === 'error') {
              clearInterval(pollInterval)
              console.error('Analysis error:', statusData.error)
              reject(new Error(statusData.error || 'Analysis failed'))
              
            } else if (pollAttempts >= maxPollAttempts) {
              clearInterval(pollInterval)
              console.error('Polling timeout')
              reject(new Error(ERROR_MESSAGES.timeout[lang]))
            }
            
          } catch (pollError: any) {
            clearInterval(pollInterval)
            console.error('Polling error:', pollError)
            reject(pollError)
          }
          
        }, 3000)  // Poll every 3 seconds
      })
    }
    
    // Wait for result
    const data = await pollForResult()

    setProgress(100)
    setResult(data)

    // Save analysis
    if (data) {
      if (isLoggedIn && user) {
        // Re-check quota before saving — prevents bypass when user logs in during analysis
        // (user may have started as anonymous but logged in while polling)
        try {
          const quotaCheck = await checkCanAnalyze()
          if (!quotaCheck.can_analyze) {
            console.log('[Analysis] User quota exhausted at save time, blocking save:', quotaCheck.reason)
            setUserAnalysisStatus(quotaCheck)
            setShowFreeLimitModal(true)
            // Analysis result is visible on screen but NOT saved to account
          } else {
            console.log('[Analysis] Saving to database for logged-in user:', user.id)
            const savedData = await saveAnalysisToDatabase(user.id, {
              ...data,
              filename: file.name,
              created_at: new Date().toISOString(),
              lang,
              strict
            }, file, geo?.countryCode)
            setSavedAnalysisId(savedData?.[0]?.id || null)
          }
        } catch (saveErr) {
          console.error('[Analysis] Failed to save to database:', saveErr)
        }
      } else {
        // Save to localStorage for later account linking (anonymous users)
        const pendingAnalysis = {
          ...data,
          filename: file.name,
          created_at: new Date().toISOString(),
          lang,
          strict
        }
        localStorage.setItem('pendingAnalysis', JSON.stringify(pendingAnalysis))
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
    setLoading(false)
    setProgress(0)
    setCompressing(false)
    setCompressionProgress(0)
  }
}

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setLoading(false)
    setProgress(0)
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
${lang === 'es' ? 'Generado por' : 'Generated by'} MasteringReady
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
${lang === 'es' ? 'Generado por' : 'Generated by'} MasteringReady
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
${lang === 'es' ? 'Generado por' : 'Generated by'} MasteringReady
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

          console.log('[PDF Download] Requesting:', pdfUrl, 'request_id:', requestIdRef.current)

          const response = await fetch(pdfUrl, {
            method: 'POST',
            body: formData
          })

          console.log('[PDF Download] Response status:', response.status)

          if (response.ok) {
            // PDF download successful
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const filename = result.filename?.replace(/\.(wav|mp3|flac)$/i, '') || 'analisis'
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
      } else {
        console.warn('[PDF Download] No request_id available, falling back to TXT')
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
${lang === 'es' ? 'Analizado con' : 'Analyzed with'} MasteringReady
www.masteringready.com
by Matías Carvajal
`
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = result.filename?.replace(/\.(wav|mp3|flac)$/i, '') || 'analisis'
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
      .replace(/^Veredicto:\s*[^\n]+\s*\n*/im, '')
      .replace(/^Verdict:\s*[^\n]+\s*\n*/im, '')
      // Remove ALL decorative lines (multiple patterns)
      .replace(/[═─━]{3,}/g, '')              // Lines with 3+ chars (including ━)
      .replace(/^[═─━\s]+$/gm, '')            // Lines that are ONLY decorative chars
      .replace(/[═─━]{2,}/g, '')              // Lines with 2+ chars (more aggressive)
      // Fix headers: Add emojis and proper casing (ONLY if not already present)
      .replace(/(?<!✅\s)ASPECTOS POSITIVOS/g, '✅ Aspectos Positivos')
      .replace(/(?<!✅\s)POSITIVE ASPECTS/g, '✅ Positive Aspects')
      .replace(/(?<!⚠️\s)ASPECTOS PARA REVISAR/g, '⚠️ Aspectos para Revisar')
      .replace(/(?<!⚠️\s)AREAS TO REVIEW/g, '⚠️ Areas to Review')
      // Fix additional headers (ONLY if not already present)
      .replace(/(?<!⚠️\s)SI ESTE ARCHIVO CORRESPONDE A UNA MEZCLA:/g, '⚠️ Si este archivo corresponde a una mezcla:')
      .replace(/(?<!⚠️\s)IF THIS FILE IS A MIX:/g, '⚠️ If this file is a mix:')
      .replace(/(?<!✅\s)SI ESTE ES TU MASTER FINAL:/g, '✅ Si este es tu master final:')
      .replace(/(?<!✅\s)IF THIS IS YOUR FINAL MASTER:/g, '✅ If this is your final master:')
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

  const isFileTooLarge = file && file.size > 500 * 1024 * 1024 // 500MB hard limit
  const needsCompression = file && file.size > 100 * 1024 * 1024 && file.size <= 500 * 1024 * 1024

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreBg = (score: number) => {
    if (score >= 85) return '#ecfdf5'
    if (score >= 60) return '#fffbeb'
    return '#fef2f2'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '64px', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  whiteSpace: 'nowrap'
                }}>
                  MasteringReady
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

              {/* User Menu — hidden on mobile when not logged in (hamburger handles it) */}
              <UserMenu lang={lang} isMobile={isMobile} />

              {/* Analyze CTA — always visible */}
              <button
                onClick={scrollToAnalyzer}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

              {/* Hamburger menu — mobile only, when not logged in and auth resolved */}
              {isMobile && !user && !authLoading && (
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
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      color: '#374151'
                    }}
                  >
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>

                  {mobileMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      background: 'white',
                      borderRadius: '0.75rem',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
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
                            color: '#374151',
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
                            color: '#667eea',
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
                  background: 'white',
                  color: '#667eea',
                  padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2rem)',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
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
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                padding: '2rem',
                transition: 'transform 0.3s'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500', fontSize: '1.125rem' }}>
                      {lang === 'es' ? 'Puntuación MR' : 'MR Score'}
                    </span>
                    <span style={{
                      fontSize: '2.25rem',
                      fontWeight: 'bold',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                    background: '#e5e7eb',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '97%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                      background: '#ecfdf5',
                      borderRadius: '0.5rem'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46' }}>
                        <Check size={20} color="#10b981" />
                        {item.label}
                      </span>
                      <span style={{ color: '#047857', fontWeight: '600' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: '#f3e8ff',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{ fontSize: '1rem', color: '#6b21a8', fontWeight: '600' }}>
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

      {/* Features Section */}
      <section id="features" className="features-section" style={{
        background: '#f9fafb'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="features-title-container" style={{ 
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {lang === 'es' ? '¿Por qué MasteringReady?' : 'Why MasteringReady?'}
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
              {lang === 'es'
                ? 'Criterio técnico aplicado a tu mezcla'
                : 'Technical judgment applied to your mix'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              {
                icon: <Zap size={48} color="#667eea" />,
                title: lang === 'es' ? 'Análisis profesional en 60 segundos' : 'Professional analysis in 60 seconds',
                desc: lang === 'es'
                  ? 'LUFS, True Peak, headroom, correlación estéreo, balance frecuencial y más.'
                  : 'LUFS, True Peak, headroom, stereo correlation, frequency balance and more.'
              },
              {
                icon: <Shield size={48} color="#667eea" />,
                title: lang === 'es' ? 'Privacidad garantizada' : 'Privacy guaranteed',
                desc: lang === 'es'
                  ? 'Tu audio nunca se almacena. Análisis en memoria, eliminación inmediata.'
                  : 'Your audio is never stored. In-memory analysis, immediate deletion.'
              },
              {
                icon: <TrendingUp size={48} color="#667eea" />,
                title: lang === 'es' ? 'Recomendaciones específicas' : 'Specific recommendations',
                desc: lang === 'es'
                  ? 'No solo números, te decimos exactamente qué ajustar y por qué.'
                  : "Not just numbers. We tell you exactly what to adjust and why."
              },
            ].map((feature, i) => (
              <div key={i} style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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
                <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analyzer Section - Same as before but with inline styles */}
      <section id="analyze" className="analyzer-section" style={{ 
        background: 'white' 
      }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          {!result ? (
            <>
              <div className="analyzer-title-container" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  {lang === 'es' ? 'Analiza tu mezcla ahora' : 'Analyze your mix now'}
                </h2>
                <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                  {lang === 'es'
                    ? 'Sube tu archivo y obtén un reporte profesional en 60 segundos'
                    : 'Upload your file and get a professional report in 60 seconds'}
                </p>
              </div>

              {/* Privacy Badge */}
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Shield size={20} color="#059669" />
                  <span style={{ fontWeight: '600', color: '#064e3b' }}>
                    {lang === 'es' ? 'Analizador con Privacidad' : 'Privacy-First Analyzer'}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#065f46' }}>
                  {lang === 'es'
                    ? 'Tu audio se analiza solo en memoria y se elimina inmediatamente.'
                    : 'Your audio is analyzed in-memory only and deleted immediately.'}
                </p>
              </div>

              {/* File Upload */}
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                padding: '2rem',
                marginBottom: '1.5rem'
              }}>
                <div
                  onClick={() => !loading && document.getElementById('file-input')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#a855f7'
                      e.currentTarget.style.background = '#faf5ff'
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.background = 'transparent'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = '#d1d5db'
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
                    border: '2px dashed #d1d5db',
                    borderRadius: '0.75rem',
                    padding: 'clamp(1.25rem, 4vw, 3rem)',
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#a855f7'
                      e.currentTarget.style.background = '#faf5ff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".wav,.mp3,.aiff,.aac,.m4a"
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
                  
                  <Upload size={isMobile ? 48 : 64} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)', fontWeight: '500', marginBottom: '0.5rem' }}>
                    {lang === 'es' ? 'Arrastra y suelta tu archivo aquí' : 'Drag and drop your file here'}
                  </p>
                  <p style={{ fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', color: '#6b7280' }}>
                    {lang === 'es'
                      ? 'o haz click para seleccionar'
                      : 'or click to select'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                    {lang === 'es' ? 'WAV, MP3 o AIFF • Máximo 500MB' : 'WAV, MP3 or AIFF • Max 500MB'}
                  </p>
                </div>
              </div>

              {/* Selected File */}
              {file && (
                <div style={{
                  borderRadius: '0.5rem',
                  border: `1px solid ${isFileTooLarge ? '#fca5a5' : needsCompression ? '#fbbf24' : '#93c5fd'}`,
                  background: isFileTooLarge ? '#fef2f2' : needsCompression ? '#fffbeb' : '#eff6ff',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: isFileTooLarge ? '#7f1d1d' : needsCompression ? '#78350f' : '#1e3a8a'
                  }}>
                    {lang === 'es' ? 'Archivo seleccionado:' : 'Selected file:'}
                  </p>
                  <p style={{
                    fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)',
                    fontWeight: 'bold',
                    color: isFileTooLarge ? '#7f1d1d' : needsCompression ? '#78350f' : '#1e3a8a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}>
                    {file.name}
                  </p>
                  <p style={{
                    fontSize: '0.875rem',
                    color: isFileTooLarge ? '#991b1b' : needsCompression ? '#92400e' : '#1e40af'
                  }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {needsCompression && !isFileTooLarge && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#fef3c7',
                      border: '1px solid #fbbf24',
                      borderRadius: '0.25rem',
                      padding: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#78350f', fontWeight: '600', marginBottom: '0.25rem' }}>
                        ℹ️ {lang === 'es' 
                          ? 'Archivo grande detectado'
                          : 'Large file detected'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#92400e' }}>
                        {lang === 'es'
                          ? `Tu archivo será comprimido automáticamente de ${(file.size / 1024 / 1024).toFixed(1)}MB a ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB antes del análisis. Esto no afecta la fidelidad del análisis. Toma ~10-15 segundos.`
                          : `Your file will be automatically compressed from ${(file.size / 1024 / 1024).toFixed(1)}MB to ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB before analysis. This does not affect analysis fidelity. Takes ~10-15 seconds.`}
                      </p>
                    </div>
                  )}
                  {isFileTooLarge && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      borderRadius: '0.25rem',
                      padding: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#7f1d1d', fontWeight: '600', marginBottom: '0.25rem' }}>
                        ⚠️ {lang === 'es' 
                          ? 'Archivo demasiado grande'
                          : 'File too large'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#991b1b' }}>
                        {lang === 'es'
                          ? `El límite máximo es 500MB. Tu archivo tiene ${(file.size / 1024 / 1024).toFixed(1)}MB. Por favor, usa un archivo más pequeño.`
                          : `Maximum limit is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please use a smaller file.`}
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
                    background: 'white',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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
                            background: reportView === m ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6',
                            color: reportView === m ? 'white' : '#111827',
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
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                      {lang === 'es'
                        ? 'Estándares comerciales más exigentes'
                        : 'More demanding commercial standards'}
                    </p>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              {file && !isFileTooLarge && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading || compressing}
                  style={{
                    width: '100%',
                    background: (loading || compressing) ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: (loading || compressing) ? '#6b7280' : 'white',
                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                    borderRadius: '0.75rem',
                    fontWeight: '600',
                    fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)',
                    minHeight: '48px',
                    border: 'none',
                    cursor: (loading || compressing) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: (loading || compressing) ? 'none' : '0 4px 20px rgba(102, 126, 234, 0.3)',
                    opacity: (loading || compressing) ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !compressing) {
                      e.currentTarget.style.transform = 'scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = (loading || compressing) ? 'none' : '0 4px 20px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {compressing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '1.5rem', width: '1.5rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                          background: '#e5e7eb',
                          borderRadius: '9999px',
                          height: '1rem',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            height: '1rem',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease-out',
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
                  ) : loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
                      {/* Rotating methodology message */}
                      <p
                        key={loadingMsgIndex}
                        style={{
                          textAlign: 'center',
                          fontSize: '1.05rem',
                          fontWeight: '500',
                          color: '#374151',
                          animation: 'fadeInMsg 0.5s ease-in-out'
                        }}
                      >
                        {loadingMessages[loadingMsgIndex][lang]}
                      </p>

                      {/* Progress bar + percentage */}
                      <div style={{ width: '100%' }}>
                        <div style={{
                          width: '100%',
                          background: '#e5e7eb',
                          borderRadius: '9999px',
                          height: '1rem',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            height: '1rem',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease-out',
                            width: `${progress}%`,
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                          }} />
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '0.5rem',
                          fontSize: '0.875rem',
                          opacity: 0.9
                        }}>
                          <span style={{ fontWeight: '600' }}>{progress}%</span>
                          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                            {lang === 'es' ? 'Puede tardar hasta 60 segundos' : 'May take up to 60 seconds'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </button>
              )}

              {/* Message when file is too large (>500MB) */}
              {file && isFileTooLarge && (
                <div style={{
                  width: '100%',
                  background: '#fee2e2',
                  border: '2px solid #ef4444',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '600', 
                    color: '#7f1d1d',
                    marginBottom: '0.5rem'
                  }}>
                    🚫 {lang === 'es' ? 'Archivo demasiado grande' : 'File too large'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                    {lang === 'es'
                      ? `El límite máximo es 500MB. Tu archivo tiene ${(file.size / 1024 / 1024).toFixed(1)}MB.`
                      : `Maximum limit is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.5rem' }}>
                    {lang === 'es'
                      ? 'Contáctanos en support@masteringready.com para archivos más grandes.'
                      : 'Contact us at support@masteringready.com for larger files.'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginTop: '1rem',
                  animation: 'errorSlideIn 0.35s ease-out'
                }}>
                  <p style={{ color: '#7f1d1d', fontWeight: '500' }}>Error:</p>
                  <p style={{ color: '#991b1b' }}>{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Results - Same structure but inline styles */
            <div id="analysis-results" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
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
                      color: '#a855f7',
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
                  border: `1px solid ${result.score >= 85 ? '#a7f3d0' : result.score >= 60 ? '#fcd34d' : '#fca5a5'}`,
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
                      <span style={{ color: '#374151', fontWeight: '500', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
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
                    background: '#e5e7eb',
                    borderRadius: '9999px',
                    height: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      height: '0.75rem',
                      borderRadius: '9999px',
                      width: `${displayScore}%`,
                      transition: 'width 0.08s linear'
                    }} />
                  </div>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>{result.verdict}</p>
                  <p style={{
                    fontSize: '0.7rem',
                    color: '#6b7280',
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
                    background: '#f8fafc',
                    borderRadius: '0.75rem',
                    padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    border: '1px solid #e2e8f0',
                    fontSize: 'clamp(0.6875rem, 1.8vw, 0.8rem)',
                    color: '#475569'
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
                  background: '#f3f4f6',
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
                        // Completo requires Pro subscription
                        if (view === 'write' && isLoggedIn && !isPro) {
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
                        background: reportView === view ? 'white' : 'transparent',
                        color: reportView === view ? '#667eea' : '#6b7280',
                        fontWeight: reportView === view ? '600' : '500',
                        fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: reportView === view ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        position: 'relative'
                      }}
                    >
                      {/* Crown icon for non-logged users on Resumen, non-Pro on Completo */}
                      {((view === 'short' && !isLoggedIn) || (view === 'write' && (!isLoggedIn || !isPro))) && (
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

                {/* Tab Content Wrapper with cross-fade */}
                <div style={{
                  opacity: tabTransition ? 0 : 1,
                  transform: tabTransition ? 'translateY(4px)' : 'translateY(0)',
                  transition: 'opacity 0.15s ease, transform 0.15s ease'
                }}>

                {/* Visual Mode */}
                {reportView === 'visual' && (
                  <div style={{
                    background: '#f9fafb',
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
                      color: '#6b7280',
                      marginBottom: '1.5rem',
                      fontStyle: 'italic'
                    }}>
                      {lang === 'es' ? '🎵 Sobre' : '🎵 About'} "{result.filename || 'archivo'}"
                    </p>
                    
                    {/* NEW v7.3.50: Metrics Bars Visual */}
                    {(result as any).metrics_bars && Object.keys((result as any).metrics_bars).length > 0 && (
                      <div style={{
                        background: 'white',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        border: '1px solid #e5e7eb'
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
                        
                        {/* Subtexto explicativo - MasteringReady philosophy */}
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
                              excellent: '#10b981',
                              good: '#3b82f6',
                              warning: '#f59e0b',
                              critical: '#ef4444'
                            };
                            
                            // Filter and order the metrics we want to show
                            const orderedKeys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'lufs', 'lufs_(integrated)', 'loudness', 'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance'];
                            const displayedKeys = orderedKeys.filter(key => bars[key]);
                            
                            return displayedKeys.map((key) => {
                              const bar = bars[key];
                              const label = metricLabels[key] || { es: key, en: key };
                              const color = statusColors[bar.status] || '#6b7280';
                              
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
                          borderTop: '1px solid #e5e7eb',
                          fontSize: '0.65rem',
                          color: '#6b7280'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Dentro del rango recomendado por MasteringReady' : 'Within MasteringReady recommended range'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                            {lang === 'es' ? 'Margen cómodo' : 'Comfortable margin'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Funcional, con margen suficiente para el máster' : 'Functional, with sufficient margin for mastering'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                            {lang === 'es' ? 'Margen suficiente' : 'Sufficient margin'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Revisar si buscas máxima compatibilidad y margen' : 'Review if you want maximum compatibility and margin'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                            {lang === 'es' ? 'Margen reducido' : 'Reduced margin'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={lang === 'es' ? 'Revisión prioritaria antes del máster final' : 'Priority review before final master'}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                            {lang === 'es' ? 'Margen comprometido' : 'Compromised margin'}
                          </span>
                        </div>
                        
                        {/* Footer note */}
                        <p style={{
                          fontSize: '0.6rem',
                          color: '#9ca3af',
                          marginTop: '0.5rem',
                          textAlign: 'center',
                          filter: (!isLoggedIn && !isUnlocking) ? 'blur(3px)' : 'none',
                          transition: 'filter 0.6s ease-out',
                          userSelect: (!isLoggedIn && !isUnlocking) ? 'none' : 'auto'
                        }}>
                          {lang === 'es'
                            ? 'Basado en criterios de MasteringReady para compatibilidad, margen y traducción.'
                            : 'Based on MasteringReady criteria for compatibility, margin and translation.'}
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
                        filter: (!isLoggedIn && !isUnlocking) ? 'blur(4px)' : 'none',
                        transition: 'filter 0.6s ease-out',
                        userSelect: (!isLoggedIn && !isUnlocking) ? 'none' : 'auto',
                        cursor: !isLoggedIn ? 'pointer' : 'auto'
                      }}>
                        {cleanReportText((result as any).report_visual || result.report_short || result.report)}
                      </pre>
                      {/* Unlock overlay for non-logged users */}
                      {!isLoggedIn && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          opacity: isUnlocking ? 0 : 1,
                          transition: 'opacity 0.4s ease-out',
                          pointerEvents: isUnlocking ? 'none' : 'auto'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            background: 'white',
                            borderRadius: '9999px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            color: isUnlocking ? '#10b981' : '#667eea',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            transition: 'color 0.3s ease'
                          }}>
                            {isUnlocking ? <Headphones size={16} /> : <Crown size={16} />}
                            {lang === 'es' ? 'Obtener análisis completo' : 'Get complete analysis'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Short Mode */}
                {reportView === 'short' && (
                  <div style={{
                    background: '#f9fafb',
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
                      color: '#6b7280',
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
                          color: '#111827'
                        }}>
                          {lang === 'es' ? '📊 Análisis Técnico Detallado' : '📊 Detailed Technical Analysis'}
                        </h3>
                        
                        {/* File name subtitle */}
                        <p style={{
                          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                          color: '#6b7280',
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
                      background: '#f9fafb',
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
                      background: 'white',
                      color: !isLoggedIn ? '#9ca3af' : '#667eea',
                      border: `2px solid ${!isLoggedIn ? '#d1d5db' : '#667eea'}`,
                      borderRadius: '0.75rem',
                      fontWeight: '600',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {!isLoggedIn ? <Crown size={18} style={{ color: '#d97706' }} /> : <Download size={18} />}
                    {lang === 'es'
                      ? `Descargar ${reportView === 'visual' ? 'Rápido' : reportView === 'short' ? 'Resumen' : 'Completo'}`
                      : `Download ${reportView === 'visual' ? 'Quick' : reportView === 'short' ? 'Summary' : 'Complete'}`}
                  </button>

                  {/* Download Full Report — Pro only */}
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        setShowAuthModal(true)
                        return
                      }
                      if (!isPro) {
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
                      background: (!isLoggedIn || !isPro) ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: (!isLoggedIn || !isPro) ? '#6b7280' : 'white',
                      border: 'none',
                      borderRadius: '0.75rem',
                      fontWeight: '600',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: (!isLoggedIn || !isPro) ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      if (isLoggedIn && isPro) {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      if (isLoggedIn && isPro) {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }
                    }}
                  >
                    {(!isLoggedIn || !isPro) ? <Crown size={18} style={{ color: '#d97706' }} /> : <Download size={18} />}
                    {lang === 'es' ? 'Análisis Detallado' : 'Detailed Analysis'}
                  </button>
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
                        background: 'white',
                        color: '#6366f1',
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
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    {lang === 'es'
                      ? '¿Te resultó útil el análisis?'
                      : 'Was the analysis useful?'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: analysisRating !== null ? '0.75rem' : '0' }}>
                    <button
                      onClick={() => setAnalysisRating(true)}
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '50%',
                        border: analysisRating === true ? '2px solid #10b981' : '2px solid #e5e7eb',
                        background: analysisRating === true ? '#ecfdf5' : 'white',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={lang === 'es' ? 'Me fue bien' : 'Good experience'}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => setAnalysisRating(false)}
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '50%',
                        border: analysisRating === false ? '2px solid #ef4444' : '2px solid #e5e7eb',
                        background: analysisRating === false ? '#fef2f2' : 'white',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={lang === 'es' ? 'Podría mejorar' : 'Could be better'}
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
                          border: '1px solid #e5e7eb',
                          fontSize: '0.875rem',
                          marginBottom: '0.5rem',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                      />
                      <br />
                      <button
                        onClick={submitAnalysisRating}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.5rem 1.5rem',
                          borderRadius: '9999px',
                          border: 'none',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#5a6fd6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
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
                  background: '#f0fdf4',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  border: '1px solid #86efac',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {analysisRating ? '👍' : '👎'}
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#166534', marginBottom: '0.25rem' }}>
                    {lang === 'es' ? '¡Gracias por tu feedback!' : 'Thank you for your feedback!'}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#15803d' }}>
                    {lang === 'es'
                      ? 'Tu opinión nos ayuda a mejorar MasteringReady.'
                      : 'Your input helps us improve MasteringReady.'}
                  </p>
                </div>
              )}

              {/* Mini-Glossary (per spec Section 12) */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
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
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>
                    {lang === 'es' ? '📘 ¿Qué significan estos términos?' : '📘 What do these terms mean?'}
                  </span>
                  <span style={{
                    transform: glossaryOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                    fontSize: '1.25rem',
                    color: '#64748b'
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
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                      {lang === 'es'
                        ? 'Algunos conceptos técnicos usados en este análisis están explicados brevemente aquí.'
                        : 'Some technical concepts used in this analysis are briefly explained here.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Headroom */}
                      <div>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>Headroom</span>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Espacio dinámico disponible antes del clipping. Permite al ingeniero de mastering trabajar sin distorsión.'
                            : 'Dynamic space available before clipping. Allows the mastering engineer to work without distortion.'}
                        </p>
                      </div>

                      {/* True Peak */}
                      <div>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>True Peak</span>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Nivel real máximo considerando la reconstrucción digital. Importante para evitar distorsión en conversión.'
                            : 'Actual maximum level considering digital reconstruction. Important to avoid distortion during conversion.'}
                        </p>
                      </div>

                      {/* LUFS */}
                      <div>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>LUFS (Integrated)</span>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Medida del volumen percibido. Es informativo: el volumen final se ajusta en mastering.'
                            : 'Measure of perceived loudness. Informative only: final loudness is adjusted in mastering.'}
                        </p>
                      </div>

                      {/* PLR */}
                      <div>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>PLR (Peak-to-Loudness Ratio)</span>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Relación entre el pico y el nivel promedio. Indica cuánta dinámica tiene tu mezcla.'
                            : 'Ratio between peak and average level. Indicates how much dynamics your mix has.'}
                        </p>
                      </div>

                      {/* Stereo Image */}
                      <div>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>
                          {lang === 'es' ? 'Imagen Estéreo' : 'Stereo Image'}
                        </span>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.125rem 0 0' }}>
                          {lang === 'es'
                            ? 'Distribución espacial del contenido entre izquierda y derecha. Afecta la amplitud y compatibilidad mono.'
                            : 'Spatial distribution of content between left and right. Affects width and mono compatibility.'}
                        </p>
                      </div>

                      {/* Frequency Balance */}
                      <div>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>
                          {lang === 'es' ? 'Balance de Frecuencias' : 'Frequency Balance'}
                        </span>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.125rem 0 0' }}>
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
                      borderTop: '1px solid #e2e8f0'
                    }}>
                      <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '0.75rem' }}>
                        {lang === 'es'
                          ? 'Para un glosario completo y la metodología completa de MasteringReady, puedes profundizar en el eBook.'
                          : 'For a complete glossary and the full MasteringReady methodology, you can dive deeper in the eBook.'}
                      </p>
                      <a
                        href="https://masteringready.com/ebook"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#667eea',
                          textDecoration: 'none',
                          padding: '0.5rem 1rem',
                          border: '1px solid #667eea',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#667eea'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#667eea'
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
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '4rem 1.5rem',
        borderTop: '1px solid #e2e8f0'
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                color: '#1e293b',
                marginBottom: '1.5rem',
                lineHeight: '1.2'
              }}>
                {lang === 'es' 
                  ? '¿Quieres preparar tus mezclas con criterio profesional?' 
                  : 'Want to prepare your mixes with professional judgment?'}
              </h2>

              <div style={{
                fontSize: '1.125rem',
                color: '#475569',
                marginBottom: '2rem',
                lineHeight: '1.8',
                maxWidth: '650px',
                margin: '0 auto 2rem',
                textAlign: 'center'
              }}>
                {lang === 'es' ? (
                  <>
                    <p style={{ marginBottom: '1rem' }}>
                      El eBook MasteringReady te ayuda a entender qué decisiones realmente importan cuando preparas una mezcla para mastering.
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
                      The MasteringReady eBook helps you understand which decisions actually matter when preparing a mix for mastering.
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
                    background: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <Check size={14} style={{ color: '#10b981' }} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Closing line - human touch */}
              <p style={{
                fontSize: '1rem',
                color: '#64748b',
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  color: '#059669',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  <span style={{
                    background: '#d1fae5',
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
                  color: '#64748b',
                  margin: 0
                }}>
                  {lang === 'es' 
                    ? '15 USD hasta el 31 de enero con código READY15'
                    : '15 USD until January 31 with code READY15'}
                </p>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            textAlign: 'left'
          }}>
            {/* Brand */}
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Music size={24} style={{ color: '#ffffff', flexShrink: 0 }} /> MasteringReady
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
                    ? 'Análisis profesional de mezclas basado en la metodología MasteringReady.'
                    : 'Professional mix analysis based on the MasteringReady methodology.'}
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
                ? '© 2026 MasteringReady. Todos los derechos reservados.'
                : '© 2026 MasteringReady. All rights reserved.'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              {lang === 'es'
                ? 'Basado en la metodología "MasteringReady"'
                : 'Based on the "MasteringReady" methodology'}
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
              background: 'white',
              borderRadius: '1rem',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              maxWidth: '500px',
              width: 'calc(100% - 1rem)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
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
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎧</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? 'Hablemos de tu track' : 'Let\u2019s talk about your track'}
              </h3>
              <p style={{ color: '#6b7280' }}>
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
                    ? `Hola Matías, acabo de analizar "${result?.filename || 'mi mezcla'}" en MasteringReady (${result?.score || 'N/A'}/100). ${ctaSource === 'mastering' ? 'Me interesa el mastering.' : 'Me gustaría revisar algunos puntos de la mezcla.'}`
                    : `Hi Matías, I just analyzed "${result?.filename || 'my mix'}" on MasteringReady (${result?.score || 'N/A'}/100). ${ctaSource === 'mastering' ? 'I\'m interested in mastering.' : 'I\'d like to review some mix points.'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logContactRequest('whatsapp')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: '#166534',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dcfce7'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f0fdf4'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
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
                  lang === 'es'
                    ? `${ctaSource === 'mastering' ? 'Mastering' : 'Revisión de mezcla'}: ${result?.filename || 'Mi track'}`
                    : `${ctaSource === 'mastering' ? 'Mastering' : 'Mix review'}: ${result?.filename || 'My track'}`
                )}&body=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola Matías,\n\nAnalicé "${result?.filename || 'mi mezcla'}" en MasteringReady.\nPuntuación: ${result?.score || 'N/A'}/100\n\n${ctaSource === 'mastering' ? 'Me interesa el mastering de este track.' : 'Me gustaría revisar algunos aspectos técnicos de la mezcla.'}\n\nGracias.`
                    : `Hi Matías,\n\nI analyzed "${result?.filename || 'my mix'}" on MasteringReady.\nScore: ${result?.score || 'N/A'}/100\n\n${ctaSource === 'mastering' ? 'I\'m interested in mastering this track.' : 'I\'d like to review some technical aspects of the mix.'}\n\nThanks.`
                )}`}
                onClick={() => logContactRequest('email')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: '#1e40af',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dbeafe'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#eff6ff'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
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
                onClick={() => logContactRequest('instagram')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: '#fdf2f8',
                  border: '1px solid #f9a8d4',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: '#9f1239',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fce7f3'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fdf2f8'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
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
              background: 'white',
              borderRadius: '1rem',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              maxWidth: '500px',
              width: 'calc(100% - 1rem)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💬</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? '¿Cómo te fue?' : 'How was it?'}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {lang === 'es' 
                  ? 'Tu feedback nos ayuda a mejorar MasteringReady'
                  : 'Your feedback helps us improve MasteringReady'}
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
                        height: 'clamp(2.5rem, 8vw, 2.75rem)',
                        borderRadius: '0.5rem',
                        border: feedback.rating === num ? '2px solid #667eea' : '1px solid #d1d5db',
                        background: feedback.rating === num ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                        color: feedback.rating === num ? 'white' : '#374151',
                        fontWeight: '600',
                        fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (feedback.rating !== num) {
                          e.currentTarget.style.borderColor = '#667eea'
                          e.currentTarget.style.transform = 'scale(1.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (feedback.rating !== num) {
                          e.currentTarget.style.borderColor = '#d1d5db'
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
                  color: '#6b7280',
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
                  <span style={{ color: '#ef4444' }}> *</span>
                </label>
                <textarea
                  value={feedback.liked}
                  onChange={(e) => setFeedback({...feedback, liked: e.target.value})}
                  placeholder={lang === 'es' ? 'Ej: La velocidad del análisis...' : 'E.g: The analysis speed...'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
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
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}> ({lang === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <textarea
                  value={feedback.change}
                  onChange={(e) => setFeedback({...feedback, change: e.target.value})}
                  placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
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
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}> ({lang === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <textarea
                  value={feedback.add}
                  onChange={(e) => setFeedback({...feedback, add: e.target.value})}
                  placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                onClick={() => {
                  const feedbackText = `FEEDBACK - MasteringReady\n\n⭐ Utilidad: ${feedback.rating}/10\n\n✅ Qué gustó:\n${feedback.liked}\n\n🔄 Qué cambiaría:\n${feedback.change || 'N/A'}\n\n➕ Qué agregaría:\n${feedback.add || 'N/A'}\n\nScore obtenido: ${result?.score || 'N/A'}/100`
                  window.open(`https://wa.me/573155576115?text=${encodeURIComponent(feedbackText)}`, '_blank')
                  setFeedbackSubmitted(true)
                  setShowFeedbackModal(false)
                }}
                disabled={!feedback.liked || feedback.rating === 0}
                style={{
                  background: (feedback.liked && feedback.rating > 0) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#d1d5db',
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            background: 'white',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
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
                color: '#6b7280',
                padding: '0.25rem'
              }}
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
                <AlertTriangle size={24} style={{ color: '#dc2626' }} />
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.375rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '0.75rem',
              color: '#111827'
            }}>
              {lang === 'es' ? 'Ya usaste tus análisis gratis' : 'You already used your free analyses'}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              {lang === 'es'
                ? 'Cada dispositivo tiene 2 análisis gratis. Crea una cuenta para continuar analizando tus mixes.'
                : 'Each device gets 2 free analyses. Create an account to continue analyzing your mixes.'}
            </p>

            {/* Benefits reminder */}
            <div style={{
              background: '#f3f4f6',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                {lang === 'es' ? 'Con una cuenta gratis obtienes:' : 'With a free account you get:'}
              </p>
              <ul style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                lineHeight: '1.6'
              }}>
                <li>{lang === 'es' ? '2 análisis adicionales gratis' : '2 additional free analyses'}</li>
                <li>{lang === 'es' ? 'Historial de análisis' : 'Analysis history'}</li>
                <li>{lang === 'es' ? 'Descargas en .txt' : '.txt downloads'}</li>
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  color: '#667eea',
                  textAlign: 'center',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: '2px solid #667eea',
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
            background: 'white',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
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
              color: '#111827'
            }}>
              {lang === 'es' ? 'Has usado tus 2 análisis gratuitos' : "You've used your 2 free analyses"}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
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
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid #c4b5fd'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#5b21b6',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                MasteringReady Pro - {proPrice.showLocal ? (
                  <>~{proPrice.formattedLocal}/{lang === 'es' ? 'mes' : 'mo'}</>
                ) : (
                  <>{proPrice.formatted}/{lang === 'es' ? 'mes' : 'mo'}</>
                )}
              </p>
              {proPrice.showLocal && (
                <p style={{
                  fontSize: '0.7rem',
                  color: '#7c3aed',
                  marginBottom: '0.5rem',
                  fontStyle: 'italic'
                }}>
                  ({proPrice.formatted} USD)
                </p>
              )}
              <ul style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.875rem',
                color: '#7c3aed',
                lineHeight: '1.6'
              }}>
                <li>{lang === 'es' ? '30 análisis al mes' : '30 analyses per month'}</li>
                <li>{lang === 'es' ? 'Reportes PDF completos' : 'Full PDF reports'}</li>
                <li>{lang === 'es' ? 'Procesamiento prioritario' : 'Priority processing'}</li>
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  color: '#667eea',
                  textAlign: 'center',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: '2px solid #667eea',
                  boxSizing: 'border-box'
                }}
              >
                {lang === 'es' ? 'Comprar 1 análisis' : 'Buy 1 analysis'} ({singlePrice.showLocal ? `~${singlePrice.formattedLocal}` : singlePrice.formatted})
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
            background: 'white',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
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
                color: '#6b7280',
                padding: '0.25rem'
              }}
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
              color: '#111827'
            }}>
              {lang === 'es' ? 'VPN o Proxy detectado' : 'VPN or Proxy detected'}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
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
                color: '#9ca3af',
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}>
                {lang === 'es' ? 'Servicio detectado: ' : 'Detected service: '}{vpnServiceName}
              </p>
            )}

            {/* Alternative */}
            <div style={{
              background: '#f3f4f6',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
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
                  background: '#374151',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: 'none',
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            background: 'white',
            borderRadius: '1rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            maxWidth: '420px',
            width: 'calc(100% - 1rem)',
            position: 'relative',
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
                color: '#6b7280',
                padding: '0.25rem'
              }}
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
              color: '#111827'
            }}>
              {lang === 'es' ? 'Desbloquea el Análisis Completo' : 'Unlock Complete Analysis'}
            </h3>

            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {lang === 'es'
                ? 'Accede al análisis completo, descarga de PDFs y más con MasteringReady Pro'
                : 'Access complete analysis, PDF downloads and more with MasteringReady Pro'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                lang === 'es' ? '30 análisis al mes' : '30 analyses per month',
                lang === 'es' ? 'Análisis Completo y Detallado' : 'Complete & Detailed Analysis',
                lang === 'es' ? 'Descarga de PDFs profesionales' : 'Professional PDF downloads',
                lang === 'es' ? 'Procesamiento prioritario' : 'Priority processing'
              ].map((benefit, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  <span style={{ fontSize: '0.9rem', color: '#374151' }}>{benefit}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              {proPrice.showLocal ? (
                <>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827' }}>
                    ~{proPrice.formattedLocal}
                  </span>
                  <span style={{ fontSize: '1rem', color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                    ({proPrice.formatted}/{lang === 'es' ? 'mes' : 'month'})
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginTop: '0.25rem' }}>
                    {lang === 'es' ? 'Cobro en USD' : 'Charged in USD'}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {proPrice.formatted}/{lang === 'es' ? 'mes' : 'month'}
                </span>
              )}
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

        /* Features Section */
        .features-section {
          padding: 1.75rem 1.5rem;
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
          
          /* Features Section */
          .features-section {
            padding: 1.125rem 1.5rem 2rem 1.5rem;
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

