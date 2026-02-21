'use client'

/**
 * Prospecting Leads Page / Leads de Prospección
 * Standalone admin page for viewing and managing leads discovered by the automated scraper.
 * Bilingual: ES LATAM Neutro + US English
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import {
  ArrowLeft, RefreshCw, Search, Filter, ExternalLink,
  MessageCircle, XCircle, CheckCircle, Eye, ChevronDown,
  ChevronUp, Globe, LogOut, Clock
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface ProspectingLead {
  id: string
  source: string
  source_url: string
  source_id: string
  subreddit: string | null
  author_username: string
  title: string | null
  content_snippet: string
  pain_point_category: string
  matched_keywords: string[] | null
  relevance_score: number
  status: string
  admin_notes: string | null
  contacted_at: string | null
  contacted_via: string | null
  original_created_at: string | null
  discovered_at: string
}

interface KpiData {
  total: number
  newThisWeek: number
  avgScore: number
  topSource: { source: string; count: number } | null
  bySource: { source: string; count: number }[]
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

const t = {
  es: {
    title: 'Leads de Prospección',
    subtitle: 'Leads encontrados automáticamente en Reddit, YouTube y más',
    back: 'Admin',
    refresh: 'Actualizar',
    loading: 'Cargando...',
    noLeads: 'No se encontraron leads',
    noLeadsDesc: 'El scraper aún no ha encontrado leads, o los filtros actuales no coinciden con ninguno.',
    // KPI
    totalLeads: 'Total Leads',
    newThisWeek: 'Nuevos esta semana',
    avgRelevance: 'Relevancia promedio',
    topSource: 'Fuente principal',
    // Filters
    allStatuses: 'Todos los estados',
    allSources: 'Todas las fuentes',
    allCategories: 'Todas las categorías',
    searchPlaceholder: 'Buscar por autor o contenido...',
    // Status
    new: 'Nuevo',
    contacted: 'Contactado',
    dismissed: 'Descartado',
    converted: 'Convertido',
    // Actions
    markContacted: 'Contactado',
    markDismissed: 'Descartar',
    viewSource: 'Ver original',
    addNote: 'Agregar nota',
    saveNote: 'Guardar',
    // Table headers
    source: 'Fuente',
    author: 'Autor',
    content: 'Contenido',
    category: 'Categoría',
    score: 'Relevancia',
    date: 'Fecha',
    status: 'Estado',
    actions: 'Acciones',
    // Categories
    loudness: 'Volumen',
    lufs_targets: 'LUFS',
    streaming_targets: 'Streaming',
    mastering_quality: 'Calidad Master',
    mix_readiness: 'Mezcla Lista',
    general_mastering: 'Mastering General',
    // Pagination
    prev: 'Anterior',
    next: 'Siguiente',
    page: 'Página',
    of: 'de',
    // Contact methods
    reddit_dm: 'DM Reddit',
    reddit_comment: 'Comentario Reddit',
    youtube_reply: 'Respuesta YouTube',
    // Access
    accessDenied: 'Acceso denegado',
    accessDeniedDesc: 'Solo administradores pueden ver esta página.',
    loginRequired: 'Inicia sesión para continuar.',
  },
  en: {
    title: 'Prospecting Leads',
    subtitle: 'Leads automatically found on Reddit, YouTube, and more',
    back: 'Admin',
    refresh: 'Refresh',
    loading: 'Loading...',
    noLeads: 'No leads found',
    noLeadsDesc: 'The scraper hasn\'t found leads yet, or current filters don\'t match any.',
    totalLeads: 'Total Leads',
    newThisWeek: 'New this week',
    avgRelevance: 'Avg relevance',
    topSource: 'Top source',
    allStatuses: 'All statuses',
    allSources: 'All sources',
    allCategories: 'All categories',
    searchPlaceholder: 'Search by author or content...',
    new: 'New',
    contacted: 'Contacted',
    dismissed: 'Dismissed',
    converted: 'Converted',
    markContacted: 'Contacted',
    markDismissed: 'Dismiss',
    viewSource: 'View original',
    addNote: 'Add note',
    saveNote: 'Save',
    source: 'Source',
    author: 'Author',
    content: 'Content',
    category: 'Category',
    score: 'Relevance',
    date: 'Date',
    status: 'Status',
    actions: 'Actions',
    loudness: 'Loudness',
    lufs_targets: 'LUFS',
    streaming_targets: 'Streaming',
    mastering_quality: 'Master Quality',
    mix_readiness: 'Mix Readiness',
    general_mastering: 'General Mastering',
    prev: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    reddit_dm: 'Reddit DM',
    reddit_comment: 'Reddit Comment',
    youtube_reply: 'YouTube Reply',
    accessDenied: 'Access Denied',
    accessDeniedDesc: 'Only administrators can view this page.',
    loginRequired: 'Please log in to continue.',
  }
}

// ============================================================================
// HELPERS
// ============================================================================

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  reddit: { bg: 'var(--mr-amber-bg)', text: '#FF4500' },
  youtube: { bg: 'var(--mr-red-bg)', text: 'var(--mr-red)' },
  twitter: { bg: 'var(--mr-blue-bg)', text: 'var(--mr-blue)' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'var(--mr-blue-bg)', text: 'var(--mr-blue)' },
  contacted: { bg: 'var(--mr-green-bg)', text: 'var(--mr-green)' },
  dismissed: { bg: 'var(--mr-bg-hover)', text: 'var(--mr-text-tertiary)' },
  converted: { bg: 'var(--mr-purple-bg)', text: 'var(--mr-purple)' },
}

function scoreColor(score: number): string {
  if (score >= 0.7) return 'var(--mr-green)'
  if (score >= 0.5) return 'var(--mr-blue)'
  if (score >= 0.3) return 'var(--mr-amber)'
  return 'var(--mr-red)'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return '<1h'
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d`
  return d.toLocaleDateString()
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ProspectingPage() {
  const { user, session, loading: authLoading } = useAuth()

  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [leads, setLeads] = useState<ProspectingLead[]>([])
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const limit = 50

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const [isMobile, setIsMobile] = useState(false)
  const initialLoadDone = useRef(false)

  const labels = t[lang]

  useEffect(() => {
    setLang(detectLanguage())
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Admin status derived from fetchLeads response (API route already verifies admin).
  // No separate Supabase client needed — avoids GoTrueClient lock contention.
  useEffect(() => {
    if (authLoading) return
    if (!user) { setIsAdmin(false); setAdminChecked(true); return }
    if (!session?.access_token) { setAdminChecked(true); return }
    // Attempt fetch — 403 means not admin, success means admin
    const checkViaFetch = async () => {
      try {
        const res = await fetch(`/api/admin/prospecting?page=1&limit=50`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setLeads(data.leads || [])
          setTotalLeads(data.total || 0)
          setKpi(data.kpi || null)
          setIsAdmin(true)
          setLoading(false)
          initialLoadDone.current = true
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      } finally {
        setAdminChecked(true)
      }
    }
    checkViaFetch()
  }, [user?.id, authLoading, session?.access_token])

  const fetchLeads = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/admin/prospecting?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (res.status === 403) { setIsAdmin(false); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setLeads(data.leads || [])
      setTotalLeads(data.total || 0)
      setKpi(data.kpi || null)
    } catch (err) {
      console.error('Fetch leads error:', err)
      setError(lang === 'es' ? 'Error al cargar leads' : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, page, statusFilter, sourceFilter, categoryFilter, searchQuery, lang])

  useEffect(() => {
    if (!isAdmin || !session?.access_token) return
    // Skip the first trigger — initial load already handled by admin check
    if (!initialLoadDone.current) return
    fetchLeads()
  }, [isAdmin, fetchLeads])

  const updateLead = async (id: string, updates: Record<string, any>) => {
    if (!session?.access_token) return

    try {
      const res = await fetch('/api/admin/prospecting', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Update local state
      setLeads(prev => prev.map(l =>
        l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      ))
    } catch (err) {
      console.error('Update lead error:', err)
    }
  }

  const toggleLang = () => {
    const newLang = lang === 'es' ? 'en' : 'es'
    setLang(newLang)
    setLanguageCookie(newLang)
  }

  const totalPages = Math.ceil(totalLeads / limit)

  // Auth guard
  if (authLoading || !adminChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--mr-bg-base)', color: 'var(--mr-text-primary)' }}>
        <p>{labels.loading}</p>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '1rem', background: 'var(--mr-bg-base)', color: 'var(--mr-text-primary)' }}>
        <Shield size={48} style={{ color: 'var(--mr-red)' }} />
        <h1 style={{ fontSize: '1.5rem' }}>{labels.accessDenied}</h1>
        <p style={{ color: 'var(--mr-text-secondary)' }}>{!user ? labels.loginRequired : labels.accessDeniedDesc}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mr-bg-base)', color: 'var(--mr-text-primary)', overflowX: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
        borderBottom: '1px solid var(--mr-bg-hover)',
        background: 'var(--mr-bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> {labels.back}
          </Link>
          {!isMobile && <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{labels.title}</h1>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={fetchLeads} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: 'var(--mr-bg-elevated)', border: '1px solid var(--mr-bg-hover)', borderRadius: '6px', color: 'var(--mr-text-primary)', cursor: 'pointer', fontSize: '0.8125rem' }}>
            <RefreshCw size={14} /> {!isMobile && labels.refresh}
          </button>
          <button onClick={toggleLang} style={{ padding: '0.375rem 0.75rem', background: 'var(--mr-bg-elevated)', border: '1px solid var(--mr-bg-hover)', borderRadius: '6px', color: 'var(--mr-text-primary)', cursor: 'pointer', fontSize: '0.8125rem' }}>
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '1rem' : '1.5rem' }}>
        {isMobile && <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0' }}>{labels.title}</h1>}
        <p style={{ color: 'var(--mr-text-secondary)', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>{labels.subtitle}</p>

        {/* KPI Cards */}
        {kpi && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: labels.totalLeads, value: kpi.total.toString() },
              { label: labels.newThisWeek, value: kpi.newThisWeek.toString() },
              { label: labels.avgRelevance, value: `${(kpi.avgScore * 100).toFixed(0)}%` },
              { label: labels.topSource, value: kpi.topSource?.source || '—' },
            ].map((card, i) => (
              <div key={i} style={{
                padding: '1rem', background: 'var(--mr-bg-card)', borderRadius: '8px',
                border: '1px solid var(--mr-bg-hover)',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)', marginBottom: '0.25rem' }}>{card.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{card.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem',
          alignItems: 'center',
        }}>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            style={{ padding: '0.375rem 0.75rem', background: 'var(--mr-bg-input)', border: '1px solid var(--mr-bg-hover)', borderRadius: '6px', color: 'var(--mr-text-primary)', fontSize: '0.8125rem' }}>
            <option value="all">{labels.allStatuses}</option>
            <option value="new">{labels.new}</option>
            <option value="contacted">{labels.contacted}</option>
            <option value="dismissed">{labels.dismissed}</option>
            <option value="converted">{labels.converted}</option>
          </select>

          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
            style={{ padding: '0.375rem 0.75rem', background: 'var(--mr-bg-input)', border: '1px solid var(--mr-bg-hover)', borderRadius: '6px', color: 'var(--mr-text-primary)', fontSize: '0.8125rem' }}>
            <option value="all">{labels.allSources}</option>
            <option value="reddit">Reddit</option>
            <option value="youtube">YouTube</option>
          </select>

          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
            style={{ padding: '0.375rem 0.75rem', background: 'var(--mr-bg-input)', border: '1px solid var(--mr-bg-hover)', borderRadius: '6px', color: 'var(--mr-text-primary)', fontSize: '0.8125rem' }}>
            <option value="all">{labels.allCategories}</option>
            <option value="loudness">{labels.loudness}</option>
            <option value="lufs_targets">{labels.lufs_targets}</option>
            <option value="streaming_targets">{labels.streaming_targets}</option>
            <option value="mastering_quality">{labels.mastering_quality}</option>
            <option value="mix_readiness">{labels.mix_readiness}</option>
            <option value="general_mastering">{labels.general_mastering}</option>
          </select>

          <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mr-text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              placeholder={labels.searchPlaceholder}
              style={{
                width: '100%', padding: '0.375rem 0.75rem 0.375rem 2rem',
                background: 'var(--mr-bg-input)', border: '1px solid var(--mr-bg-hover)',
                borderRadius: '6px', color: 'var(--mr-text-primary)', fontSize: '0.8125rem',
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--mr-red-bg)', color: 'var(--mr-red)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--mr-text-secondary)' }}>
            {labels.loading}
          </div>
        )}

        {/* Empty state */}
        {!loading && leads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--mr-text-secondary)' }}>
            <Search size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <h3>{labels.noLeads}</h3>
            <p style={{ fontSize: '0.875rem' }}>{labels.noLeadsDesc}</p>
          </div>
        )}

        {/* Leads table */}
        {!loading && leads.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--mr-bg-hover)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.source}</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.author}</th>
                  {!isMobile && <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.content}</th>}
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.category}</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.score}</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.date}</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.status}</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: 'var(--mr-text-tertiary)', fontWeight: 500 }}>{labels.actions}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const isExpanded = expandedId === lead.id
                  const srcColor = SOURCE_COLORS[lead.source] || { bg: 'var(--mr-bg-hover)', text: 'var(--mr-text-primary)' }
                  const statColor = STATUS_COLORS[lead.status] || STATUS_COLORS.new
                  const catLabel = (labels as any)[lead.pain_point_category] || lead.pain_point_category

                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid var(--mr-bg-hover)', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                      {/* Source badge */}
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500,
                          background: srcColor.bg, color: srcColor.text,
                        }}>
                          {lead.source}
                          {lead.subreddit && <span style={{ opacity: 0.7 }}>/{lead.subreddit}</span>}
                        </span>
                      </td>

                      {/* Author */}
                      <td style={{ padding: '0.625rem 0.5rem', fontWeight: 500 }}>
                        {lead.author_username}
                      </td>

                      {/* Content snippet (desktop only) */}
                      {!isMobile && (
                        <td style={{ padding: '0.625rem 0.5rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--mr-text-secondary)' }}>
                          {lead.title || lead.content_snippet.substring(0, 100)}
                        </td>
                      )}

                      {/* Category */}
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', background: 'var(--mr-purple-bg)', color: 'var(--mr-purple)' }}>
                          {catLabel}
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                          <div style={{ width: '40px', height: '6px', borderRadius: '3px', background: 'var(--mr-bg-hover)', overflow: 'hidden' }}>
                            <div style={{ width: `${lead.relevance_score * 100}%`, height: '100%', borderRadius: '3px', background: scoreColor(lead.relevance_score) }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: scoreColor(lead.relevance_score), fontWeight: 600 }}>
                            {(lead.relevance_score * 100).toFixed(0)}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.625rem 0.5rem', color: 'var(--mr-text-tertiary)', fontSize: '0.75rem' }}>
                        {formatDate(lead.discovered_at)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500,
                          background: statColor.bg, color: statColor.text,
                        }}>
                          {(labels as any)[lead.status] || lead.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <a
                            href={lead.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={labels.viewSource}
                            style={{ display: 'flex', padding: '0.375rem', borderRadius: '4px', color: 'var(--mr-primary)', background: 'transparent' }}
                          >
                            <ExternalLink size={14} />
                          </a>
                          {lead.status === 'new' && (
                            <>
                              <button
                                onClick={() => updateLead(lead.id, { status: 'contacted' })}
                                title={labels.markContacted}
                                style={{ display: 'flex', padding: '0.375rem', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--mr-green)', background: 'transparent' }}
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => updateLead(lead.id, { status: 'dismissed' })}
                                title={labels.markDismissed}
                                style={{ display: 'flex', padding: '0.375rem', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--mr-text-tertiary)', background: 'transparent' }}
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Expanded detail (below table, for selected row) */}
        {expandedId && (() => {
          const lead = leads.find(l => l.id === expandedId)
          if (!lead) return null
          return (
            <div style={{
              margin: '0.5rem 0 1rem 0', padding: '1rem', background: 'var(--mr-bg-card)',
              borderRadius: '8px', border: '1px solid var(--mr-bg-hover)', fontSize: '0.8125rem',
            }}>
              {lead.title && <h4 style={{ margin: '0 0 0.5rem 0' }}>{lead.title}</h4>}
              <p style={{ color: 'var(--mr-text-secondary)', whiteSpace: 'pre-wrap', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                {lead.content_snippet}
              </p>
              {lead.matched_keywords && lead.matched_keywords.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {lead.matched_keywords.map((kw, i) => (
                    <span key={i} style={{ padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.6875rem', background: 'var(--mr-bg-elevated)', color: 'var(--mr-text-secondary)' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              {lead.original_created_at && (
                <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)', margin: '0 0 0.5rem 0' }}>
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  {lang === 'es' ? 'Publicado' : 'Posted'}: {new Date(lead.original_created_at).toLocaleString()}
                </p>
              )}

              {/* Notes */}
              <div style={{ marginTop: '0.75rem' }}>
                {editingNoteId === lead.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder={labels.addNote}
                      style={{
                        flex: 1, padding: '0.375rem 0.75rem', background: 'var(--mr-bg-input)',
                        border: '1px solid var(--mr-bg-hover)', borderRadius: '6px',
                        color: 'var(--mr-text-primary)', fontSize: '0.8125rem',
                      }}
                    />
                    <button
                      onClick={() => { updateLead(lead.id, { admin_notes: noteText }); setEditingNoteId(null) }}
                      style={{ padding: '0.375rem 0.75rem', background: 'var(--mr-primary)', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}
                    >
                      {labels.saveNote}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingNoteId(lead.id); setNoteText(lead.admin_notes || '') }}
                    style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid var(--mr-bg-hover)', borderRadius: '4px', color: 'var(--mr-text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {lead.admin_notes ? `📝 ${lead.admin_notes}` : labels.addNote}
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '0.375rem 0.75rem', background: 'var(--mr-bg-elevated)',
                border: '1px solid var(--mr-bg-hover)', borderRadius: '6px',
                color: page <= 1 ? 'var(--mr-text-tertiary)' : 'var(--mr-text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8125rem',
              }}
            >
              {labels.prev}
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)' }}>
              {labels.page} {page} {labels.of} {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '0.375rem 0.75rem', background: 'var(--mr-bg-elevated)',
                border: '1px solid var(--mr-bg-hover)', borderRadius: '6px',
                color: page >= totalPages ? 'var(--mr-text-tertiary)' : 'var(--mr-text-primary)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8125rem',
              }}
            >
              {labels.next}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// Shield icon used in access denied screen
function Shield({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
