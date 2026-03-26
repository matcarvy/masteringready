'use client'

/**
 * Content Creator — /admin/content
 * Hormozi Method: 1 input → 9 content formats via Claude AI.
 * Admin-only. Generate, review, copy, edit, schedule, and track content for social media.
 * Phase 2: Calendar view, inline editing, regeneration, insights, scheduling, infographic preview, image URLs.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/auth/AuthProvider'
import { createFreshQueryClient } from '@/lib/supabase'
import { detectLanguage } from '@/lib/language'
import ThemeToggle from '@/components/ThemeToggle'
import { getRandomConcepts, getConceptsByCategory, CONCEPT_BANK, type ContentConcept, type ConceptCategory } from '@/lib/content-concepts'
import {
  ArrowLeft, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Trash2, Video, Layers, AtSign, FileText, Briefcase,
  Hash, PlayCircle, Type, BarChart2, Filter, Loader2,
  Pencil, RefreshCw, Eye, Image as ImageIcon, Calendar,
  ChevronLeft, ChevronRight, Camera, Shuffle, Zap
} from 'lucide-react'

const InfographicRenderer = dynamic(
  () => import('@/components/InfographicRenderer'),
  { ssr: false }
)

// --- Constants ---

const INPUT_TYPES = [
  { value: 'topic', es: 'Tema / Idea', en: 'Topic / Idea' },
  { value: 'testimony', es: 'Testimonio', en: 'Testimonial' },
  { value: 'before_after', es: 'Antes / Después', en: 'Before / After' },
  { value: 'transcript', es: 'Transcripción', en: 'Transcript' },
  { value: 'personal', es: 'Personal / BTS', en: 'Personal / BTS' },
] as const

const FORMAT_META: Record<string, { icon: typeof Video; label: { es: string; en: string }; color: string }> = {
  reel_script:    { icon: Video,      label: { es: 'Reel / Short',       en: 'Reel / Short' },      color: '#ef4444' },
  carousel:       { icon: Layers,     label: { es: 'Carrusel',           en: 'Carousel' },           color: '#f59e0b' },
  ig_caption:     { icon: AtSign,     label: { es: 'Caption IG',         en: 'IG Caption' },         color: '#e1306c' },
  fb_post:        { icon: FileText,   label: { es: 'Post FB',            en: 'FB Post' },            color: '#3b82f6' },
  linkedin_post:  { icon: Briefcase,  label: { es: 'LinkedIn',           en: 'LinkedIn' },           color: '#0a66c2' },
  x_post:         { icon: Hash,       label: { es: 'Post X',             en: 'X Post' },             color: '#a0a0b2' },
  story_sequence: { icon: PlayCircle, label: { es: 'Historias',          en: 'Stories' },             color: '#7c3aed' },
  text_post:      { icon: Type,       label: { es: 'Texto Standalone',   en: 'Text Post' },          color: '#10b981' },
  infographic:    { icon: BarChart2,  label: { es: 'Infografía',         en: 'Infographic' },        color: '#667eea' },
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#f59e0b',
  approved: '#10b981',
  posted: '#3b82f6',
}

const STATUS_LABELS: Record<string, { es: string; en: string }> = {
  draft:    { es: 'Borrador', en: 'Draft' },
  approved: { es: 'Aprobado', en: 'Approved' },
  posted:   { es: 'Publicado', en: 'Posted' },
}

const STATUS_CYCLE = ['draft', 'approved', 'posted'] as const

const DAY_NAMES_ES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CATEGORY_COLORS: Record<string, string> = {
  educational: '#3b82f6',
  testimonial: '#10b981',
  personal: '#10b981',
  bts: '#10b981',
  opinion: '#f59e0b',
  cta: '#7c3aed',
}

const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  educational: { es: 'Educativo', en: 'Educational' },
  testimonial: { es: 'Testimonio', en: 'Testimonial' },
  personal: { es: 'Personal', en: 'Personal' },
  bts: { es: 'BTS', en: 'BTS' },
  opinion: { es: 'Opinión', en: 'Opinion' },
  cta: { es: 'CTA', en: 'CTA' },
}

// --- Types ---

interface ContentItem {
  id: string
  batch_id: string
  input_type: string
  input_text: string
  format_type: string
  content_es: string | null
  content_en: string | null
  platform: string[]
  status: string
  notes: string | null
  scheduled_date: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

interface Batch {
  batch_id: string
  input_type: string
  input_text: string
  created_at: string
  items: ContentItem[]
}

interface InsightsData {
  high_scores: { id: string; score: number; track_name: string; genre: string; created_at: string }[]
  total_analyses_30d: number
  avg_score: number
  weak_metrics: { metric: string; low_count: number; total: number }[]
  genre_distribution: { genre: string; count: number }[]
}

interface FormatCardProps {
  item: ContentItem
  lang: 'es' | 'en'
  expanded: boolean
  onToggle: () => void
  onCopy: (id: string, text: string) => void
  onStatusChange: (item: ContentItem) => void
  copiedId: string | null
  editingId: string | null
  editEs: string
  editEn: string
  onStartEdit: (item: ContentItem) => void
  onCancelEdit: () => void
  onSaveEdit: (item: ContentItem) => void
  onEditEsChange: (val: string) => void
  onEditEnChange: (val: string) => void
  regeneratingId: string | null
  onRegenerate: (item: ContentItem) => void
  onScheduleChange: (item: ContentItem, date: string | null) => void
  onImageUrlChange: (item: ContentItem, url: string | null) => void
  onPreviewInfographic: (content: string) => void
}

// --- Helper: Get Monday of a given week ---

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateShort(d: Date, lang: 'es' | 'en'): string {
  return d.toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', {
    month: 'short', day: 'numeric',
  })
}

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

// --- Main Component ---

export default function ContentCreatorPage() {
  const { user, session } = useAuth()
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Generator state
  const [tab, setTab] = useState<'create' | 'queue' | 'calendar'>('create')
  const [inputType, setInputType] = useState<string>('topic')
  const [inputText, setInputText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedItems, setGeneratedItems] = useState<ContentItem[]>([])
  const [genError, setGenError] = useState<string | null>(null)

  // Queue state
  const [batches, setBatches] = useState<Batch[]>([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Expanded format cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Phase 2: Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEs, setEditEs] = useState('')
  const [editEn, setEditEn] = useState('')

  // Phase 2: Regenerate state
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  // Phase 2: Calendar state
  const [calendarWeek, setCalendarWeek] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [calendarItems, setCalendarItems] = useState<ContentItem[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarExpandedId, setCalendarExpandedId] = useState<string | null>(null)

  // Phase 2: Insights state
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  // Phase 2: Infographic preview
  const [previewInfographic, setPreviewInfographic] = useState<string | null>(null)

  // Concepts panel state
  const [conceptsOpen, setConceptsOpen] = useState(false)
  const [conceptFilter, setConceptFilter] = useState<string | null>(null)
  const [displayedConcepts, setDisplayedConcepts] = useState<ContentConcept[]>([])
  const [suggestedBatch, setSuggestedBatch] = useState<ContentConcept[]>([])

  useEffect(() => {
    setLang(detectLanguage())
  }, [])

  // Admin check
  useEffect(() => {
    if (!user || !session) return
    const checkAdmin = async () => {
      try {
        const client = await createFreshQueryClient({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
        if (!client) return
        const { data: profile } = await client
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        setIsAdmin(!!profile?.is_admin)
      } catch {
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [user, session])

  const getToken = useCallback(() => session?.access_token || '', [session])

  // --- Data Loading ---

  // Load queue
  const loadQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const url = new URL('/api/admin/content', window.location.origin)
      if (statusFilter) url.searchParams.set('status', statusFilter)
      url.searchParams.set('limit', '200')

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Group items into batches
      const batchMap = new Map<string, Batch>()
      for (const item of (data.items || []) as ContentItem[]) {
        if (!batchMap.has(item.batch_id)) {
          batchMap.set(item.batch_id, {
            batch_id: item.batch_id,
            input_type: item.input_type,
            input_text: item.input_text,
            created_at: item.created_at,
            items: [],
          })
        }
        batchMap.get(item.batch_id)!.items.push(item)
      }
      setBatches(Array.from(batchMap.values()).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (err) {
    } finally {
      setQueueLoading(false)
    }
  }, [getToken, statusFilter])

  useEffect(() => {
    if (isAdmin && tab === 'queue') loadQueue()
  }, [isAdmin, tab, loadQueue])

  // Load calendar
  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true)
    try {
      const days = getWeekDays(calendarWeek)
      const from = formatDateISO(days[0])
      const to = formatDateISO(days[6])

      const url = new URL('/api/admin/content', window.location.origin)
      url.searchParams.set('scheduled_from', from)
      url.searchParams.set('scheduled_to', to)
      url.searchParams.set('limit', '200')

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCalendarItems((data.items || []) as ContentItem[])
    } catch (err) {
    } finally {
      setCalendarLoading(false)
    }
  }, [getToken, calendarWeek])

  useEffect(() => {
    if (isAdmin && tab === 'calendar') loadCalendar()
  }, [isAdmin, tab, loadCalendar])

  // Load insights
  const loadInsights = useCallback(async () => {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/admin/content/insights', {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInsightsData(data as InsightsData)
    } catch (err) {
    } finally {
      setInsightsLoading(false)
    }
  }, [getToken])

  // --- Actions ---

  // Generate content
  const handleGenerate = async () => {
    if (!inputText.trim() || generating) return
    setGenerating(true)
    setGenError(null)
    setGeneratedItems([])

    try {
      const res = await fetch('/api/admin/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ input_type: inputType, input_text: inputText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGeneratedItems(data.items || [])
      setExpandedCards(new Set((data.items || []).map((i: ContentItem) => i.id)))
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  // Update item status
  const updateStatus = async (item: ContentItem) => {
    const currentIdx = STATUS_CYCLE.indexOf(item.status as typeof STATUS_CYCLE[number])
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]

    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id: item.id, status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const updatedItem = data.item as ContentItem
      updateItemInState(updatedItem)
    } catch (err) {
    }
  }

  // Delete batch
  const deleteBatch = async (batchId: string) => {
    if (!confirm(lang === 'es' ? 'Eliminar todo el batch?' : 'Delete entire batch?')) return
    try {
      const res = await fetch(`/api/admin/content?batch_id=${batchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      setBatches(prev => prev.filter(b => b.batch_id !== batchId))
      setGeneratedItems(prev => prev.filter(i => i.batch_id !== batchId))
    } catch (err) {
    }
  }

  // Copy to clipboard
  const copyContent = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Toggle batch expand
  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev)
      next.has(batchId) ? next.delete(batchId) : next.add(batchId)
      return next
    })
  }

  // Toggle card expand
  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Helper to update an item in all local state arrays
  const updateItemInState = (updatedItem: ContentItem) => {
    setGeneratedItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i))
    setBatches(prev => prev.map(b => ({
      ...b,
      items: b.items.map(i => i.id === updatedItem.id ? updatedItem : i),
    })))
    setCalendarItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i))
  }

  // Phase 2: Start editing
  const handleStartEdit = (item: ContentItem) => {
    setEditingId(item.id)
    setEditEs(item.content_es || '')
    setEditEn(item.content_en || '')
  }

  // Phase 2: Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditEs('')
    setEditEn('')
  }

  // Phase 2: Save edit
  const handleSaveEdit = async (item: ContentItem) => {
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          id: item.id,
          content_es: editEs || null,
          content_en: editEn || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const updatedItem = data.item as ContentItem
      updateItemInState(updatedItem)
      setEditingId(null)
      setEditEs('')
      setEditEn('')
    } catch (err) {
    }
  }

  // Phase 2: Regenerate single format
  const handleRegenerate = async (item: ContentItem) => {
    setRegeneratingId(item.id)
    try {
      const res = await fetch('/api/admin/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          input_type: item.input_type,
          input_text: item.input_text,
          format_type: item.format_type,
          item_id: item.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Regeneration failed')
      const updatedItem = data.item as ContentItem
      updateItemInState(updatedItem)
    } catch (err) {
    } finally {
      setRegeneratingId(null)
    }
  }

  // Phase 2: Update scheduled date
  const handleScheduleChange = async (item: ContentItem, date: string | null) => {
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id: item.id, scheduled_date: date || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const updatedItem = data.item as ContentItem
      updateItemInState(updatedItem)
    } catch (err) {
    }
  }

  // Phase 2: Update image URL
  const handleImageUrlChange = async (item: ContentItem, url: string | null) => {
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id: item.id, image_url: url || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const updatedItem = data.item as ContentItem
      updateItemInState(updatedItem)
    } catch (err) {
    }
  }

  // Phase 2: Calendar navigation
  const navigateWeek = (direction: -1 | 1) => {
    setCalendarWeek(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + (7 * direction))
      return d
    })
  }

  const goToToday = () => {
    setCalendarWeek(getMondayOfWeek(new Date()))
  }

  // Concepts: load on first open
  useEffect(() => {
    if (conceptsOpen && displayedConcepts.length === 0) {
      setDisplayedConcepts(getRandomConcepts(8))
    }
  }, [conceptsOpen, displayedConcepts.length])

  const shuffleConcepts = () => {
    if (conceptFilter) {
      const filtered = getConceptsByCategory(conceptFilter as ConceptCategory)
      const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 8)
      setDisplayedConcepts(shuffled)
    } else {
      setDisplayedConcepts(getRandomConcepts(8))
    }
  }

  const filterConcepts = (cat: string | null) => {
    setConceptFilter(cat)
    if (cat) {
      const filtered = getConceptsByCategory(cat as ConceptCategory)
      setDisplayedConcepts(filtered.slice(0, 8))
    } else {
      setDisplayedConcepts(getRandomConcepts(8))
    }
  }

  const useConcept = (concept: ContentConcept) => {
    const prompt = lang === 'es' ? concept.prompt_es : concept.prompt_en
    setInputText(prompt)
    // Map concept category to input type
    const categoryToInputType: Record<string, string> = {
      educational: 'topic',
      personal: 'personal',
      bts: 'personal',
      opinion: 'topic',
      cta: 'topic',
      testimonial: 'testimony',
    }
    setInputType(categoryToInputType[concept.category] || 'topic')
  }

  const suggestBatch = () => {
    const batch = getRandomConcepts(4)
    setSuggestedBatch(batch)
  }

  // --- Render ---

  if (!user || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mr-bg-base)' }}>
        <Loader2 size={32} style={{ color: 'var(--mr-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mr-bg-base)', color: 'var(--mr-text-primary)' }}>
        <p>Access denied</p>
      </div>
    )
  }

  const t = (es: string, en: string) => lang === 'es' ? es : en

  const weekDays = getWeekDays(calendarWeek)
  const weekEndDate = weekDays[6]
  const weekRangeLabel = `${formatDateShort(calendarWeek, lang)} - ${formatDateShort(weekEndDate, lang)}, ${weekEndDate.getFullYear()}`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mr-bg-base)', color: 'var(--mr-text-primary)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--mr-border)',
        background: 'var(--mr-bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin" style={{ color: 'var(--mr-text-secondary)', display: 'flex' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} style={{ color: 'var(--mr-primary)' }} />
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
              Content Creator
            </h1>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--mr-border)',
        background: 'var(--mr-bg-card)',
        padding: '0 24px',
      }}>
        {(['create', 'queue', 'calendar'] as const).map(t2 => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t2 ? '2px solid var(--mr-primary)' : '2px solid transparent',
              color: tab === t2 ? 'var(--mr-primary)' : 'var(--mr-text-secondary)',
              fontWeight: tab === t2 ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t2 === 'create' && <>{t('Generar', 'Generate')}</>}
            {t2 === 'queue' && (
              <>
                {t('Cola', 'Queue')}
                {batches.length > 0 && (
                  <span style={{
                    background: 'var(--mr-primary)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '1px 7px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {batches.length}
                  </span>
                )}
              </>
            )}
            {t2 === 'calendar' && (
              <>
                <Calendar size={14} />
                {t('Calendario', 'Calendar')}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ maxWidth: tab === 'calendar' ? 1200 : 900, margin: '0 auto', padding: '24px 16px' }}>
        {/* ================================================================ */}
        {/* CREATE TAB                                                       */}
        {/* ================================================================ */}
        {tab === 'create' && (
          <>
            {/* Concepts Panel */}
            <ConceptsPanel
              lang={lang}
              t={t}
              isOpen={conceptsOpen}
              onToggle={() => setConceptsOpen(!conceptsOpen)}
              displayedConcepts={displayedConcepts}
              conceptFilter={conceptFilter}
              onFilterChange={filterConcepts}
              onShuffle={shuffleConcepts}
              onUseConcept={useConcept}
              suggestedBatch={suggestedBatch}
              onSuggestBatch={suggestBatch}
              onClearBatch={() => setSuggestedBatch([])}
            />

            {/* Insights Panel */}
            <InsightsPanel
              lang={lang}
              t={t}
              isOpen={insightsOpen}
              onToggle={() => {
                const nextOpen = !insightsOpen
                setInsightsOpen(nextOpen)
                if (nextOpen && !insightsData) loadInsights()
              }}
              onLoad={loadInsights}
              data={insightsData}
              loading={insightsLoading}
              onUseTestimony={(text) => { setInputText(text); setInputType('testimony') }}
              onUseTopic={(text) => { setInputText(text); setInputType('topic') }}
            />

            {/* Input section */}
            <div style={{
              background: 'var(--mr-bg-card)',
              borderRadius: 'var(--mr-radius)',
              border: '1px solid var(--mr-border)',
              padding: 24,
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <select
                  value={inputType}
                  onChange={e => setInputType(e.target.value)}
                  style={{
                    background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                    color: 'var(--mr-text-primary)',
                    border: '1px solid var(--mr-border)',
                    borderRadius: 'var(--mr-radius-sm)',
                    padding: '8px 12px',
                    fontSize: 14,
                    flex: '0 0 auto',
                    minWidth: 180,
                  }}
                >
                  {INPUT_TYPES.map(it => (
                    <option key={it.value} value={it.value}>
                      {lang === 'es' ? it.es : it.en}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={t(
                  'Pega tu testimonio, idea, datos de antes/despues, o transcripcion...',
                  'Paste your testimonial, idea, before/after data, or transcript...'
                )}
                rows={6}
                style={{
                  width: '100%',
                  background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                  color: 'var(--mr-text-primary)',
                  border: '1px solid var(--mr-border)',
                  borderRadius: 'var(--mr-radius-sm)',
                  padding: 12,
                  fontSize: 14,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--mr-text-tertiary)' }}>
                  {t('1 input → 9 formatos (Hormozi)', '1 input → 9 formats (Hormozi)')}
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={!inputText.trim() || generating}
                  style={{
                    background: generating ? 'var(--mr-text-tertiary)' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--mr-radius-sm)',
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: generating ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: !inputText.trim() ? 0.5 : 1,
                  }}
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {t('Generando...', 'Generating...')}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {t('Generar 9 formatos', 'Generate 9 formats')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {genError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--mr-red)',
                borderRadius: 'var(--mr-radius-sm)',
                padding: '12px 16px',
                marginBottom: 24,
                color: 'var(--mr-red)',
                fontSize: 14,
              }}>
                {genError}
              </div>
            )}

            {/* Generated results */}
            {generatedItems.length > 0 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--mr-text-primary)' }}>
                  {t('Contenido generado', 'Generated content')} ({generatedItems.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {generatedItems.map(item => (
                    <FormatCard
                      key={item.id}
                      item={item}
                      lang={lang}
                      expanded={expandedCards.has(item.id)}
                      onToggle={() => toggleCard(item.id)}
                      onCopy={copyContent}
                      onStatusChange={updateStatus}
                      copiedId={copiedId}
                      editingId={editingId}
                      editEs={editEs}
                      editEn={editEn}
                      onStartEdit={handleStartEdit}
                      onCancelEdit={handleCancelEdit}
                      onSaveEdit={handleSaveEdit}
                      onEditEsChange={setEditEs}
                      onEditEnChange={setEditEn}
                      regeneratingId={regeneratingId}
                      onRegenerate={handleRegenerate}
                      onScheduleChange={handleScheduleChange}
                      onImageUrlChange={handleImageUrlChange}
                      onPreviewInfographic={(content) => setPreviewInfographic(content)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ================================================================ */}
        {/* QUEUE TAB                                                        */}
        {/* ================================================================ */}
        {tab === 'queue' && (
          <>
            {/* Status filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <FilterBtn
                label={t('Todos', 'All')}
                active={statusFilter === null}
                onClick={() => setStatusFilter(null)}
              />
              {STATUS_CYCLE.map(s => (
                <FilterBtn
                  key={s}
                  label={STATUS_LABELS[s][lang]}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                  dotColor={STATUS_COLORS[s]}
                />
              ))}
              <div style={{ flex: 1 }} />
              <button
                onClick={loadQueue}
                disabled={queueLoading}
                style={{
                  background: 'var(--mr-bg-card)',
                  color: 'var(--mr-text-secondary)',
                  border: '1px solid var(--mr-border)',
                  borderRadius: 'var(--mr-radius-sm)',
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Filter size={14} />
                {t('Actualizar', 'Refresh')}
              </button>
            </div>

            {queueLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Loader2 size={28} style={{ color: 'var(--mr-primary)', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : batches.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 60,
                color: 'var(--mr-text-tertiary)',
                fontSize: 14,
              }}>
                {t('No hay contenido en la cola', 'No content in queue')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {batches.map(batch => {
                  const expanded = expandedBatches.has(batch.batch_id)
                  const statusCounts = { draft: 0, approved: 0, posted: 0 }
                  batch.items.forEach(i => {
                    if (i.status in statusCounts) statusCounts[i.status as keyof typeof statusCounts]++
                  })

                  return (
                    <div key={batch.batch_id} style={{
                      background: 'var(--mr-bg-card)',
                      borderRadius: 'var(--mr-radius)',
                      border: '1px solid var(--mr-border)',
                      overflow: 'hidden',
                    }}>
                      {/* Batch header */}
                      <button
                        onClick={() => toggleBatch(batch.batch_id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 16px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--mr-text-primary)',
                          textAlign: 'left',
                        }}
                      >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {INPUT_TYPES.find(it => it.value === batch.input_type)?.[lang] || batch.input_type}
                            {' · '}
                            {batch.input_text.slice(0, 60)}{batch.input_text.length > 60 ? '...' : ''}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--mr-text-tertiary)', marginTop: 2 }}>
                            {new Date(batch.created_at).toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </div>

                        {/* Status badges */}
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {Object.entries(statusCounts).map(([s, count]) => count > 0 && (
                            <span key={s} style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: `${STATUS_COLORS[s]}22`,
                              color: STATUS_COLORS[s],
                              fontWeight: 600,
                            }}>
                              {count} {STATUS_LABELS[s][lang]}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={e => { e.stopPropagation(); deleteBatch(batch.batch_id) }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--mr-text-tertiary)',
                            cursor: 'pointer',
                            padding: 4,
                            flexShrink: 0,
                          }}
                          title={t('Eliminar batch', 'Delete batch')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </button>

                      {/* Expanded items */}
                      {expanded && (
                        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {batch.items.map(item => (
                            <FormatCard
                              key={item.id}
                              item={item}
                              lang={lang}
                              expanded={expandedCards.has(item.id)}
                              onToggle={() => toggleCard(item.id)}
                              onCopy={copyContent}
                              onStatusChange={updateStatus}
                              copiedId={copiedId}
                              editingId={editingId}
                              editEs={editEs}
                              editEn={editEn}
                              onStartEdit={handleStartEdit}
                              onCancelEdit={handleCancelEdit}
                              onSaveEdit={handleSaveEdit}
                              onEditEsChange={setEditEs}
                              onEditEnChange={setEditEn}
                              regeneratingId={regeneratingId}
                              onRegenerate={handleRegenerate}
                              onScheduleChange={handleScheduleChange}
                              onImageUrlChange={handleImageUrlChange}
                              onPreviewInfographic={(content) => setPreviewInfographic(content)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ================================================================ */}
        {/* CALENDAR TAB                                                     */}
        {/* ================================================================ */}
        {tab === 'calendar' && (
          <>
            {/* Calendar header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => navigateWeek(-1)}
                  style={{
                    background: 'var(--mr-bg-card)',
                    border: '1px solid var(--mr-border)',
                    borderRadius: 'var(--mr-radius-sm)',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    color: 'var(--mr-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goToToday}
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--mr-radius-sm)',
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('Hoy', 'Today')}
                </button>
                <button
                  onClick={() => navigateWeek(1)}
                  style={{
                    background: 'var(--mr-bg-card)',
                    border: '1px solid var(--mr-border)',
                    borderRadius: 'var(--mr-radius-sm)',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    color: 'var(--mr-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--mr-text-primary)' }}>
                {weekRangeLabel}
              </span>
              <button
                onClick={loadCalendar}
                disabled={calendarLoading}
                style={{
                  background: 'var(--mr-bg-card)',
                  color: 'var(--mr-text-secondary)',
                  border: '1px solid var(--mr-border)',
                  borderRadius: 'var(--mr-radius-sm)',
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Filter size={14} />
                {t('Actualizar', 'Refresh')}
              </button>
            </div>

            {calendarLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Loader2 size={28} style={{ color: 'var(--mr-primary)', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <>
                {/* Week grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 8,
                }}>
                  {weekDays.map((day, dayIdx) => {
                    const dayStr = formatDateISO(day)
                    const dayItems = calendarItems.filter(i => i.scheduled_date === dayStr)
                    const dayNames = lang === 'es' ? DAY_NAMES_ES : DAY_NAMES_EN
                    const isTodayDay = isToday(day)

                    return (
                      <div
                        key={dayStr}
                        style={{
                          background: 'var(--mr-bg-card)',
                          borderRadius: 'var(--mr-radius)',
                          border: isTodayDay ? '2px solid var(--mr-primary)' : '1px solid var(--mr-border)',
                          minHeight: 180,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Day header */}
                        <div style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--mr-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isTodayDay ? 'var(--mr-primary)' : 'var(--mr-text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            {dayNames[dayIdx]}
                          </span>
                          <span style={{
                            fontSize: 14,
                            fontWeight: isTodayDay ? 700 : 500,
                            color: isTodayDay ? 'var(--mr-primary)' : 'var(--mr-text-primary)',
                          }}>
                            {day.getDate()}
                          </span>
                        </div>

                        {/* Day content */}
                        <div style={{ padding: 6, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {dayItems.length === 0 ? (
                            <div style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              color: 'var(--mr-text-tertiary)',
                              fontStyle: 'italic',
                            }}>
                              {t('Sin contenido', 'No content')}
                            </div>
                          ) : (
                            dayItems.map(item => {
                              const meta = FORMAT_META[item.format_type]
                              if (!meta) return null
                              const Icon = meta.icon
                              const isExpanded = calendarExpandedId === item.id

                              return (
                                <div key={item.id}>
                                  {/* Mini card */}
                                  <button
                                    onClick={() => setCalendarExpandedId(isExpanded ? null : item.id)}
                                    style={{
                                      width: '100%',
                                      background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                                      border: '1px solid var(--mr-border)',
                                      borderRadius: 'var(--mr-radius-sm)',
                                      padding: '5px 7px',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5,
                                    }}
                                  >
                                    <Icon size={11} style={{ color: meta.color, flexShrink: 0 }} />
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 500,
                                      color: 'var(--mr-text-primary)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      flex: 1,
                                    }}>
                                      {meta.label[lang]}
                                    </span>
                                    <span style={{
                                      fontSize: 9,
                                      padding: '1px 5px',
                                      borderRadius: 6,
                                      background: `${STATUS_COLORS[item.status]}22`,
                                      color: STATUS_COLORS[item.status],
                                      fontWeight: 600,
                                      flexShrink: 0,
                                    }}>
                                      {STATUS_LABELS[item.status]?.[lang]?.[0] || item.status[0]}
                                    </span>
                                  </button>

                                  {/* Expanded inline detail */}
                                  {isExpanded && (
                                    <div style={{
                                      marginTop: 4,
                                      padding: 8,
                                      background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                                      border: '1px solid var(--mr-border)',
                                      borderRadius: 'var(--mr-radius-sm)',
                                      fontSize: 11,
                                      color: 'var(--mr-text-secondary)',
                                    }}>
                                      <div style={{ marginBottom: 6, fontSize: 10, color: 'var(--mr-text-tertiary)' }}>
                                        {item.input_text.slice(0, 80)}{item.input_text.length > 80 ? '...' : ''}
                                      </div>
                                      <pre style={{
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        margin: 0,
                                        fontFamily: 'inherit',
                                        maxHeight: 150,
                                        overflow: 'auto',
                                        fontSize: 11,
                                        lineHeight: 1.5,
                                      }}>
                                        {(lang === 'es' ? item.content_es : item.content_en) || item.content_es || item.content_en || ''}
                                      </pre>
                                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const content = (lang === 'es' ? item.content_es : item.content_en) || item.content_es || item.content_en || ''
                                            copyContent(item.id, content)
                                          }}
                                          style={{
                                            background: 'none',
                                            border: '1px solid var(--mr-border)',
                                            borderRadius: 4,
                                            padding: '2px 6px',
                                            fontSize: 10,
                                            cursor: 'pointer',
                                            color: copiedId === item.id ? 'var(--mr-green)' : 'var(--mr-text-tertiary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3,
                                          }}
                                        >
                                          {copiedId === item.id ? <Check size={10} /> : <Copy size={10} />}
                                          {copiedId === item.id ? 'Copied' : 'Copy'}
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); updateStatus(item) }}
                                          style={{
                                            background: 'none',
                                            border: `1px solid ${STATUS_COLORS[item.status]}44`,
                                            borderRadius: 4,
                                            padding: '2px 6px',
                                            fontSize: 10,
                                            cursor: 'pointer',
                                            color: STATUS_COLORS[item.status],
                                          }}
                                        >
                                          {STATUS_LABELS[item.status]?.[lang] || item.status}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Infographic Preview Modal */}
      {previewInfographic !== null && (
        <div
          onClick={() => setPreviewInfographic(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--mr-bg-card)',
              borderRadius: 'var(--mr-radius)',
              border: '1px solid var(--mr-border)',
              maxWidth: 600,
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 24,
              position: 'relative',
              width: '100%',
            }}
          >
            <button
              onClick={() => setPreviewInfographic(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                color: 'var(--mr-text-tertiary)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <ChevronUp size={20} />
            </button>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--mr-text-primary)' }}>
              {t('Vista previa de infografía', 'Infographic Preview')}
            </h3>
            <InfographicRenderer content={previewInfographic} onClose={() => setPreviewInfographic(null)} />
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// --- Sub-Components ---

function FormatCard({
  item, lang, expanded, onToggle, onCopy, onStatusChange, copiedId,
  editingId, editEs, editEn, onStartEdit, onCancelEdit, onSaveEdit,
  onEditEsChange, onEditEnChange,
  regeneratingId, onRegenerate,
  onScheduleChange, onImageUrlChange, onPreviewInfographic,
}: FormatCardProps) {
  const meta = FORMAT_META[item.format_type]
  if (!meta) return null

  const Icon = meta.icon
  const content = item.content_es || item.content_en || ''
  const hasEn = !!item.content_en
  const hasBoth = !!item.content_es && !!item.content_en
  const preview = content.split('\n').slice(0, 2).join(' ').slice(0, 120)
  const isEditing = editingId === item.id
  const isRegenerating = regeneratingId === item.id
  const isInfographic = item.format_type === 'infographic'

  const [showImageInput, setShowImageInput] = useState(false)
  const [localImageUrl, setLocalImageUrl] = useState(item.image_url || '')

  return (
    <div style={{
      background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
      borderRadius: 'var(--mr-radius-sm)',
      border: '1px solid var(--mr-border)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Regenerating overlay */}
      {isRegenerating && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--mr-radius-sm)',
        }}>
          <Loader2 size={24} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 14px',
      }}>
        {/* Toggle button */}
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--mr-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            padding: 0,
            textAlign: 'left',
          }}
        >
          <Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {meta.label[lang]}
          </span>
          {/* Platform tags */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {item.platform.map(p => (
              <span key={p} style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'var(--mr-border)',
                color: 'var(--mr-text-tertiary)',
                fontWeight: 500,
              }}>
                {p}
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }} />
        </button>

        {/* Scheduled date picker */}
        <input
          type="date"
          value={item.scheduled_date || ''}
          onChange={e => onScheduleChange(item, e.target.value || null)}
          onClick={e => e.stopPropagation()}
          title={lang === 'es' ? 'Fecha programada' : 'Scheduled date'}
          style={{
            background: 'var(--mr-bg-card)',
            color: item.scheduled_date ? 'var(--mr-text-primary)' : 'var(--mr-text-tertiary)',
            border: '1px solid var(--mr-border)',
            borderRadius: 4,
            padding: '2px 4px',
            fontSize: 11,
            cursor: 'pointer',
            width: 110,
            flexShrink: 0,
          }}
        />

        {/* Status badge */}
        <button
          onClick={e => { e.stopPropagation(); onStatusChange(item) }}
          style={{
            fontSize: 11,
            padding: '2px 10px',
            borderRadius: 10,
            background: `${STATUS_COLORS[item.status]}22`,
            color: STATUS_COLORS[item.status],
            border: `1px solid ${STATUS_COLORS[item.status]}44`,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title={lang === 'es' ? 'Click para cambiar estado' : 'Click to cycle status'}
        >
          {STATUS_LABELS[item.status]?.[lang] || item.status}
        </button>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {/* Regenerate */}
          <button
            onClick={e => { e.stopPropagation(); onRegenerate(item) }}
            disabled={isRegenerating}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--mr-text-tertiary)',
              cursor: isRegenerating ? 'wait' : 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            title={lang === 'es' ? 'Regenerar' : 'Regenerate'}
          >
            <RefreshCw size={13} />
          </button>

          {/* Edit */}
          <button
            onClick={e => {
              e.stopPropagation()
              if (isEditing) {
                onCancelEdit()
              } else {
                onStartEdit(item)
                if (!expanded) onToggle()
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: isEditing ? 'var(--mr-primary)' : 'var(--mr-text-tertiary)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            title={lang === 'es' ? 'Editar' : 'Edit'}
          >
            <Pencil size={13} />
          </button>

          {/* Image URL */}
          <button
            onClick={e => {
              e.stopPropagation()
              if (showImageInput) {
                setShowImageInput(false)
              } else {
                setShowImageInput(true)
                setLocalImageUrl(item.image_url || '')
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: item.image_url ? 'var(--mr-primary)' : 'var(--mr-text-tertiary)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            title={lang === 'es' ? 'Imagen' : 'Image'}
          >
            <ImageIcon size={13} />
          </button>

          {/* Infographic preview */}
          {isInfographic && (
            <button
              onClick={e => {
                e.stopPropagation()
                const c = item.content_es || item.content_en || ''
                onPreviewInfographic(c)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--mr-text-tertiary)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title={lang === 'es' ? 'Vista previa' : 'Preview'}
            >
              <Eye size={13} />
            </button>
          )}
        </div>

        <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mr-text-primary)', padding: 0, display: 'flex' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Image URL input row */}
      {showImageInput && (
        <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="url"
            value={localImageUrl}
            onChange={e => setLocalImageUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onImageUrlChange(item, localImageUrl || null)
                setShowImageInput(false)
              }
            }}
            onBlur={() => {
              onImageUrlChange(item, localImageUrl || null)
              setShowImageInput(false)
            }}
            placeholder="https://..."
            style={{
              flex: 1,
              background: 'var(--mr-bg-card)',
              color: 'var(--mr-text-primary)',
              border: '1px solid var(--mr-border)',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 12,
            }}
            autoFocus
          />
          {item.image_url && (
            <img
              src={item.image_url}
              alt=""
              style={{ height: 16, borderRadius: 3, objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
      )}

      {/* Image thumbnail when not editing URL */}
      {!showImageInput && item.image_url && (
        <div style={{ padding: '0 14px 4px' }}>
          <img
            src={item.image_url}
            alt=""
            style={{ height: 16, borderRadius: 3, objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {/* Preview when collapsed */}
      {!expanded && content && (
        <div style={{
          padding: '0 14px 10px 40px',
          fontSize: 12,
          color: 'var(--mr-text-tertiary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {preview}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {isEditing ? (
            <>
              {/* Edit mode */}
              {(item.content_es !== null || hasBoth || !hasEn) && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--mr-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      ES
                    </span>
                  </div>
                  <textarea
                    value={editEs}
                    onChange={e => onEditEsChange(e.target.value)}
                    rows={10}
                    style={{
                      width: '100%',
                      background: 'var(--mr-bg-card)',
                      color: 'var(--mr-text-primary)',
                      border: '1px solid var(--mr-border)',
                      borderRadius: 'var(--mr-radius-sm)',
                      padding: 12,
                      fontSize: 13,
                      lineHeight: 1.6,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {(item.content_en !== null || hasBoth) && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--mr-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      EN
                    </span>
                  </div>
                  <textarea
                    value={editEn}
                    onChange={e => onEditEnChange(e.target.value)}
                    rows={10}
                    style={{
                      width: '100%',
                      background: 'var(--mr-bg-card)',
                      color: 'var(--mr-text-primary)',
                      border: '1px solid var(--mr-border)',
                      borderRadius: 'var(--mr-radius-sm)',
                      padding: 12,
                      fontSize: 13,
                      lineHeight: 1.6,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Save / Cancel buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => onSaveEdit(item)}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--mr-radius-sm)',
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Check size={14} />
                  {lang === 'es' ? 'Guardar' : 'Save'}
                </button>
                <button
                  onClick={onCancelEdit}
                  style={{
                    background: 'var(--mr-bg-card)',
                    color: 'var(--mr-text-secondary)',
                    border: '1px solid var(--mr-border)',
                    borderRadius: 'var(--mr-radius-sm)',
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Read mode */}
              {item.content_es && (
                <ContentBlock
                  label={hasBoth ? 'ES' : undefined}
                  text={item.content_es}
                  id={`${item.id}-es`}
                  onCopy={onCopy}
                  copiedId={copiedId}
                />
              )}

              {hasEn && (
                <ContentBlock
                  label={hasBoth ? 'EN' : undefined}
                  text={item.content_en!}
                  id={`${item.id}-en`}
                  onCopy={onCopy}
                  copiedId={copiedId}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ContentBlock({ label, text, id, onCopy, copiedId }: {
  label?: string
  text: string
  id: string
  onCopy: (id: string, text: string) => void
  copiedId: string | null
}) {
  const isCopied = copiedId === id

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        {label && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--mr-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {label}
          </span>
        )}
        <button
          onClick={() => onCopy(id, text)}
          style={{
            background: 'none',
            border: 'none',
            color: isCopied ? 'var(--mr-green)' : 'var(--mr-text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            marginLeft: 'auto',
          }}
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{
        background: 'var(--mr-bg-card)',
        border: '1px solid var(--mr-border)',
        borderRadius: 'var(--mr-radius-sm)',
        padding: 12,
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--mr-text-secondary)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        margin: 0,
        fontFamily: 'inherit',
        maxHeight: 400,
        overflow: 'auto',
      }}>
        {text}
      </pre>
    </div>
  )
}

function FilterBtn({ label, active, onClick, dotColor }: {
  label: string
  active: boolean
  onClick: () => void
  dotColor?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--mr-primary)' : 'var(--mr-bg-card)',
        color: active ? '#fff' : 'var(--mr-text-secondary)',
        border: `1px solid ${active ? 'var(--mr-primary)' : 'var(--mr-border)'}`,
        borderRadius: 'var(--mr-radius-sm)',
        padding: '6px 14px',
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontWeight: active ? 600 : 400,
      }}
    >
      {dotColor && (
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          display: 'inline-block',
        }} />
      )}
      {label}
    </button>
  )
}

// --- Insights Panel ---

function InsightsPanel({ lang, t, isOpen, onToggle, onLoad, data, loading, onUseTestimony, onUseTopic }: {
  lang: 'es' | 'en'
  t: (es: string, en: string) => string
  isOpen: boolean
  onToggle: () => void
  onLoad: () => void
  data: InsightsData | null
  loading: boolean
  onUseTestimony: (text: string) => void
  onUseTopic: (text: string) => void
}) {
  return (
    <div style={{
      background: 'var(--mr-bg-card)',
      borderRadius: 'var(--mr-radius)',
      border: '1px solid var(--mr-border)',
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--mr-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={16} style={{ color: 'var(--mr-primary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Insights</span>
          {data && (
            <span style={{
              fontSize: 11,
              padding: '1px 8px',
              borderRadius: 10,
              background: 'var(--mr-primary)',
              color: '#fff',
              fontWeight: 500,
            }}>
              {data.total_analyses_30d} {t('análisis (30d)', 'analyses (30d)')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!data && !loading && (
            <button
              onClick={e => { e.stopPropagation(); onLoad() }}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--mr-radius-sm)',
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('Cargar datos', 'Load data')}
            </button>
          )}
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div style={{ padding: '0 16px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Loader2 size={20} style={{ color: 'var(--mr-primary)', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--mr-text-tertiary)', fontSize: 13 }}>
              {t('Haz click en "Cargar datos" para ver insights', 'Click "Load data" to see insights')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary bar */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{
                  background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                  borderRadius: 'var(--mr-radius-sm)',
                  padding: '8px 14px',
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--mr-text-tertiary)', fontSize: 11 }}>{t('Promedio', 'Average')}</span>
                  <div style={{ fontWeight: 700, color: 'var(--mr-text-primary)' }}>{data.avg_score.toFixed(1)}</div>
                </div>
                <div style={{
                  background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                  borderRadius: 'var(--mr-radius-sm)',
                  padding: '8px 14px',
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--mr-text-tertiary)', fontSize: 11 }}>{t('Top scores', 'Top scores')}</span>
                  <div style={{ fontWeight: 700, color: 'var(--mr-green)' }}>{data.high_scores.length}</div>
                </div>
              </div>

              {/* a) Top Scores */}
              {data.high_scores.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--mr-text-primary)', marginBottom: 8 }}>
                    {t('Scores altos (testimonios potenciales)', 'High Scores (potential testimonials)')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.high_scores.slice(0, 10).map(hs => (
                      <div key={hs.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 10px',
                        background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                        borderRadius: 'var(--mr-radius-sm)',
                        border: '1px solid var(--mr-border)',
                      }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: hs.score >= 90 ? 'var(--mr-green)' : 'var(--mr-amber)',
                          minWidth: 30,
                        }}>
                          {hs.score}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--mr-text-primary)', flex: 1 }}>
                          {hs.track_name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--mr-text-tertiary)' }}>
                          {hs.genre}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--mr-text-tertiary)' }}>
                          {new Date(hs.created_at).toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={() => {
                            const text = `Testimonio: Un usuario analizó "${hs.track_name}" (${hs.genre}) y obtuvo un score de ${hs.score}/100.`
                            onUseTestimony(text)
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          {t('Usar', 'Use')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* b) Weak Metrics */}
              {data.weak_metrics.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--mr-text-primary)', marginBottom: 8 }}>
                    {t('Áreas débiles (ideas educativas)', 'Weak Areas (educational content ideas)')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.weak_metrics.slice(0, 5).map(wm => {
                      const pct = data.total_analyses_30d > 0
                        ? Math.round((wm.low_count / data.total_analyses_30d) * 100)
                        : 0

                      return (
                        <div key={wm.metric} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 10px',
                          background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                          borderRadius: 'var(--mr-radius-sm)',
                          border: '1px solid var(--mr-border)',
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mr-text-primary)', minWidth: 100 }}>
                            {wm.metric}
                          </span>
                          <div style={{ flex: 1, position: 'relative', height: 8, background: 'var(--mr-border)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${pct}%`,
                              background: 'var(--mr-amber)',
                              borderRadius: 4,
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--mr-text-tertiary)', minWidth: 50, textAlign: 'right' }}>
                            {wm.low_count}/{data.total_analyses_30d}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mr-amber)', minWidth: 30, textAlign: 'right' }}>
                            {pct}%
                          </span>
                          <button
                            onClick={() => {
                              const text = `Tema: ${wm.metric} es el área más débil en las mezclas de nuestros usuarios (${pct}% con score bajo). Tips para mejorar ${wm.metric}.`
                              onUseTopic(text)
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {t('Usar', 'Use')}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* c) Genre Distribution */}
              {data.genre_distribution.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--mr-text-primary)', marginBottom: 8 }}>
                    {t('Distribución por género', 'Genre Distribution')}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {data.genre_distribution.map(gd => (
                      <button
                        key={gd.genre}
                        onClick={() => {
                          const text = `Tema: Contenido para productores de ${gd.genre}. ${gd.count} análisis este mes.`
                          onUseTopic(text)
                        }}
                        style={{
                          background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                          border: '1px solid var(--mr-border)',
                          borderRadius: 'var(--mr-radius-sm)',
                          padding: '6px 12px',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: 'var(--mr-text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{gd.genre}</span>
                        <span style={{
                          fontSize: 10,
                          padding: '0 6px',
                          borderRadius: 8,
                          background: 'var(--mr-primary)',
                          color: '#fff',
                          fontWeight: 600,
                        }}>
                          {gd.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- Concepts Panel ---

function ConceptsPanel({ lang, t, isOpen, onToggle, displayedConcepts, conceptFilter, onFilterChange, onShuffle, onUseConcept, suggestedBatch, onSuggestBatch, onClearBatch }: {
  lang: 'es' | 'en'
  t: (es: string, en: string) => string
  isOpen: boolean
  onToggle: () => void
  displayedConcepts: ContentConcept[]
  conceptFilter: string | null
  onFilterChange: (cat: string | null) => void
  onShuffle: () => void
  onUseConcept: (concept: ContentConcept) => void
  suggestedBatch: ContentConcept[]
  onSuggestBatch: () => void
  onClearBatch: () => void
}) {
  const categoryFilters: { key: string | null; label: { es: string; en: string } }[] = [
    { key: null, label: { es: 'Todos', en: 'All' } },
    { key: 'educational', label: { es: 'Educativo', en: 'Educational' } },
    { key: 'personal', label: { es: 'Personal', en: 'Personal' } },
    { key: 'opinion', label: { es: 'Opinión', en: 'Opinion' } },
    { key: 'cta', label: { es: 'CTA', en: 'CTA' } },
  ]

  return (
    <div style={{
      background: 'var(--mr-bg-card)',
      borderRadius: 'var(--mr-radius)',
      border: '1px solid var(--mr-border)',
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--mr-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {t('Ideas', 'Concepts')}
          </span>
          <span style={{
            fontSize: 11,
            padding: '1px 8px',
            borderRadius: 10,
            background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
            color: 'var(--mr-text-tertiary)',
            fontWeight: 500,
          }}>
            {CONCEPT_BANK.length}
          </span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Content */}
      {isOpen && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {categoryFilters.map(cf => (
              <button
                key={cf.key ?? 'all'}
                onClick={() => onFilterChange(cf.key)}
                style={{
                  background: conceptFilter === cf.key ? 'var(--mr-primary)' : 'var(--mr-bg-elevated, var(--mr-bg-base))',
                  color: conceptFilter === cf.key ? '#fff' : 'var(--mr-text-secondary)',
                  border: `1px solid ${conceptFilter === cf.key ? 'var(--mr-primary)' : 'var(--mr-border)'}`,
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: conceptFilter === cf.key ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {cf.key && (
                  <span style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: CATEGORY_COLORS[cf.key] || 'var(--mr-text-tertiary)',
                    marginRight: 5,
                    verticalAlign: 'middle',
                  }} />
                )}
                {lang === 'es' ? cf.label.es : cf.label.en}
              </button>
            ))}
          </div>

          {/* Concept cards */}
          <div style={{
            maxHeight: 300,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 12,
          }}>
            {displayedConcepts.map((concept, idx) => {
              const catColor = CATEGORY_COLORS[concept.category] || 'var(--mr-text-tertiary)'
              const catLabel = CATEGORY_LABELS[concept.category]?.[lang] || concept.category
              const promptText = lang === 'es' ? concept.prompt_es : concept.prompt_en

              return (
                <div key={`concept-${idx}`} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                  borderRadius: 'var(--mr-radius-sm)',
                  border: '1px solid var(--mr-border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Category badge */}
                    <span style={{
                      display: 'inline-block',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 8px',
                      borderRadius: 10,
                      background: `${catColor}18`,
                      color: catColor,
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>
                      {catLabel}
                    </span>

                    {/* Prompt text */}
                    <p style={{
                      fontSize: 13,
                      color: 'var(--mr-text-primary)',
                      margin: '4px 0 0',
                      lineHeight: 1.4,
                    }}>
                      {promptText}
                    </p>

                    {/* Photo suggestion */}
                    {concept.needs_photo && (concept.photo_suggestion_es || concept.photo_suggestion_en) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 4,
                      }}>
                        <Camera size={11} style={{ color: 'var(--mr-text-tertiary)', flexShrink: 0 }} />
                        <span style={{
                          fontSize: 11,
                          color: 'var(--mr-text-tertiary)',
                          fontStyle: 'italic',
                        }}>
                          {lang === 'es' ? concept.photo_suggestion_es : concept.photo_suggestion_en}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Use button */}
                  <button
                    onClick={() => onUseConcept(concept)}
                    style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {t('Usar', 'Use')}
                  </button>
                </div>
              )
            })}

            {displayedConcepts.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--mr-text-tertiary)', fontSize: 13 }}>
                {t('No hay conceptos para esta categoría', 'No concepts for this category')}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={onShuffle}
              style={{
                background: 'var(--mr-bg-elevated, var(--mr-bg-base))',
                color: 'var(--mr-text-secondary)',
                border: '1px solid var(--mr-border)',
                borderRadius: 'var(--mr-radius-sm)',
                padding: '6px 14px',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 500,
              }}
            >
              <Shuffle size={13} />
              {t('Mezclar', 'Shuffle')}
            </button>

            <button
              onClick={onSuggestBatch}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--mr-radius-sm)',
                padding: '6px 14px',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <Zap size={13} />
              {t('Sugerir batch', 'Suggest batch')}
            </button>
          </div>

          {/* Suggested batch queue */}
          {suggestedBatch.length > 0 && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: 'var(--mr-bg-base)',
              borderRadius: 'var(--mr-radius-sm)',
              border: '1px solid var(--mr-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mr-text-primary)' }}>
                  {t('Batch sugerido', 'Suggested batch')} ({suggestedBatch.length})
                </span>
                <button
                  onClick={onClearBatch}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--mr-text-tertiary)',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '2px 6px',
                  }}
                >
                  {t('Limpiar', 'Clear')}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestedBatch.map((concept, idx) => {
                  const catColor = CATEGORY_COLORS[concept.category] || 'var(--mr-text-tertiary)'
                  const catLabel = CATEGORY_LABELS[concept.category]?.[lang] || concept.category
                  const promptText = lang === 'es' ? concept.prompt_es : concept.prompt_en

                  return (
                    <div key={`batch-${idx}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: 'var(--mr-bg-card)',
                      borderRadius: 'var(--mr-radius-sm)',
                      border: '1px solid var(--mr-border)',
                    }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--mr-text-tertiary)',
                        minWidth: 16,
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: `${catColor}18`,
                        color: catColor,
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}>
                        {catLabel}
                      </span>
                      <span style={{
                        fontSize: 12,
                        color: 'var(--mr-text-primary)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {promptText}
                      </span>
                      <button
                        onClick={() => onUseConcept(concept)}
                        style={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {t('Usar', 'Use')}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
