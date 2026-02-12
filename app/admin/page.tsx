'use client'

/**
 * Admin Dashboard / Panel de Administración
 * Global view of platform health, users, analyses, revenue, and feedback.
 * Bilingual: ES LATAM Neutro + US English
 */

import { useState, useEffect, useCallback, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import {
  Users, BarChart3, DollarSign, MessageSquare, Activity,
  Search, ChevronDown, ChevronUp, ArrowLeft, RefreshCw,
  Filter, CheckCircle, Clock, AlertCircle, Crown,
  TrendingUp, FileAudio, Globe, Eye, X, ArrowUpDown,
  Music, Shield, Target, Mail, Lock, EyeOff, LogOut
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type AdminTab = 'overview' | 'users' | 'analytics' | 'revenue' | 'leads' | 'feedback'

interface KpiData {
  totalUsers: number
  totalAnalyses: number
  activeProSubscriptions: number
  revenueThisMonth: number
  analysesToday: number
  avgScore: number
}

interface StatsData {
  kpi: KpiData
  scoreDistribution: { range: string; count: number; color: string }[]
  verdictDistribution: { verdict: string; count: number; color: string }[]
  formatBreakdown: { format: string; count: number }[]
  topCountries: { country: string; count: number }[]
  analysesPerDay: { date: string; count: number }[]
  revenueBreakdown: { subscriptions: number; single: number; addon: number }
  satisfaction?: { thumbsUp: number; thumbsDown: number; total: number; rate: number }
  ctaStats?: { totalClicks: number; clickRate: number; byType: { type: string; count: number }[]; byScore: { range: string; count: number }[]; topCountries: { country: string; count: number }[] }
  contactStats?: { totalContacts: number; conversionRate: number; byMethod: { method: string; count: number }[] }
  performance?: {
    avgProcessingTime: number
    fastestAnalysis: number
    longestAnalysis: number
    chunkedPct: number
    totalMeasured: number
  }
  fileStats?: {
    avgDuration: number
    avgFileSize: number
    totalWithDuration: number
    totalWithSize: number
  }
  engagement?: {
    activeUsers7d: number
    activeUsers30d: number
    usersWithMultiple: number
    usersWithMultiplePct: number
    totalProfiles: number
  }
  technicalInsights?: {
    spectral: {
      overall: Record<string, number>
      byScore: Record<string, { avg: Record<string, number>; count: number }>
      totalAnalyzed: number
    }
    categoricalFlags: {
      total: number
      headroomOk: { count: number; pct: number }
      truePeakSafe: { count: number; pct: number }
      dynamicOk: { count: number; pct: number }
      stereoRiskNone: { count: number; pct: number }
      stereoRiskMild: { count: number; pct: number }
      stereoRiskHigh: { count: number; pct: number }
    }
    energy: {
      totalAnalyzed: number
      avgPeakPositionPct: number
      avgDistribution: { low: number; mid: number; high: number }
    }
  }
}

interface UserRow {
  id: string
  email: string
  full_name: string | null
  total_analyses: number
  analyses_this_month: number
  analyses_lifetime_used: number
  detected_country_code: string | null
  created_at: string
  subscription?: {
    status: string
    current_period_end: string
    analyses_used_this_cycle: number
    plan?: { name: string; type: string }
  }
}

interface PaymentRow {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  created_at: string
  profile?: { email: string; full_name: string | null }
}

interface FeedbackRow {
  id: string
  category: string
  subject: string
  message: string
  lang: string
  satisfaction: string | null
  status: string
  admin_notes: string | null
  response_es: string | null
  response_en: string | null
  responded_at: string | null
  is_priority: boolean
  created_at: string
  user?: { email: string; full_name: string | null }
  rating_bool?: boolean | null
  feedback_type?: string
  client_country?: string | null
}

interface LeadRow {
  id: string
  user_id: string | null
  analysis_id: string | null
  name: string | null
  email: string | null
  message: string | null
  cta_source: string | null
  contact_method: string
  client_country: string | null
  created_at: string
  profile?: { email: string; full_name: string | null }
  analysis?: { filename: string; score: number; verdict: string }
}

interface LeadsKpi {
  total: number
  thisMonth: number
  byMethod: { method: string; count: number }[]
  bySource: { source: string; count: number }[]
  conversionRate: number
  totalAnalyses: number
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations = {
  es: {
    adminPanel: 'Panel de Administración',
    backToHome: 'Volver al inicio',
    logout: 'Cerrar sesión',
    tabs: {
      overview: 'Vista general',
      users: 'Usuarios',
      analytics: 'Analíticas',
      revenue: 'Ingresos',
      leads: 'Leads',
      feedback: 'Retroalimentación'
    },
    kpi: {
      totalUsers: 'Usuarios totales',
      totalAnalyses: 'Análisis totales',
      activeProSubs: 'Suscripciones Pro activas',
      revenueThisMonth: 'Ingresos este mes',
      analysesToday: 'Análisis hoy',
      avgScore: 'Puntuación promedio'
    },
    users: {
      search: 'Buscar por correo o nombre...',
      email: 'Correo',
      name: 'Nombre',
      plan: 'Plan',
      totalAnalyses: 'Análisis',
      country: 'País',
      joined: 'Registro',
      noUsers: 'No se encontraron usuarios',
      lifetime: 'Gratis usados',
      thisMonth: 'Este mes',
      subscription: 'Suscripción',
      status: 'Estado',
      periodEnd: 'Fin del periodo',
      usedThisCycle: 'Usados este ciclo'
    },
    analytics: {
      analysesPerDay: 'Análisis por día (últimos 30 días)',
      scoreDistribution: 'Distribución de puntuaciones',
      verdictDistribution: 'Distribución de veredictos',
      formatBreakdown: 'Formatos de archivo',
      topCountries: 'Principales países',
      noData: 'Sin datos disponibles',
      conversionTitle: 'Métricas de conversión',
      satisfactionRate: 'Tasa de satisfacción',
      ctaClicks: 'Clics en CTA',
      contactConversion: 'Conversión a contacto',
      ctaByType: 'CTA por tipo',
      ctaByScore: 'CTA por rango de puntuación',
      contactByMethod: 'Contactos por método',
      techInsightsTitle: 'Insights técnicos',
      spectralProfile: 'Perfil espectral promedio',
      spectralByScore: 'Perfil espectral por rango de puntuación',
      categoricalFlags: 'Estado técnico de las mezclas',
      headroomOk: 'Headroom correcto',
      truePeakSafe: 'True Peak seguro',
      dynamicOk: 'Dinámica aceptable',
      stereoOk: 'Estéreo sin riesgo',
      stereoMild: 'Riesgo estéreo leve',
      stereoHigh: 'Riesgo estéreo alto',
      ofAnalyses: 'de los análisis',
      energyPatterns: 'Patrones de energía',
      avgPeakPosition: 'Posición promedio del pico de energía',
      energyDistribution: 'Distribución temporal de energía',
      beginning: 'Inicio',
      middle: 'Medio',
      end: 'Final',
      ofTrack: 'del track',
      performanceTitle: 'Rendimiento',
      avgProcessingTime: 'Tiempo promedio de análisis',
      fastestAnalysis: 'Análisis más rápido',
      longestAnalysis: 'Análisis más largo',
      chunkedPct: 'Análisis fragmentados',
      filesTitle: 'Archivos',
      avgDuration: 'Duración promedio',
      avgFileSize: 'Tamaño promedio',
      engagementTitle: 'Engagement',
      activeUsers7d: 'Usuarios activos (7d)',
      activeUsers30d: 'Usuarios activos (30d)',
      usersWithMultiple: 'Usuarios con >1 análisis',
      seconds: 'segundos'
    },
    verdicts: {
      ready: 'Listo para mastering',
      almost_ready: 'Casi listo',
      needs_work: 'Necesita trabajo',
      critical: 'Margen comprometido'
    },
    revenue: {
      monthlyRevenue: 'Ingresos mensuales',
      subscriptions: 'Suscripciones',
      singlePurchases: 'Compras individuales',
      addonPacks: 'Packs adicionales',
      recentPayments: 'Pagos recientes',
      amount: 'Monto',
      type: 'Tipo',
      status: 'Estado',
      date: 'Fecha',
      user: 'Usuario',
      noPayments: 'No hay pagos registrados'
    },
    leads: {
      title: 'Solicitudes de contacto',
      totalLeads: 'Leads totales',
      thisMonth: 'Este mes',
      conversionRate: 'Tasa de conversión',
      byMethod: 'Por método',
      allMethods: 'Todos',
      allDates: 'Todo el tiempo',
      today: 'Hoy',
      thisWeek: 'Esta semana',
      thisMonthFilter: 'Este mes',
      method: 'Método',
      date: 'Fecha',
      user: 'Usuario',
      lastAnalysis: 'Último análisis',
      score: 'Score',
      country: 'País',
      source: 'Origen',
      noLeads: 'No hay solicitudes de contacto',
      mastering: 'Masterizar track',
      mixHelp: 'Ayuda con mezcla',
      unknown: 'Desconocido',
      ofAnalyses: 'de los análisis'
    },
    feedback: {
      all: 'Todos',
      new: 'Nuevos',
      read: 'Leídos',
      in_progress: 'En progreso',
      resolved: 'Resueltos',
      respond: 'Responder',
      markAsRead: 'Marcar como leído',
      resolve: 'Resolver',
      adminNotes: 'Notas internas',
      responseEs: 'Respuesta (español)',
      responseEn: 'Respuesta (inglés)',
      send: 'Enviar',
      cancel: 'Cancelar',
      noFeedback: 'No hay retroalimentación',
      priority: 'Prioritario',
      wantsResponse: 'Quiere respuesta',
      categories: {
        bug: 'Error',
        feature: 'Función',
        improvement: 'Mejora',
        praise: 'Elogio',
        question: 'Pregunta',
        other: 'Otro'
      }
    },
    loading: 'Cargando...',
    refresh: 'Actualizar',
    fetchError: 'Error al cargar datos. Intenta actualizar.',
    accessDenied: 'Acceso restringido',
    accessDeniedMsg: 'No tienes permisos de administrador.',
    loginRequired: 'Iniciar sesión',
    loginRequiredMsg: 'Inicia sesión para acceder al panel de administración.',
    loginButton: 'Iniciar sesión'
  },
  en: {
    adminPanel: 'Admin Panel',
    backToHome: 'Back to home',
    logout: 'Sign out',
    tabs: {
      overview: 'Overview',
      users: 'Users',
      analytics: 'Analytics',
      revenue: 'Revenue',
      leads: 'Leads',
      feedback: 'Feedback'
    },
    kpi: {
      totalUsers: 'Total Users',
      totalAnalyses: 'Total Analyses',
      activeProSubs: 'Active Pro Subscriptions',
      revenueThisMonth: 'Revenue This Month',
      analysesToday: 'Analyses Today',
      avgScore: 'Average Score'
    },
    users: {
      search: 'Search by email or name...',
      email: 'Email',
      name: 'Name',
      plan: 'Plan',
      totalAnalyses: 'Analyses',
      country: 'Country',
      joined: 'Joined',
      noUsers: 'No users found',
      lifetime: 'Free used',
      thisMonth: 'This month',
      subscription: 'Subscription',
      status: 'Status',
      periodEnd: 'Period end',
      usedThisCycle: 'Used this cycle'
    },
    analytics: {
      analysesPerDay: 'Analyses per day (last 30 days)',
      scoreDistribution: 'Score Distribution',
      verdictDistribution: 'Verdict Distribution',
      formatBreakdown: 'File Formats',
      topCountries: 'Top Countries',
      noData: 'No data available',
      conversionTitle: 'Conversion Metrics',
      satisfactionRate: 'Satisfaction Rate',
      ctaClicks: 'CTA Clicks',
      contactConversion: 'Contact Conversion',
      ctaByType: 'CTA by Type',
      ctaByScore: 'CTA by Score Range',
      contactByMethod: 'Contacts by Method',
      techInsightsTitle: 'Technical Insights',
      spectralProfile: 'Average Spectral Profile',
      spectralByScore: 'Spectral Profile by Score Range',
      categoricalFlags: 'Mix Technical Status',
      headroomOk: 'Headroom OK',
      truePeakSafe: 'True Peak Safe',
      dynamicOk: 'Dynamics OK',
      stereoOk: 'Stereo No Risk',
      stereoMild: 'Stereo Mild Risk',
      stereoHigh: 'Stereo High Risk',
      ofAnalyses: 'of analyses',
      energyPatterns: 'Energy Patterns',
      avgPeakPosition: 'Average Peak Energy Position',
      energyDistribution: 'Temporal Energy Distribution',
      beginning: 'Beginning',
      middle: 'Middle',
      end: 'End',
      ofTrack: 'of track',
      performanceTitle: 'Performance',
      avgProcessingTime: 'Avg Analysis Time',
      fastestAnalysis: 'Fastest Analysis',
      longestAnalysis: 'Longest Analysis',
      chunkedPct: 'Chunked Analyses',
      filesTitle: 'Files',
      avgDuration: 'Avg Duration',
      avgFileSize: 'Avg Size',
      engagementTitle: 'Engagement',
      activeUsers7d: 'Active Users (7d)',
      activeUsers30d: 'Active Users (30d)',
      usersWithMultiple: 'Users with >1 analysis',
      seconds: 'seconds'
    },
    verdicts: {
      ready: 'Ready for mastering',
      almost_ready: 'Almost ready',
      needs_work: 'Needs work',
      critical: 'Compromised margin'
    },
    revenue: {
      monthlyRevenue: 'Monthly Revenue',
      subscriptions: 'Subscriptions',
      singlePurchases: 'Single Purchases',
      addonPacks: 'Add-on Packs',
      recentPayments: 'Recent Payments',
      amount: 'Amount',
      type: 'Type',
      status: 'Status',
      date: 'Date',
      user: 'User',
      noPayments: 'No payments recorded'
    },
    leads: {
      title: 'Contact Requests',
      totalLeads: 'Total Leads',
      thisMonth: 'This Month',
      conversionRate: 'Conversion Rate',
      byMethod: 'By Method',
      allMethods: 'All',
      allDates: 'All time',
      today: 'Today',
      thisWeek: 'This week',
      thisMonthFilter: 'This month',
      method: 'Method',
      date: 'Date',
      user: 'User',
      lastAnalysis: 'Last Analysis',
      score: 'Score',
      country: 'Country',
      source: 'Source',
      noLeads: 'No contact requests',
      mastering: 'Master track',
      mixHelp: 'Mix help',
      unknown: 'Unknown',
      ofAnalyses: 'of analyses'
    },
    feedback: {
      all: 'All',
      new: 'New',
      read: 'Read',
      in_progress: 'In progress',
      resolved: 'Resolved',
      respond: 'Respond',
      markAsRead: 'Mark as read',
      resolve: 'Resolve',
      adminNotes: 'Internal notes',
      responseEs: 'Response (Spanish)',
      responseEn: 'Response (English)',
      send: 'Send',
      cancel: 'Cancel',
      noFeedback: 'No feedback',
      priority: 'Priority',
      wantsResponse: 'Wants response',
      categories: {
        bug: 'Bug',
        feature: 'Feature',
        improvement: 'Improvement',
        praise: 'Praise',
        question: 'Question',
        other: 'Other'
      }
    },
    loading: 'Loading...',
    refresh: 'Refresh',
    fetchError: 'Failed to load data. Try refreshing.',
    accessDenied: 'Access Denied',
    accessDeniedMsg: 'You do not have admin permissions.',
    loginRequired: 'Log in',
    loginRequiredMsg: 'Log in to access the admin panel.',
    loginButton: 'Log in'
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string, lang: 'es' | 'en'): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDurationMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'succeeded': case 'active': case 'resolved': return '#10b981'
    case 'pending': case 'new': case 'trialing': return '#f59e0b'
    case 'failed': case 'critical': return '#ef4444'
    case 'refunded': case 'canceled': case 'wont_fix': return '#6b7280'
    case 'read': case 'in_progress': return '#3b82f6'
    default: return '#6b7280'
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'bug': return '#ef4444'
    case 'feature': return '#8b5cf6'
    case 'improvement': return '#3b82f6'
    case 'praise': return '#10b981'
    case 'question': return '#f59e0b'
    default: return '#6b7280'
  }
}

// ============================================================================
// ADMIN LOGIN FORM (inline — stays on /admin after auth)
// ============================================================================

function AdminLoginForm({ lang }: { lang: 'es' | 'en' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const t = lang === 'es' ? {
    title: 'Panel de administración',
    subtitle: 'Inicia sesión para acceder',
    email: 'Correo electrónico',
    password: 'Contraseña',
    button: 'Iniciar sesión',
    loggingIn: 'Verificando...',
    invalid: 'Credenciales inválidas',
    error: 'Error. Intenta de nuevo.'
  } : {
    title: 'Admin panel',
    subtitle: 'Sign in to access',
    email: 'Email address',
    password: 'Password',
    button: 'Sign in',
    loggingIn: 'Verifying...',
    invalid: 'Invalid credentials',
    error: 'Error. Please try again.'
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (signInError) {
        setError(signInError.message.includes('Invalid login credentials')
          ? t.invalid : signInError.message)
        setLoading(false)
        return
      }
      // Success — onAuthStateChange will update user state and re-render AdminPage
    } catch {
      setError(t.error)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '2.5rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        maxWidth: '380px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Shield size={40} style={{ color: '#667eea', marginBottom: '0.75rem' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
            {t.title}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '0.75rem',
              fontSize: '0.8rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.email}
              required
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

          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.password}
              required
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
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? t.loggingIn : t.button}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminPage() {
  const { user, session, loading: authLoading } = useAuth()

  // UI state
  const [lang, setLang] = useState<'es' | 'en'>('es')

  useEffect(() => {
    setLang(detectLanguage())
  }, [])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [isMobile, setIsMobile] = useState(false)
  const [chartTooltip, setChartTooltip] = useState<{ x: number; y: number; content: string } | null>(null)

  // Data state
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userSort, setUserSort] = useState<{ field: string; asc: boolean }>({ field: 'created_at', asc: false })
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userAnalyses, setUserAnalyses] = useState<any[]>([])
  const [userAnalysesLoading, setUserAnalysesLoading] = useState(false)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [leadsList, setLeadsList] = useState<LeadRow[]>([])
  const [leadsKpi, setLeadsKpi] = useState<LeadsKpi | null>(null)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsMethodFilter, setLeadsMethodFilter] = useState('all')
  const [leadsDateFilter, setLeadsDateFilter] = useState('all')
  const [feedbackList, setFeedbackList] = useState<FeedbackRow[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedbackFilter, setFeedbackFilter] = useState('all')
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseEs, setResponseEs] = useState('')
  const [responseEn, setResponseEn] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const t = translations[lang]

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auth guard + admin check
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setIsAdmin(false)
      setAdminChecked(true)
      return
    }

    // Reset before async check — prevents "Access Denied" flash
    // when transitioning from no-user (adminChecked=true) to logged-in
    setAdminChecked(false)

    const checkAdmin = async () => {
      try {
        // Query own profile directly via browser client (RLS allows reading own row)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          const row = profile as Record<string, unknown>
          if (row.is_admin === true) {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
          }
        }
      } catch {
        // Not admin or error
        setIsAdmin(false)
      }
      setAdminChecked(true)
    }

    checkAdmin()
  }, [user?.id, authLoading])

  // Helper: get auth headers for API calls (uses session from context, not singleton)
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    }
    return { 'Content-Type': 'application/json' }
  }, [session?.access_token])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/admin/stats', { headers })
      if (res.ok) {
        const data = await res.json()
        setStatsData(data)
        setFetchError(null)
      } else {
        setFetchError(t.fetchError)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setFetchError(t.fetchError)
    }
    setStatsLoading(false)
  }, [getAuthHeaders])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, email, full_name, total_analyses, analyses_this_month,
          analyses_lifetime_used, detected_country_code, created_at
        `)
        .order(userSort.field, { ascending: userSort.asc })
        .limit(100)

      if (userSearch.trim()) {
        query = query.or(`email.ilike.%${userSearch.trim()}%,full_name.ilike.%${userSearch.trim()}%`)
      }

      const { data } = await query
      if (data) {
        // Fetch subscriptions for these users
        const userIds = data.map(u => u.id)
        const { data: subs } = await supabase
          .from('subscriptions')
          .select(`
            user_id, status, current_period_end, analyses_used_this_cycle,
            plan:plans(name, type)
          `)
          .in('user_id', userIds)

        const subsMap: Record<string, UserRow['subscription']> = {}
        if (subs) {
          subs.forEach((s: Record<string, unknown>) => {
            const plan = s.plan as { name: string; type: string } | null
            subsMap[s.user_id as string] = {
              status: s.status as string,
              current_period_end: s.current_period_end as string,
              analyses_used_this_cycle: s.analyses_used_this_cycle as number,
              plan: plan || undefined
            }
          })
        }

        setUsers(data.map(u => ({
          ...u,
          subscription: subsMap[u.id]
        })))
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setFetchError(t.fetchError)
    }
    setUsersLoading(false)
  }, [userSearch, userSort.field, userSort.asc])

  // Fetch analyses for a specific user
  const fetchUserAnalyses = useCallback(async (userId: string) => {
    setUserAnalysesLoading(true)
    try {
      const { data } = await supabase
        .from('analyses')
        .select('id, filename, score, verdict, file_format, sample_rate, bit_depth, duration_seconds, file_size_bytes, spectral_6band, categorical_flags, created_at, analysis_version')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)
      setUserAnalyses(data || [])
    } catch (err) {
      console.error('Failed to fetch user analyses:', err)
    }
    setUserAnalysesLoading(false)
  }, [])

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true)
    try {
      const { data } = await supabase
        .from('payments')
        .select(`
          id, amount, currency, status, description, created_at,
          profile:profiles(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setPayments(data.map((p: Record<string, unknown>) => {
          const profile = p.profile as { email: string; full_name: string | null } | null
          return {
            id: p.id as string,
            amount: p.amount as number,
            currency: p.currency as string,
            status: p.status as string,
            description: p.description as string | null,
            created_at: p.created_at as string,
            profile: profile || undefined
          }
        }))
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err)
      setFetchError(t.fetchError)
    }
    setPaymentsLoading(false)
  }, [])

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true)
    try {
      let query = supabase
        .from('user_feedback')
        .select(`
          id, category, subject, message, lang, satisfaction, status,
          admin_notes, response_es, response_en, responded_at,
          is_priority, created_at, rating_bool, feedback_type, client_country,
          user:profiles(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (feedbackFilter !== 'all') {
        query = query.eq('status', feedbackFilter)
      }

      const { data } = await query

      if (data) {
        setFeedbackList(data.map((f: Record<string, unknown>) => {
          const fbUser = f.user as { email: string; full_name: string | null } | null
          return {
            id: f.id as string,
            category: f.category as string,
            subject: f.subject as string,
            message: f.message as string,
            lang: f.lang as string,
            satisfaction: f.satisfaction as string | null,
            status: f.status as string,
            admin_notes: f.admin_notes as string | null,
            response_es: f.response_es as string | null,
            response_en: f.response_en as string | null,
            responded_at: f.responded_at as string | null,
            is_priority: f.is_priority as boolean,
            created_at: f.created_at as string,
            user: fbUser || undefined,
            rating_bool: f.rating_bool as boolean | null | undefined,
            feedback_type: f.feedback_type as string | undefined,
            client_country: f.client_country as string | null | undefined
          }
        }))
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err)
      setFetchError(t.fetchError)
    }
    setFeedbackLoading(false)
  }, [feedbackFilter])

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/admin/leads', { headers })
      if (res.ok) {
        const data = await res.json()
        setLeadsList(data.leads || [])
        setLeadsKpi(data.kpi || null)
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err)
      setFetchError(t.fetchError)
    }
    setLeadsLoading(false)
  }, [getAuthHeaders])

  // Load data on tab change
  useEffect(() => {
    if (!isAdmin) return

    switch (activeTab) {
      case 'overview':
      case 'analytics':
        if (!statsData) fetchStats()
        break
      case 'users':
        fetchUsers()
        break
      case 'revenue':
        if (!statsData) fetchStats()
        fetchPayments()
        break
      case 'leads':
        fetchLeads()
        break
      case 'feedback':
        fetchFeedback()
        break
    }
  }, [activeTab, isAdmin, fetchStats, fetchUsers, fetchPayments, fetchLeads, fetchFeedback, statsData])

  // Refetch users when search/sort changes
  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      const timer = setTimeout(() => fetchUsers(), 300)
      return () => clearTimeout(timer)
    }
  }, [userSearch, userSort.field, userSort.asc, isAdmin, activeTab, fetchUsers])

  // Refetch feedback when filter changes
  useEffect(() => {
    if (isAdmin && activeTab === 'feedback') {
      fetchFeedback()
    }
  }, [feedbackFilter, isAdmin, activeTab, fetchFeedback])

  // Safety timeout — if initial fetch hangs (stale connections from SPA navigation), auto-reload
  useEffect(() => {
    if (!statsLoading) return
    const timeout = setTimeout(() => {
      console.warn('[Admin] Fetch stalled — reloading page')
      window.location.reload()
    }, 8000)
    return () => clearTimeout(timeout)
  }, [statsLoading])

  // Handle feedback update
  const handleFeedbackUpdate = async (feedbackId: string, updates: Record<string, unknown>) => {
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ feedbackId, ...updates })
      })
      if (res.ok) {
        fetchFeedback()
        setRespondingTo(null)
        setResponseEs('')
        setResponseEn('')
        setAdminNotes('')
      }
    } catch (err) {
      console.error('Failed to update feedback:', err)
    }
  }

  // Toggle user sort
  const toggleSort = (field: string) => {
    setUserSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : false
    }))
  }

  // Loading state
  if (authLoading || !adminChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={48} style={{ color: '#667eea', marginBottom: '1rem' }} />
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>{t.loading}</p>
        </div>
      </div>
    )
  }

  // Not logged in - show inline login form (stays on /admin after auth)
  if (adminChecked && !user) {
    return <AdminLoginForm lang={lang} />
  }

  // Access denied (logged in but not admin)
  if (adminChecked && !isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          background: 'white',
          borderRadius: '1rem',
          padding: '3rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
            {t.accessDenied}
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{t.accessDeniedMsg}</p>
          <Link href="/" style={{
            color: '#667eea',
            textDecoration: 'none',
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ArrowLeft size={18} />
            {t.backToHome}
          </Link>
        </div>
      </div>
    )
  }

  // Tab definitions
  const tabs: { key: AdminTab; icon: typeof Activity; label: string }[] = [
    { key: 'overview', icon: Activity, label: t.tabs.overview },
    { key: 'users', icon: Users, label: t.tabs.users },
    { key: 'analytics', icon: BarChart3, label: t.tabs.analytics },
    { key: 'revenue', icon: DollarSign, label: t.tabs.revenue },
    { key: 'leads', icon: Target, label: t.tabs.leads },
    { key: 'feedback', icon: MessageSquare, label: t.tabs.feedback }
  ]

  // ============================================================================
  // RENDER: OVERVIEW TAB
  // ============================================================================

  const renderOverview = () => {
    const kpi = statsData?.kpi
    const kpiCards = [
      { label: t.kpi.totalUsers, value: kpi?.totalUsers ?? '-', icon: Users, color: '#667eea' },
      { label: t.kpi.totalAnalyses, value: kpi?.totalAnalyses ?? '-', icon: FileAudio, color: '#764ba2' },
      { label: t.kpi.activeProSubs, value: kpi?.activeProSubscriptions ?? '-', icon: Crown, color: '#f59e0b' },
      { label: t.kpi.revenueThisMonth, value: kpi ? formatCurrency(kpi.revenueThisMonth) : '-', icon: DollarSign, color: '#10b981' },
      { label: t.kpi.analysesToday, value: kpi?.analysesToday ?? '-', icon: Activity, color: '#3b82f6' },
      { label: t.kpi.avgScore, value: kpi ? `${kpi.avgScore}/100` : '-', icon: TrendingUp, color: '#8b5cf6' }
    ]

    return (
      <div>
        {/* Refresh button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            onClick={() => { setStatsData(null); fetchStats() }}
            disabled={statsLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              cursor: statsLoading ? 'not-allowed' : 'pointer',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <RefreshCw size={16} style={{ animation: statsLoading ? 'spin 1s linear infinite' : 'none' }} />
            {t.refresh}
          </button>
        </div>

        {/* KPI Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '160px' : '220px'}, 1fr))`,
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {kpiCards.map((card, i) => (
            <div key={i} style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem'
              }}>
                <card.icon size={20} style={{ color: card.color }} />
                <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500' }}>
                  {card.label}
                </span>
              </div>
              <p style={{
                fontSize: isMobile ? '1.25rem' : '1.75rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
                ...(statsLoading && !statsData && {
                  background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                  borderRadius: '0.25rem',
                  color: 'transparent',
                  minWidth: '4rem',
                  minHeight: '1.75rem'
                })
              }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Performance + Files + Engagement */}
        {statsData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Performance */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: '#3b82f6' }} />
                {t.analytics.performanceTitle}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.analytics.avgProcessingTime}</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0.125rem 0 0' }}>
                    {statsData.performance?.avgProcessingTime ?? '-'}
                    <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}> {t.analytics.seconds}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.analytics.fastestAnalysis}</span>
                    <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#10b981', margin: '0.125rem 0 0' }}>
                      {statsData.performance?.fastestAnalysis ?? '-'}s
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.analytics.longestAnalysis}</span>
                    <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f59e0b', margin: '0.125rem 0 0' }}>
                      {statsData.performance?.longestAnalysis ?? '-'}s
                    </p>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.analytics.chunkedPct}</span>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#8b5cf6', margin: '0.125rem 0 0' }}>
                    {statsData.performance?.chunkedPct ?? 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Files */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileAudio size={18} style={{ color: '#764ba2' }} />
                {t.analytics.filesTitle}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.analytics.avgDuration}</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0.125rem 0 0' }}>
                    {statsData.fileStats?.avgDuration ? formatDurationMmSs(statsData.fileStats.avgDuration) : '-'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.analytics.avgFileSize}</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0.125rem 0 0' }}>
                    {statsData.fileStats?.avgFileSize ?? '-'}
                    <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}> MB</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Engagement */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} style={{ color: '#10b981' }} />
                {t.analytics.engagementTitle}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.analytics.activeUsers7d}</span>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981', margin: '0.125rem 0 0' }}>
                      {statsData.engagement?.activeUsers7d ?? '-'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.analytics.activeUsers30d}</span>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6', margin: '0.125rem 0 0' }}>
                      {statsData.engagement?.activeUsers30d ?? '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.analytics.usersWithMultiple}</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0.125rem 0 0' }}>
                    {statsData.engagement?.usersWithMultiple ?? '-'}
                    <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}>
                      {' '}({statsData.engagement?.usersWithMultiplePct ?? 0}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick stats: Score + Verdict distribution side by side */}
        {statsData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1rem'
          }}>
            {/* Score Distribution */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                {t.analytics.scoreDistribution}
              </h3>
              {renderBarChart(statsData.scoreDistribution.map(s => ({
                label: s.range,
                value: s.count,
                color: s.color
              })))}
            </div>

            {/* Verdict Distribution */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                {t.analytics.verdictDistribution}
              </h3>
              {renderBarChart(statsData.verdictDistribution.map(v => ({
                label: t.verdicts[v.verdict as keyof typeof t.verdicts] || v.verdict,
                value: v.count,
                color: v.color
              })))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // RENDER: BAR CHART HELPER
  // ============================================================================

  const renderBarChart = (items: { label: string; value: number; color: string }[]) => {
    const maxValue = Math.max(...items.map(i => i.value), 1)
    const totalValue = items.reduce((sum, i) => sum + i.value, 0)

    return (
      <div>
        {items.map((item, i) => {
          const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0'
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.625rem'
            }}>
              <span style={{
                width: isMobile ? '60px' : '100px',
                fontSize: '0.8rem',
                color: '#374151',
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {item.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: '22px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setChartTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    content: `${item.label}: ${item.value} (${pct}%)`
                  })
                }}
                onMouseLeave={() => setChartTooltip(null)}
              >
                <div style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  height: '100%',
                  background: item.color,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                  minWidth: item.value > 0 ? '4px' : '0'
                }} />
              </div>
              <span style={{
                width: '40px',
                textAlign: 'right',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#111827',
                flexShrink: 0
              }}>
                {item.value}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // ============================================================================
  // RENDER: USERS TAB
  // ============================================================================

  const renderUsers = () => {
    const sortIcon = (field: string) => (
      <ArrowUpDown size={14} style={{
        color: userSort.field === field ? '#667eea' : '#9ca3af',
        cursor: 'pointer'
      }} />
    )

    const columnHeaderStyle = (field: string): React.CSSProperties => ({
      padding: '0.75rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      color: userSort.field === field ? '#667eea' : '#6b7280',
      textTransform: 'uppercase',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      userSelect: 'none'
    })

    return (
      <div>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'white',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <Search size={18} style={{ color: '#9ca3af' }} />
          <input
            type="text"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            placeholder={t.users.search}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.9rem',
              color: '#111827',
              background: 'transparent'
            }}
          />
          {userSearch && (
            <button onClick={() => setUserSearch('')} style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem'
            }}>
              <X size={16} style={{ color: '#9ca3af' }} />
            </button>
          )}
        </div>

        {/* Users Table */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Table header */}
          {!isMobile && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1fr 0.75fr 0.75fr 1fr',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <div style={columnHeaderStyle('email')} onClick={() => toggleSort('email')}>
                {t.users.email} {sortIcon('email')}
              </div>
              <div style={columnHeaderStyle('full_name')} onClick={() => toggleSort('full_name')}>
                {t.users.name} {sortIcon('full_name')}
              </div>
              <div style={columnHeaderStyle('plan')}>
                {t.users.plan}
              </div>
              <div style={columnHeaderStyle('total_analyses')} onClick={() => toggleSort('total_analyses')}>
                {t.users.totalAnalyses} {sortIcon('total_analyses')}
              </div>
              <div style={columnHeaderStyle('detected_country_code')}>
                {t.users.country}
              </div>
              <div style={columnHeaderStyle('created_at')} onClick={() => toggleSort('created_at')}>
                {t.users.joined} {sortIcon('created_at')}
              </div>
            </div>
          )}

          {/* User rows */}
          {usersLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              {t.loading}
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              {t.users.noUsers}
            </div>
          ) : (
            users.map(u => (
              <div key={u.id}>
                <div
                  onClick={() => {
                    const next = expandedUser === u.id ? null : u.id
                    setExpandedUser(next)
                    if (next) {
                      setUserAnalyses([])
                    }
                  }}
                  style={{
                    display: isMobile ? 'block' : 'grid',
                    gridTemplateColumns: isMobile ? undefined : '2fr 1.5fr 1fr 0.75fr 0.75fr 1fr',
                    padding: isMobile ? '1rem' : '0.75rem',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: expandedUser === u.id ? '#f9fafb' : 'white',
                    transition: 'background 0.15s'
                  }}
                >
                  {isMobile ? (
                    <>
                      <div style={{ fontWeight: '500', color: '#111827', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {u.email}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
                        <span>{u.subscription?.plan?.type || 'free'}</span>
                        <span>{u.total_analyses} {t.users.totalAnalyses.toLowerCase()}</span>
                        <span>{u.detected_country_code || '-'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.email}
                      </div>
                      <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {u.full_name || '-'}
                      </div>
                      <div style={{ padding: '0.75rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontWeight: '500',
                          background: u.subscription?.plan?.type === 'pro' ? '#fef3c7' : '#f3f4f6',
                          color: u.subscription?.plan?.type === 'pro' ? '#92400e' : '#374151'
                        }}>
                          {u.subscription?.plan?.type || 'free'}
                        </span>
                      </div>
                      <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151', textAlign: 'center' }}>
                        {u.total_analyses}
                      </div>
                      <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151', textAlign: 'center' }}>
                        {u.detected_country_code || '-'}
                      </div>
                      <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
                        {formatDate(u.created_at, lang)}
                      </div>
                    </>
                  )}
                </div>

                {/* Expanded user details */}
                {expandedUser === u.id && (
                  <div style={{
                    padding: '1rem 1.5rem',
                    background: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>ID</span>
                      <p style={{ fontSize: '0.8rem', color: '#374151', margin: '0.25rem 0 0', wordBreak: 'break-all' }}>{u.id}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                        {t.users.lifetime}
                      </span>
                      <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.25rem 0 0' }}>
                        {u.analyses_lifetime_used}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                        {t.users.thisMonth}
                      </span>
                      <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.25rem 0 0' }}>
                        {u.analyses_this_month}
                      </p>
                    </div>
                    {u.subscription && (
                      <>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                            {t.users.status}
                          </span>
                          <p style={{ margin: '0.25rem 0 0' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontWeight: '500',
                              background: getStatusColor(u.subscription.status) + '20',
                              color: getStatusColor(u.subscription.status)
                            }}>
                              {u.subscription.status}
                            </span>
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                            {t.users.periodEnd}
                          </span>
                          <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.25rem 0 0' }}>
                            {formatDate(u.subscription.current_period_end, lang)}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                            {t.users.usedThisCycle}
                          </span>
                          <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.25rem 0 0' }}>
                            {u.subscription.analyses_used_this_cycle}
                          </p>
                        </div>
                      </>
                    )}

                    {/* View Analyses Button */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fetchUserAnalyses(u.id)
                        }}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}
                      >
                        {lang === 'es' ? 'Ver análisis' : 'View analyses'} ({u.total_analyses})
                      </button>
                    </div>

                    {/* User Analyses List */}
                    {userAnalysesLoading && (
                      <div style={{ gridColumn: '1 / -1', color: '#6b7280', fontSize: '0.8rem' }}>
                        {t.loading}
                      </div>
                    )}
                    {userAnalyses.length > 0 && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {userAnalyses.map((a: any) => (
                          <div key={a.id} style={{
                            background: 'white',
                            borderRadius: '0.5rem',
                            padding: '0.75rem 1rem',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.8rem'
                          }}>
                            {/* Row 1: Filename, Score, Date */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                              <span style={{ fontWeight: '600', color: '#111827' }}>
                                {a.filename || t.leads.unknown}
                              </span>
                              <span style={{
                                fontWeight: '700',
                                color: a.score >= 85 ? '#10b981' : a.score >= 60 ? '#f59e0b' : '#ef4444'
                              }}>
                                {a.score}/100
                              </span>
                            </div>
                            {/* Row 2: File metadata */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                              {a.file_format && <span>{a.file_format.toUpperCase()}</span>}
                              {a.sample_rate && <span>{(a.sample_rate / 1000).toFixed(a.sample_rate % 1000 === 0 ? 0 : 1)} kHz</span>}
                              {a.bit_depth && <span>{a.bit_depth}-bit</span>}
                              {a.duration_seconds && <span>{Math.floor(a.duration_seconds / 60)}:{String(Math.round(a.duration_seconds % 60)).padStart(2, '0')}</span>}
                              {a.file_size_bytes && <span>{(a.file_size_bytes / 1048576).toFixed(1)} MB</span>}
                              <span style={{ color: '#9ca3af' }}>{formatDate(a.created_at, lang)}</span>
                              {a.analysis_version && <span style={{ color: '#9ca3af' }}>v{a.analysis_version}</span>}
                            </div>
                            {/* Row 3: Spectral 6-band */}
                            {a.spectral_6band && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <div style={{ display: 'flex', gap: '1px', height: '0.75rem', borderRadius: '0.25rem', overflow: 'hidden' }}>
                                  {['sub', 'low', 'low_mid', 'mid', 'high_mid', 'high'].map((band, i) => {
                                    const val = a.spectral_6band[band] || 0
                                    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
                                    return (
                                      <div
                                        key={band}
                                        title={`${band}: ${val}%`}
                                        style={{ width: `${val}%`, background: colors[i], minWidth: val > 0 ? '1px' : '0' }}
                                      />
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            {/* Row 4: Categorical flags */}
                            {a.categorical_flags && (
                              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '0.25rem',
                                  background: a.categorical_flags.headroom_ok ? '#ecfdf5' : '#fef2f2',
                                  color: a.categorical_flags.headroom_ok ? '#059669' : '#dc2626'
                                }}>
                                  Headroom {a.categorical_flags.headroom_ok ? 'OK' : 'X'}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '0.25rem',
                                  background: a.categorical_flags.true_peak_safe ? '#ecfdf5' : '#fef2f2',
                                  color: a.categorical_flags.true_peak_safe ? '#059669' : '#dc2626'
                                }}>
                                  TP {a.categorical_flags.true_peak_safe ? 'OK' : 'X'}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '0.25rem',
                                  background: a.categorical_flags.dynamic_ok ? '#ecfdf5' : '#fef2f2',
                                  color: a.categorical_flags.dynamic_ok ? '#059669' : '#dc2626'
                                }}>
                                  {lang === 'es' ? 'Dinámica' : 'Dynamics'} {a.categorical_flags.dynamic_ok ? 'OK' : 'X'}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '0.25rem',
                                  background: a.categorical_flags.stereo_risk === 'none' ? '#ecfdf5' : a.categorical_flags.stereo_risk === 'mild' ? '#fef9c3' : '#fef2f2',
                                  color: a.categorical_flags.stereo_risk === 'none' ? '#059669' : a.categorical_flags.stereo_risk === 'mild' ? '#92400e' : '#dc2626'
                                }}>
                                  Stereo {a.categorical_flags.stereo_risk === 'none' ? 'OK' : a.categorical_flags.stereo_risk}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER: ANALYTICS TAB
  // ============================================================================

  const renderAnalytics = () => {
    if (!statsData) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          {statsLoading ? t.loading : t.analytics.noData}
        </div>
      )
    }

    const maxDaily = Math.max(...statsData.analysesPerDay.map(d => d.count), 1)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Analyses per day */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            {t.analytics.analysesPerDay}
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            height: '120px',
            padding: '0.5rem 0'
          }}>
            {statsData.analysesPerDay.map((day, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max((day.count / maxDaily) * 100, 2)}%`,
                  background: day.count > 0
                    ? 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)'
                    : '#e5e7eb',
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 0.3s ease, opacity 0.15s ease',
                  cursor: 'pointer',
                  minWidth: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                  const rect = e.currentTarget.getBoundingClientRect()
                  setChartTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    content: `${day.date}: ${day.count} ${day.count === 1 ? 'analysis' : 'analyses'}`
                  })
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                  setChartTooltip(null)
                }}
              />
            ))}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: '#9ca3af',
            marginTop: '0.5rem'
          }}>
            <span>{statsData.analysesPerDay[0]?.date.slice(5)}</span>
            <span>{statsData.analysesPerDay[statsData.analysesPerDay.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Charts grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '1rem'
        }}>
          {/* Score Distribution */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.scoreDistribution}
            </h3>
            {renderBarChart(statsData.scoreDistribution.map(s => ({
              label: s.range,
              value: s.count,
              color: s.color
            })))}
          </div>

          {/* Verdict Distribution */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.verdictDistribution}
            </h3>
            {renderBarChart(statsData.verdictDistribution.map(v => ({
              label: t.verdicts[v.verdict as keyof typeof t.verdicts] || v.verdict,
              value: v.count,
              color: v.color
            })))}
          </div>

          {/* Format Breakdown */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.formatBreakdown}
            </h3>
            {renderBarChart(statsData.formatBreakdown.map(f => ({
              label: f.format.toUpperCase(),
              value: f.count,
              color: f.format === 'wav' ? '#3b82f6' : f.format === 'mp3' ? '#10b981' : f.format === 'aiff' ? '#8b5cf6' : '#6b7280'
            })))}
          </div>

          {/* Top Countries */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.topCountries}
            </h3>
            {statsData.topCountries.length > 0 ? renderBarChart(statsData.topCountries.map(c => ({
              label: c.country,
              value: c.count,
              color: '#667eea'
            }))) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
            )}
          </div>
        </div>

        {/* Conversion Metrics Section */}
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: '1rem' }}>
          {t.analytics.conversionTitle}
        </h3>

        {/* KPI Row: Satisfaction, CTA Clicks, Contact Conversion */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Satisfaction Rate */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {t.analytics.satisfactionRate}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: (statsData.satisfaction?.rate || 0) >= 70 ? '#10b981' : (statsData.satisfaction?.rate || 0) >= 40 ? '#f59e0b' : '#ef4444' }}>
              {statsData.satisfaction?.rate || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              👍 {statsData.satisfaction?.thumbsUp || 0} / 👎 {statsData.satisfaction?.thumbsDown || 0}
            </div>
          </div>

          {/* CTA Clicks */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {t.analytics.ctaClicks}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#6366f1' }}>
              {statsData.ctaStats?.totalClicks || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {statsData.ctaStats?.clickRate || 0}% {lang === 'es' ? 'de análisis' : 'of analyses'}
            </div>
          </div>

          {/* Contact Conversion */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {t.analytics.contactConversion}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
              {statsData.contactStats?.conversionRate || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {statsData.contactStats?.totalContacts || 0} {lang === 'es' ? 'contactos' : 'contacts'}
            </div>
          </div>
        </div>

        {/* Charts Row: CTA by Type + CTA by Score */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* CTA by Type */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.ctaByType}
            </h3>
            {(statsData.ctaStats?.byType || []).length > 0 ? renderBarChart(
              (statsData.ctaStats?.byType || []).map(c => ({
                label: c.type,
                value: c.count,
                color: c.type === 'mastering' ? '#6366f1' : c.type === 'mix_help' ? '#8b5cf6' : '#a855f7'
              }))
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
            )}
          </div>

          {/* CTA by Score Range */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.ctaByScore}
            </h3>
            {(statsData.ctaStats?.byScore || []).some(s => s.count > 0) ? renderBarChart(
              (statsData.ctaStats?.byScore || []).map(s => ({
                label: s.range,
                value: s.count,
                color: s.range === '90-100' ? '#10b981' : s.range === '70-89' ? '#3b82f6' : s.range === '50-69' ? '#f59e0b' : '#ef4444'
              }))
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
            )}
          </div>
        </div>

        {/* Contacts by Method */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxWidth: isMobile ? '100%' : '400px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            {t.analytics.contactByMethod}
          </h3>
          {(statsData.contactStats?.byMethod || []).length > 0 ? renderBarChart(
            (statsData.contactStats?.byMethod || []).map(m => ({
              label: m.method === 'whatsapp' ? 'WhatsApp' : m.method === 'email' ? 'Email' : 'Instagram',
              value: m.count,
              color: m.method === 'whatsapp' ? '#25d366' : m.method === 'email' ? '#3b82f6' : '#e1306c'
            }))
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
          )}
        </div>

        {/* Technical Insights Section */}
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: '1rem' }}>
          {t.analytics.techInsightsTitle}
        </h3>

        {/* Categorical Flags — Mix Health Status */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            {t.analytics.categoricalFlags}
            {statsData.technicalInsights?.categoricalFlags.total ? (
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '400', marginLeft: '0.5rem' }}>
                ({statsData.technicalInsights.categoricalFlags.total} {t.analytics.ofAnalyses})
              </span>
            ) : null}
          </h3>
          {statsData.technicalInsights?.categoricalFlags.total ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: t.analytics.headroomOk, data: statsData.technicalInsights.categoricalFlags.headroomOk, color: '#10b981' },
                { label: t.analytics.truePeakSafe, data: statsData.technicalInsights.categoricalFlags.truePeakSafe, color: '#3b82f6' },
                { label: t.analytics.dynamicOk, data: statsData.technicalInsights.categoricalFlags.dynamicOk, color: '#8b5cf6' },
                { label: t.analytics.stereoOk, data: statsData.technicalInsights.categoricalFlags.stereoRiskNone, color: '#059669' },
                { label: t.analytics.stereoMild, data: statsData.technicalInsights.categoricalFlags.stereoRiskMild, color: '#f59e0b' },
                { label: t.analytics.stereoHigh, data: statsData.technicalInsights.categoricalFlags.stereoRiskHigh, color: '#ef4444' }
              ].map(item => (
                <div key={item.label} style={{
                  background: '#f9fafb',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  textAlign: 'center',
                  border: '1px solid #f3f4f6'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: item.color }}>
                    {item.data.pct}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                    ({item.data.count})
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
          )}
        </div>

        {/* Spectral Profile — Overall Average */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.spectralProfile}
              {statsData.technicalInsights?.spectral.totalAnalyzed ? (
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '400', marginLeft: '0.5rem' }}>
                  ({statsData.technicalInsights.spectral.totalAnalyzed})
                </span>
              ) : null}
            </h3>
            {statsData.technicalInsights?.spectral.totalAnalyzed ? renderBarChart(
              ['sub', 'low', 'low_mid', 'mid', 'high_mid', 'high'].map((band, i) => ({
                label: band === 'low_mid' ? 'Low Mid' : band === 'high_mid' ? 'High Mid' : band.charAt(0).toUpperCase() + band.slice(1),
                value: statsData.technicalInsights!.spectral.overall[band] || 0,
                color: ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][i]
              }))
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
            )}
          </div>

          {/* Spectral by Score Range */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.spectralByScore}
            </h3>
            {statsData.technicalInsights?.spectral.totalAnalyzed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {['90-100', '70-89', '50-69', '0-49'].map(range => {
                  const data = statsData.technicalInsights!.spectral.byScore[range]
                  if (!data || data.count === 0) return null
                  const rangeColor = range === '90-100' ? '#10b981' : range === '70-89' ? '#3b82f6' : range === '50-69' ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={range}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: rangeColor }}>{range}</span>
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>({data.count})</span>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', height: '1.25rem', borderRadius: '0.25rem', overflow: 'hidden' }}>
                        {['sub', 'low', 'low_mid', 'mid', 'high_mid', 'high'].map((band, i) => {
                          const val = data.avg[band] || 0
                          const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
                          return (
                            <div
                              key={band}
                              title={`${band === 'low_mid' ? 'Low Mid' : band === 'high_mid' ? 'High Mid' : band}: ${val}%`}
                              style={{
                                width: `${val}%`,
                                background: colors[i],
                                minWidth: val > 0 ? '2px' : '0'
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {['Sub', 'Low', 'Low Mid', 'Mid', 'High Mid', 'High'].map((label, i) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][i] }} />
                      <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
            )}
          </div>
        </div>

        {/* Energy Patterns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {/* Peak Energy Position */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.avgPeakPosition}
              {statsData.technicalInsights?.energy.totalAnalyzed ? (
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '400', marginLeft: '0.5rem' }}>
                  ({statsData.technicalInsights.energy.totalAnalyzed})
                </span>
              ) : null}
            </h3>
            {statsData.technicalInsights?.energy.totalAnalyzed ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#6366f1' }}>
                  {statsData.technicalInsights.energy.avgPeakPositionPct}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {t.analytics.ofTrack}
                </div>
                {/* Visual position indicator */}
                <div style={{ position: 'relative', height: '0.5rem', background: '#e5e7eb', borderRadius: '9999px', marginTop: '0.75rem' }}>
                  <div style={{
                    position: 'absolute',
                    left: `${statsData.technicalInsights.energy.avgPeakPositionPct}%`,
                    top: '-3px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    transform: 'translateX(-50%)',
                    boxShadow: '0 2px 4px rgba(99,102,241,0.3)'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.65rem', color: '#9ca3af' }}>
                  <span>{t.analytics.beginning}</span>
                  <span>{t.analytics.middle}</span>
                  <span>{t.analytics.end}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
            )}
          </div>

          {/* Temporal Energy Distribution */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
              {t.analytics.energyDistribution}
            </h3>
            {statsData.technicalInsights?.energy.totalAnalyzed ? renderBarChart([
              { label: lang === 'es' ? '1er tercio' : '1st third', value: statsData.technicalInsights.energy.avgDistribution.low, color: '#3b82f6' },
              { label: lang === 'es' ? '2do tercio' : '2nd third', value: statsData.technicalInsights.energy.avgDistribution.mid, color: '#8b5cf6' },
              { label: lang === 'es' ? '3er tercio' : '3rd third', value: statsData.technicalInsights.energy.avgDistribution.high, color: '#6366f1' }
            ]) : (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t.analytics.noData}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER: REVENUE TAB
  // ============================================================================

  const renderRevenue = () => {
    const rb = statsData?.revenueBreakdown

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Revenue summary cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: '1rem'
        }}>
          {/* Total */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '1rem',
            padding: '1.5rem',
            color: 'white'
          }}>
            <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              {t.revenue.monthlyRevenue}
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>
              {formatCurrency(statsData?.kpi.revenueThisMonth ?? 0)}
            </p>
          </div>
          {/* Subscriptions */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {t.revenue.subscriptions}
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              {formatCurrency(rb?.subscriptions ?? 0)}
            </p>
          </div>
          {/* Single */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {t.revenue.singlePurchases}
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              {formatCurrency(rb?.single ?? 0)}
            </p>
          </div>
          {/* Addons */}
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {t.revenue.addonPacks}
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              {formatCurrency(rb?.addon ?? 0)}
            </p>
          </div>
        </div>

        {/* Recent payments */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
              {t.revenue.recentPayments}
            </h3>
          </div>

          {paymentsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              {t.loading}
            </div>
          ) : payments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              {t.revenue.noPayments}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Header */}
              {!isMobile && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr 1.5fr 1fr',
                  padding: '0.75rem 1rem',
                  background: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  <span>{t.revenue.date}</span>
                  <span>{t.revenue.user}</span>
                  <span>{t.revenue.amount}</span>
                  <span>{t.revenue.type}</span>
                  <span>{t.revenue.status}</span>
                </div>
              )}
              {payments.map(p => (
                <div key={p.id} style={{
                  display: isMobile ? 'block' : 'grid',
                  gridTemplateColumns: isMobile ? undefined : '1fr 2fr 1fr 1.5fr 1fr',
                  padding: isMobile ? '1rem' : '0.75rem 1rem',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '0.875rem'
                }}>
                  {isMobile ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          {formatCurrency(p.amount)}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          background: getStatusColor(p.status) + '20',
                          color: getStatusColor(p.status),
                          fontWeight: '500'
                        }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {p.profile?.email || '-'} | {formatDate(p.created_at, lang)}
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ color: '#6b7280' }}>{formatDate(p.created_at, lang)}</span>
                      <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.profile?.email || '-'}
                      </span>
                      <span style={{ fontWeight: '500', color: '#111827' }}>
                        {formatCurrency(p.amount)}
                      </span>
                      <span style={{ color: '#6b7280' }}>{p.description || '-'}</span>
                      <span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          background: getStatusColor(p.status) + '20',
                          color: getStatusColor(p.status),
                          fontWeight: '500'
                        }}>
                          {p.status}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER: LEADS TAB
  // ============================================================================

  const getMethodColor = (method: string): string => {
    switch (method) {
      case 'whatsapp': return '#25d366'
      case 'email': return '#3b82f6'
      case 'instagram': return '#e1306c'
      default: return '#6b7280'
    }
  }

  const getMethodLabel = (method: string): string => {
    switch (method) {
      case 'whatsapp': return 'WhatsApp'
      case 'email': return 'Email'
      case 'instagram': return 'Instagram'
      default: return method
    }
  }

  const getSourceLabel = (source: string | null): string => {
    if (!source) return t.leads.unknown
    switch (source) {
      case 'mastering': return t.leads.mastering
      case 'mix_help': return t.leads.mixHelp
      default: return source
    }
  }

  const renderLeads = () => {
    const methodFilters = ['all', 'whatsapp', 'email', 'instagram'] as const
    const dateFilters = ['all', 'today', 'week', 'month'] as const

    const dateFilterLabels: Record<string, string> = {
      all: t.leads.allDates,
      today: t.leads.today,
      week: t.leads.thisWeek,
      month: t.leads.thisMonthFilter
    }

    // Client-side filtering
    const filteredLeads = leadsList.filter(lead => {
      // Method filter
      if (leadsMethodFilter !== 'all' && lead.contact_method !== leadsMethodFilter) return false

      // Date filter
      if (leadsDateFilter !== 'all') {
        const leadDate = new Date(lead.created_at)
        const now = new Date()
        if (leadsDateFilter === 'today') {
          const todayStr = now.toISOString().split('T')[0]
          if (lead.created_at.split('T')[0] !== todayStr) return false
        } else if (leadsDateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (leadDate < weekAgo) return false
        } else if (leadsDateFilter === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          if (leadDate < monthStart) return false
        }
      }

      return true
    })

    return (
      <div>
        {/* KPI Cards */}
        {leadsKpi && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Total Leads */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {t.leads.totalLeads}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827' }}>
                {leadsKpi.total}
              </div>
            </div>

            {/* This Month */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {t.leads.thisMonth}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827' }}>
                {leadsKpi.thisMonth}
              </div>
            </div>

            {/* Method Breakdown */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                {t.leads.byMethod}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {leadsKpi.byMethod.map(({ method, count }) => (
                  <div key={method} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getMethodColor(method),
                      flexShrink: 0
                    }} />
                    <span style={{ color: '#374151' }}>{getMethodLabel(method)}</span>
                    <span style={{ color: '#6b7280', marginLeft: 'auto', fontWeight: '600' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Rate */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {t.leads.conversionRate}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827' }}>
                {leadsKpi.conversionRate}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                {leadsKpi.total} / {leadsKpi.totalAnalyses} {t.leads.ofAnalyses}
              </div>
            </div>
          </div>
        )}

        {/* Filters Row */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Method filter */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <Filter size={14} style={{ color: '#6b7280' }} />
            {methodFilters.map(method => (
              <button
                key={method}
                onClick={() => setLeadsMethodFilter(method)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: leadsMethodFilter === method ? '1px solid #667eea' : '1px solid #e5e7eb',
                  background: leadsMethodFilter === method ? '#667eea' : 'white',
                  color: leadsMethodFilter === method ? 'white' : '#374151',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: leadsMethodFilter === method ? '600' : '400',
                  transition: 'all 0.15s'
                }}
              >
                {method === 'all' ? t.leads.allMethods : getMethodLabel(method)}
              </button>
            ))}
          </div>

          {/* Date filter */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <Clock size={14} style={{ color: '#6b7280' }} />
            {dateFilters.map(period => (
              <button
                key={period}
                onClick={() => setLeadsDateFilter(period)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: leadsDateFilter === period ? '1px solid #667eea' : '1px solid #e5e7eb',
                  background: leadsDateFilter === period ? '#667eea' : 'white',
                  color: leadsDateFilter === period ? 'white' : '#374151',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: leadsDateFilter === period ? '600' : '400',
                  transition: 'all 0.15s'
                }}
              >
                {dateFilterLabels[period]}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchLeads()}
            disabled={leadsLoading}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#374151',
              fontSize: '0.8rem',
              cursor: leadsLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginLeft: 'auto'
            }}
            aria-label={t.refresh}
          >
            <RefreshCw size={14} style={{ animation: leadsLoading ? 'spin 1s linear infinite' : 'none' }} />
            {t.refresh}
          </button>
        </div>

        {/* Leads List */}
        {leadsLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            {t.loading}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            {t.leads.noLeads}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredLeads.map(lead => {
              const userEmail = lead.profile?.email || lead.email || '—'
              const userName = lead.profile?.full_name || lead.name || null

              return (
                <div
                  key={lead.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '0.75rem' : '1.5rem',
                    alignItems: isMobile ? 'flex-start' : 'center'
                  }}
                >
                  {/* Method badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '110px'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'white',
                      background: getMethodColor(lead.contact_method)
                    }}>
                      {getMethodLabel(lead.contact_method)}
                    </span>
                  </div>

                  {/* User info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                      {userEmail}
                    </div>
                    {userName && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {userName}
                      </div>
                    )}
                  </div>

                  {/* Analysis context */}
                  {lead.analysis ? (
                    <div style={{
                      minWidth: isMobile ? 'auto' : '200px',
                      padding: '0.4rem 0.75rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #f3f4f6'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#374151',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '180px'
                      }}>
                        {lead.analysis.filename}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          {t.leads.score}: <strong style={{ color: lead.analysis.score >= 70 ? '#10b981' : lead.analysis.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                            {lead.analysis.score}
                          </strong>
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          {lead.analysis.verdict}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      minWidth: isMobile ? 'auto' : '200px',
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      fontStyle: 'italic'
                    }}>
                      {t.leads.lastAnalysis}: —
                    </div>
                  )}

                  {/* Source */}
                  <div style={{
                    minWidth: '100px',
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    <span style={{ color: '#9ca3af' }}>{t.leads.source}:</span>{' '}
                    {getSourceLabel(lead.cta_source)}
                  </div>

                  {/* Country */}
                  {lead.client_country && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Globe size={12} />
                      {lead.client_country}
                    </div>
                  )}

                  {/* Date */}
                  <div style={{
                    minWidth: '90px',
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    textAlign: isMobile ? 'left' : 'right'
                  }}>
                    {formatDate(lead.created_at, lang)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // RENDER: FEEDBACK TAB
  // ============================================================================

  const renderFeedback = () => {
    const statusFilters = ['all', 'new', 'read', 'in_progress', 'resolved'] as const

    return (
      <div>
        {/* Status filters */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          alignItems: 'center'
        }}>
          {statusFilters.map(status => (
            <button
              key={status}
              onClick={() => setFeedbackFilter(status)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '500',
                flexShrink: 0,
                background: feedbackFilter === status
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'white',
                color: feedbackFilter === status ? 'white' : '#374151',
                boxShadow: feedbackFilter === status ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {t.feedback[status as keyof typeof t.feedback] as string}
            </button>
          ))}

          {/* Refresh */}
          <button
            onClick={() => fetchFeedback()}
            disabled={feedbackLoading}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '9999px',
              border: 'none',
              cursor: feedbackLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              fontWeight: '500',
              flexShrink: 0,
              background: 'white',
              color: '#374151',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginLeft: 'auto'
            }}
            aria-label={t.refresh}
          >
            <RefreshCw size={14} style={{ animation: feedbackLoading ? 'spin 1s linear infinite' : 'none' }} />
            {t.refresh}
          </button>
        </div>

        {/* Feedback list */}
        {feedbackLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            {t.loading}
          </div>
        ) : feedbackList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            {t.feedback.noFeedback}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {feedbackList.map(fb => (
              <div key={fb.id} style={{
                background: 'white',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${getStatusColor(fb.status)}`
              }}>
                {/* Header row */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  {/* Category badge */}
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    fontWeight: '600',
                    background: getCategoryColor(fb.category) + '20',
                    color: getCategoryColor(fb.category),
                    textTransform: 'uppercase'
                  }}>
                    {t.feedback.categories[fb.category as keyof typeof t.feedback.categories] || fb.category}
                  </span>

                  {/* Status badge */}
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    fontWeight: '500',
                    background: getStatusColor(fb.status) + '20',
                    color: getStatusColor(fb.status)
                  }}>
                    {fb.status}
                  </span>

                  {fb.is_priority && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      fontWeight: '600',
                      background: '#fef2f2',
                      color: '#dc2626'
                    }}>
                      {t.feedback.priority}
                    </span>
                  )}

                  {fb.satisfaction && (
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {'*'.repeat(parseInt(fb.satisfaction))}
                    </span>
                  )}

                  {fb.rating_bool !== null && fb.rating_bool !== undefined && (
                    <span style={{ fontSize: '1rem' }}>
                      {fb.rating_bool ? '👍' : '👎'}
                    </span>
                  )}

                  {fb.feedback_type === 'analysis_rating' && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '9999px',
                      fontWeight: '500',
                      background: '#ede9fe',
                      color: '#7c3aed'
                    }}>
                      {lang === 'es' ? 'Valoración' : 'Rating'}
                    </span>
                  )}

                  {fb.client_country && (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {fb.client_country}
                    </span>
                  )}

                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
                    {formatDate(fb.created_at, lang)}
                  </span>
                </div>

                {/* User */}
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  {fb.user?.email || 'Anonymous'}
                </p>

                {/* Subject + Message */}
                <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                  {fb.subject}
                </p>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#4b5563',
                  lineHeight: '1.6',
                  marginBottom: '1rem',
                  whiteSpace: 'pre-line'
                }}>
                  {fb.message}
                </p>

                {/* Admin notes (if any) */}
                {fb.admin_notes && (
                  <div style={{
                    background: '#fef3c7',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#92400e'
                  }}>
                    <strong>{t.feedback.adminNotes}:</strong> {fb.admin_notes}
                  </div>
                )}

                {/* Previous response (if any) */}
                {fb.responded_at && (fb.response_es || fb.response_en) && (
                  <div style={{
                    background: '#ecfdf5',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#065f46'
                  }}>
                    <strong>{lang === 'es' ? 'Respuesta enviada' : 'Response sent'}:</strong>{' '}
                    {lang === 'es' ? fb.response_es : fb.response_en}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {fb.status === 'new' && (
                    <button
                      onClick={() => handleFeedbackUpdate(fb.id, { status: 'read' })}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Eye size={14} />
                      {t.feedback.markAsRead}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (respondingTo === fb.id) {
                        setRespondingTo(null)
                      } else {
                        setRespondingTo(fb.id)
                        setResponseEs(fb.response_es || '')
                        setResponseEn(fb.response_en || '')
                        setAdminNotes(fb.admin_notes || '')
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: respondingTo === fb.id ? '#667eea' : '#f3f4f6',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: respondingTo === fb.id ? 'white' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <MessageSquare size={14} />
                    {t.feedback.respond}
                  </button>

                  {fb.status !== 'resolved' && (
                    <button
                      onClick={() => handleFeedbackUpdate(fb.id, { status: 'resolved' })}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: '#ecfdf5',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <CheckCircle size={14} />
                      {t.feedback.resolve}
                    </button>
                  )}
                </div>

                {/* Response form */}
                {respondingTo === fb.id && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    {/* Admin notes */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#374151', marginBottom: '0.35rem' }}>
                        {t.feedback.adminNotes}
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Response ES */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#374151', marginBottom: '0.35rem' }}>
                        {t.feedback.responseEs}
                      </label>
                      <textarea
                        value={responseEs}
                        onChange={e => setResponseEs(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Response EN */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#374151', marginBottom: '0.35rem' }}>
                        {t.feedback.responseEn}
                      </label>
                      <textarea
                        value={responseEn}
                        onChange={e => setResponseEn(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setRespondingTo(null)
                          setResponseEs('')
                          setResponseEn('')
                          setAdminNotes('')
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: '#374151'
                        }}
                      >
                        {t.feedback.cancel}
                      </button>
                      <button
                        onClick={() => handleFeedbackUpdate(fb.id, {
                          status: 'resolved',
                          adminNotes: adminNotes || undefined,
                          responseEs: responseEs || undefined,
                          responseEn: responseEn || undefined
                        })}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          color: 'white'
                        }}
                      >
                        {t.feedback.send}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowX: 'hidden'
    }}>
      {/* Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Chart tooltip */}
      {chartTooltip && (
        <div style={{
          position: 'fixed',
          left: chartTooltip.x,
          top: chartTooltip.y,
          transform: 'translate(-50%, -100%)',
          background: '#1f2937',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {chartTooltip.content}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: isMobile ? '0.75rem 0.75rem' : '0.75rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              <ArrowLeft size={18} />
              {isMobile ? '' : t.backToHome}
            </Link>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={18} color="white" />
              </div>
              <h1 style={{
                fontSize: isMobile ? '1rem' : '1.25rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                {t.adminPanel}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => {
                const newLang = lang === 'es' ? 'en' : 'es'
                setLang(newLang)
                setLanguageCookie(newLang)
              }}
              style={{
                background: '#f3f4f6',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut()
                } catch (err) {
                  console.error('Sign out error:', err)
                }
              }}
              style={{
                background: '#fee2e2',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
            >
              <LogOut size={14} />
              {isMobile ? '' : t.logout}
            </button>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: '53px',
        zIndex: 40
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          overflowX: 'auto',
          padding: '0 1rem'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: isMobile ? '0.75rem 0.75rem' : '0.75rem 1.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8rem' : '0.875rem',
                fontWeight: activeTab === tab.key ? '600' : '500',
                color: activeTab === tab.key ? '#667eea' : '#6b7280',
                borderBottom: activeTab === tab.key ? '2px solid #667eea' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              <tab.icon size={isMobile ? 16 : 18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? '1rem' : '1.5rem'
      }}>
        {fetchError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} />
            {fetchError}
            <button
              onClick={() => setFetchError(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: '0.25rem' }}
              aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'revenue' && renderRevenue()}
        {activeTab === 'leads' && renderLeads()}
        {activeTab === 'feedback' && renderFeedback()}
      </main>
    </div>
  )
}
