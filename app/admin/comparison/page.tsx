'use client'

/**
 * Frequency Comparison Tool — /admin/comparison
 * Upload two versions of the same track to compare 6-band frequency balance.
 * Admin-only. Reuses existing analysis API (no backend changes).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { createFreshQueryClient } from '@/lib/supabase'
import { startAnalysisPolling, getAnalysisStatus } from '@/lib/api'
import { detectLanguage } from '@/lib/language'
import ThemeToggle from '@/components/ThemeToggle'
import {
  ArrowLeft, Upload, BarChart3, RefreshCw,
  Check, X, Minus, ArrowRight
} from 'lucide-react'

// ============================================================================
// CONSTANTS
// ============================================================================

const BANDS = [
  { key: 'sub', en: 'Sub', es: 'Sub', range: '20–60 Hz' },
  { key: 'low', en: 'Low', es: 'Graves', range: '60–250 Hz' },
  { key: 'low_mid', en: 'Low-Mid', es: 'Graves-Medios', range: '250–500 Hz' },
  { key: 'mid', en: 'Mid', es: 'Medios', range: '500–2k Hz' },
  { key: 'high_mid', en: 'High-Mid', es: 'Medios-Agudos', range: '2k–6k Hz' },
  { key: 'high', en: 'High', es: 'Agudos', range: '6k–20k Hz' },
] as const

const ACCEPTED_FORMATS = '.wav,.mp3,.aiff,.aif,.flac,.aac,.m4a,.ogg'

// ============================================================================
// TYPES
// ============================================================================

type SlotState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'

interface SlotData {
  state: SlotState
  file: File | null
  progress: number
  result: any | null
  error: string | null
  jobId: string | null
}

const INITIAL_SLOT: SlotData = {
  state: 'idle',
  file: null,
  progress: 0,
  result: null,
  error: null,
  jobId: null,
}

// ============================================================================
// HELPERS
// ============================================================================

function truncateFilename(name: string, max: number): string {
  if (name.length <= max) return name
  const dotIdx = name.lastIndexOf('.')
  if (dotIdx === -1) return name.slice(0, max - 3) + '...'
  const ext = name.slice(dotIdx)
  return name.slice(0, max - ext.length - 3) + '...' + ext
}

function getDeltaColor(delta: number): string {
  const abs = Math.abs(delta)
  if (abs < 1) return 'var(--mr-text-tertiary)'
  if (delta > 0) return 'var(--mr-green)'
  return 'var(--mr-red)'
}

function getDeltaLabel(delta: number, lang: 'es' | 'en'): string {
  const abs = Math.abs(delta)
  if (abs < 1) return lang === 'es' ? 'Sin cambio' : 'No change'
  if (abs < 3) return lang === 'es' ? 'Cambio menor' : 'Minor change'
  return lang === 'es' ? 'Cambio significativo' : 'Significant change'
}

function getScoreColor(score: number | undefined): string {
  if (score === undefined || score === null) return 'var(--mr-text-primary)'
  if (score >= 85) return 'var(--mr-green)'
  if (score >= 60) return 'var(--mr-amber)'
  return 'var(--mr-red)'
}

function getSpectral(result: any): Record<string, number> | null {
  if (!result) return null
  if (result.spectral_6band && typeof result.spectral_6band === 'object') {
    return result.spectral_6band
  }
  if (result.frequency_balance?.spectral_6band) {
    return result.frequency_balance.spectral_6band
  }
  return null
}

// ============================================================================
// UPLOAD SLOT COMPONENT
// ============================================================================

function UploadSlot({ label, slot, lang, onFileSelected, onReset }: {
  label: string
  slot: SlotData
  lang: 'es' | 'en'
  onFileSelected: (file: File) => void
  onReset: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{
      background: 'var(--mr-bg-card)',
      borderRadius: 'var(--mr-radius)',
      border: '1px solid var(--mr-border)',
      padding: '1.25rem',
      boxShadow: 'var(--mr-shadow)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0 }}>{label}</h3>
        {slot.state !== 'idle' && (
          <button
            onClick={onReset}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--mr-text-tertiary)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
            title={lang === 'es' ? 'Reiniciar' : 'Reset'}
            aria-label={lang === 'es' ? 'Reiniciar' : 'Reset'}
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {slot.state === 'idle' && (
        <div
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          role="button"
          tabIndex={0}
          style={{
            border: '2px dashed var(--mr-border)',
            borderRadius: 'var(--mr-radius-sm)',
            padding: '2rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--mr-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--mr-border)' }}
        >
          <Upload size={24} style={{ color: 'var(--mr-text-tertiary)', margin: '0 auto 0.5rem', display: 'block' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--mr-text-secondary)', margin: '0 0 0.25rem' }}>
            {lang === 'es' ? 'Haz clic para seleccionar' : 'Click to select'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)', margin: 0 }}>
            WAV, MP3, AIFF, FLAC, AAC, M4A, OGG
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFileSelected(f)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {(slot.state === 'uploading' || slot.state === 'analyzing') && (
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)', margin: '0 0 0.5rem' }}>
            {truncateFilename(slot.file?.name || '', 35)}
          </p>
          <div style={{
            height: '6px',
            background: 'var(--mr-bg-hover)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '0.5rem',
          }}>
            <div style={{
              width: `${slot.progress}%`,
              height: '100%',
              background: 'var(--mr-primary)',
              borderRadius: '3px',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)', margin: 0 }}>
            {slot.state === 'uploading'
              ? (lang === 'es' ? 'Subiendo...' : 'Uploading...')
              : (lang === 'es' ? `Analizando... ${slot.progress}%` : `Analyzing... ${slot.progress}%`)
            }
          </p>
        </div>
      )}

      {slot.state === 'done' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Check size={16} style={{ color: 'var(--mr-green)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--mr-green)', fontWeight: 500 }}>
              {lang === 'es' ? 'Listo' : 'Done'}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)', margin: '0 0 0.25rem' }}>
            {truncateFilename(slot.file?.name || '', 35)}
          </p>
          <p style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: getScoreColor(slot.result?.score),
            margin: 0,
          }}>
            Score: {slot.result?.score ?? '-'}
          </p>
        </div>
      )}

      {slot.state === 'error' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <X size={16} style={{ color: 'var(--mr-red)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--mr-red)', fontWeight: 500 }}>Error</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)', margin: 0 }}>
            {slot.error}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ComparisonPage() {
  const { user, session } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [lang, setLang] = useState<'es' | 'en'>('es')

  const [slotA, setSlotA] = useState<SlotData>({ ...INITIAL_SLOT })
  const [slotB, setSlotB] = useState<SlotData>({ ...INITIAL_SLOT })

  const pollRefA = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRefB = useRef<ReturnType<typeof setInterval> | null>(null)

  // Detect language
  useEffect(() => {
    setLang(detectLanguage())
  }, [])

  // Check admin status
  useEffect(() => {
    if (!user?.id || !session) {
      setIsAdmin(false)
      setAdminChecked(true)
      return
    }
    const check = async () => {
      try {
        const fresh = await createFreshQueryClient({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
        const { data } = await fresh
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        setIsAdmin(data?.is_admin === true)
      } catch {
        setIsAdmin(false)
      }
      setAdminChecked(true)
    }
    check()
  }, [user?.id, session?.access_token])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRefA.current) clearInterval(pollRefA.current)
      if (pollRefB.current) clearInterval(pollRefB.current)
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Analysis handler
  // ──────────────────────────────────────────────────────────────────────────

  const analyzeFile = useCallback(async (slot: 'A' | 'B', file: File) => {
    const setSlot = slot === 'A' ? setSlotA : setSlotB
    const pollRef = slot === 'A' ? pollRefA : pollRefB

    // Clear any existing poll
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    setSlot({
      state: 'uploading',
      file,
      progress: 5,
      result: null,
      error: null,
      jobId: null,
    })

    try {
      const response = await startAnalysisPolling(file, {
        lang,
        mode: 'short',
        strict: false,
        genre: null,
        isAuthenticated: true,
      })

      const jobId = response.job_id
      setSlot(prev => ({ ...prev, state: 'analyzing', progress: 10, jobId }))

      // Poll every 3 seconds
      pollRef.current = setInterval(async () => {
        try {
          const status = await getAnalysisStatus(jobId, lang)

          if (status.progress !== undefined) {
            setSlot(prev => ({
              ...prev,
              progress: Math.max(prev.progress, status.progress),
            }))
          }

          if (status.status === 'complete' && status.result) {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            setSlot(prev => ({
              ...prev,
              state: 'done',
              progress: 100,
              result: status.result,
            }))
          } else if (status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            setSlot(prev => ({
              ...prev,
              state: 'error',
              error: status.error || (lang === 'es' ? 'Error en el analisis' : 'Analysis error'),
            }))
          }
        } catch {
          // Transient poll errors — keep polling
        }
      }, 3000)
    } catch (err: any) {
      setSlot(prev => ({
        ...prev,
        state: 'error',
        error: err.message || (lang === 'es' ? 'Error al subir archivo' : 'Upload error'),
      }))
    }
  }, [lang])

  const handleReset = useCallback((slot: 'A' | 'B') => {
    const setSlot = slot === 'A' ? setSlotA : setSlotB
    const pollRef = slot === 'A' ? pollRefA : pollRefB
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setSlot({ ...INITIAL_SLOT })
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Auth gates
  // ──────────────────────────────────────────────────────────────────────────

  if (!adminChecked) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: 'var(--mr-bg-base)',
      }}>
        <span style={{ color: 'var(--mr-text-secondary)' }}>
          {lang === 'es' ? 'Verificando acceso...' : 'Verifying access...'}
        </span>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', height: '100vh', gap: '1rem', background: 'var(--mr-bg-base)',
      }}>
        <p style={{ color: 'var(--mr-text-primary)', margin: 0 }}>
          {lang === 'es' ? 'Inicia sesion para acceder' : 'Log in to access'}
        </p>
        <Link href="/admin" style={{ color: 'var(--mr-primary)', textDecoration: 'underline' }}>
          {lang === 'es' ? 'Ir a Admin' : 'Go to Admin'}
        </Link>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', height: '100vh', gap: '1rem', background: 'var(--mr-bg-base)',
      }}>
        <p style={{ color: 'var(--mr-text-primary)', margin: 0 }}>
          {lang === 'es' ? 'Acceso denegado' : 'Access denied'}
        </p>
        <Link href="/" style={{ color: 'var(--mr-primary)', textDecoration: 'underline' }}>
          {lang === 'es' ? 'Volver al inicio' : 'Back to home'}
        </Link>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Comparison data
  // ──────────────────────────────────────────────────────────────────────────

  const spectralA = getSpectral(slotA.result)
  const spectralB = getSpectral(slotB.result)
  const bothDone = slotA.state === 'done' && slotB.state === 'done' && spectralA && spectralB

  const comparisonData = bothDone
    ? BANDS.map(band => {
        const valA = spectralA[band.key] ?? 0
        const valB = spectralB[band.key] ?? 0
        return { ...band, valA, valB, delta: valB - valA }
      })
    : null

  const hasSignificantChange = comparisonData?.some(b => Math.abs(b.delta) >= 2) ?? false
  const maxDelta = comparisonData
    ? Math.max(...comparisonData.map(b => Math.abs(b.delta)))
    : 0
  const maxVal = comparisonData
    ? Math.max(...comparisonData.map(b => Math.max(b.valA, b.valB)))
    : 50

  // Scale bars so largest value fills ~90% width
  const barScale = maxVal > 0 ? 90 / maxVal : 2

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--mr-bg-base)',
      color: 'var(--mr-text-primary)',
      overflowX: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--mr-border)',
        background: 'var(--mr-bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/admin"
            style={{ color: 'var(--mr-text-secondary)', display: 'flex', alignItems: 'center' }}
            aria-label={lang === 'es' ? 'Volver a Admin' : 'Back to Admin'}
          >
            <ArrowLeft size={20} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--mr-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {lang === 'es' ? 'Comparador de Frecuencias' : 'Frequency Comparator'}
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Subtitle */}
        <p style={{
          color: 'var(--mr-text-secondary)',
          marginBottom: '2rem',
          fontSize: '0.9375rem',
        }}>
          {lang === 'es'
            ? 'Sube dos versiones del mismo archivo para comparar su balance de frecuencias (6 bandas).'
            : 'Upload two versions of the same file to compare their frequency balance (6 bands).'}
        </p>

        {/* Upload zones */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <UploadSlot
            label={lang === 'es' ? 'Archivo A (Original)' : 'File A (Original)'}
            slot={slotA}
            lang={lang}
            onFileSelected={(f) => analyzeFile('A', f)}
            onReset={() => handleReset('A')}
          />
          <UploadSlot
            label={lang === 'es' ? 'Archivo B (Modificado)' : 'File B (Modified)'}
            slot={slotB}
            lang={lang}
            onFileSelected={(f) => analyzeFile('B', f)}
            onReset={() => handleReset('B')}
          />
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* Comparison results                                          */}
        {/* ──────────────────────────────────────────────────────────── */}
        {bothDone && comparisonData && (
          <div style={{
            background: 'var(--mr-bg-card)',
            borderRadius: 'var(--mr-radius)',
            border: '1px solid var(--mr-border)',
            padding: '1.5rem',
            boxShadow: 'var(--mr-shadow)',
          }}>
            {/* Summary banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--mr-radius-sm)',
              marginBottom: '1.5rem',
              background: hasSignificantChange ? 'var(--mr-green-bg)' : 'var(--mr-amber-bg)',
            }}>
              {hasSignificantChange ? (
                <Check size={20} style={{ color: 'var(--mr-green)', flexShrink: 0 }} />
              ) : (
                <Minus size={20} style={{ color: 'var(--mr-amber)', flexShrink: 0 }} />
              )}
              <span style={{
                fontWeight: 600,
                color: hasSignificantChange ? 'var(--mr-green)' : 'var(--mr-amber)',
                fontSize: '0.9375rem',
              }}>
                {hasSignificantChange
                  ? (lang === 'es'
                    ? `Cambios de EQ detectados (delta max: ${maxDelta.toFixed(1)}%)`
                    : `EQ changes detected (max delta: ${maxDelta.toFixed(1)}%)`)
                  : (lang === 'es'
                    ? 'Sin cambios significativos de EQ (todas las bandas < 2%)'
                    : 'No significant EQ changes (all bands < 2%)')
                }
              </span>
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              marginBottom: '1rem',
              fontSize: '0.8125rem',
              color: 'var(--mr-text-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{
                  width: '12px', height: '12px', borderRadius: '2px',
                  background: 'var(--mr-primary)', opacity: 0.7,
                }} />
                <span>{truncateFilename(slotA.file?.name || 'A', 20)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{
                  width: '12px', height: '12px', borderRadius: '2px',
                  background: '#8b5cf6', opacity: 0.7,
                }} />
                <span>{truncateFilename(slotB.file?.name || 'B', 20)}</span>
              </div>
            </div>

            {/* Band comparison rows */}
            {comparisonData.map((band, i) => (
              <div
                key={band.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 70px',
                  gap: '0.75rem',
                  padding: '0.75rem 0.5rem',
                  alignItems: 'center',
                  borderRadius: 'var(--mr-radius-sm)',
                  background: i % 2 === 0 ? 'transparent' : 'var(--mr-bg-hover)',
                }}
              >
                {/* Band label */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {lang === 'es' ? band.es : band.en}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--mr-text-tertiary)' }}>
                    {band.range}
                  </div>
                </div>

                {/* Dual bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {/* Bar A */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      flex: 1, height: '14px',
                      background: 'var(--mr-bg-hover)',
                      borderRadius: '3px', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(band.valA * barScale, 100)}%`,
                        height: '100%',
                        background: 'var(--mr-primary)',
                        borderRadius: '3px',
                        opacity: 0.7,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 500,
                      minWidth: '38px', textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--mr-text-secondary)',
                    }}>
                      {band.valA.toFixed(1)}%
                    </span>
                  </div>
                  {/* Bar B */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      flex: 1, height: '14px',
                      background: 'var(--mr-bg-hover)',
                      borderRadius: '3px', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(band.valB * barScale, 100)}%`,
                        height: '100%',
                        background: '#8b5cf6',
                        borderRadius: '3px',
                        opacity: 0.7,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 500,
                      minWidth: '38px', textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--mr-text-secondary)',
                    }}>
                      {band.valB.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Delta */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: getDeltaColor(band.delta),
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {band.delta > 0 ? '+' : ''}{band.delta.toFixed(1)}%
                  </div>
                  <div style={{
                    fontSize: '0.625rem',
                    color: 'var(--mr-text-tertiary)',
                    marginTop: '1px',
                  }}>
                    {getDeltaLabel(band.delta, lang)}
                  </div>
                </div>
              </div>
            ))}

            {/* Score comparison footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '2rem',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--mr-border)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.75rem', color: 'var(--mr-text-tertiary)',
                  marginBottom: '0.25rem',
                }}>
                  {lang === 'es' ? 'Puntuacion A' : 'Score A'}
                </div>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 700,
                  color: getScoreColor(slotA.result?.score),
                }}>
                  {slotA.result?.score ?? '-'}
                </div>
              </div>
              <ArrowRight size={20} style={{ color: 'var(--mr-text-tertiary)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.75rem', color: 'var(--mr-text-tertiary)',
                  marginBottom: '0.25rem',
                }}>
                  {lang === 'es' ? 'Puntuacion B' : 'Score B'}
                </div>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 700,
                  color: getScoreColor(slotB.result?.score),
                }}>
                  {slotB.result?.score ?? '-'}
                </div>
              </div>
              {slotA.result?.score != null && slotB.result?.score != null && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '0.75rem', color: 'var(--mr-text-tertiary)',
                    marginBottom: '0.25rem',
                  }}>
                    Delta
                  </div>
                  <div style={{
                    fontSize: '1.5rem', fontWeight: 700,
                    color: (slotB.result.score - slotA.result.score) >= 0
                      ? 'var(--mr-green)' : 'var(--mr-red)',
                  }}>
                    {(slotB.result.score - slotA.result.score) > 0 ? '+' : ''}
                    {slotB.result.score - slotA.result.score}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
