'use client'

/**
 * Mastering Lab — /admin/mastering-lab
 * Upload up to 4 files (Mix, Reference, Your Master, Reference Master)
 * to compare mastering processes, results, and frequency profiles.
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
  Check, X, Minus, Target, GitCompare, Zap, Music
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

const METRIC_DEFS = [
  { key: 'lufs', en: 'LUFS', es: 'LUFS', unit: 'LUFS', thresholds: { close: 1.0, moderate: 2.5 } },
  { key: 'truePeak', en: 'True Peak', es: 'True Peak', unit: 'dBTP', thresholds: { close: 1.0, moderate: 2.0 } },
  { key: 'headroom', en: 'Headroom', es: 'Margen', unit: 'dBFS', thresholds: { close: 1.5, moderate: 3.0 } },
  { key: 'plr', en: 'PLR', es: 'PLR', unit: 'dB', thresholds: { close: 1.5, moderate: 3.0 } },
  { key: 'stereoCorr', en: 'Stereo Corr.', es: 'Corr. Estéreo', unit: '', thresholds: { close: 0.05, moderate: 0.12 } },
  { key: 'crestFactor', en: 'Crest Factor', es: 'Crest Factor', unit: 'dB', thresholds: { close: 1.5, moderate: 3.0 } },
] as const

// Which metrics to show per comparison type
const COMPARISON_METRICS: Record<string, string[]> = {
  mix_vs_ref: [],
  mix_vs_master: ['lufs', 'truePeak', 'headroom', 'plr', 'stereoCorr', 'crestFactor'],
  master_vs_refmaster: ['lufs', 'truePeak', 'plr', 'stereoCorr', 'crestFactor'],
  ref_vs_refmaster: ['lufs', 'truePeak', 'headroom', 'plr', 'stereoCorr', 'crestFactor'],
}

// ============================================================================
// TYPES
// ============================================================================

type SlotState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'
type SlotId = 'mix' | 'ref' | 'master' | 'refMaster'

interface SlotData {
  state: SlotState
  file: File | null
  progress: number
  result: any | null
  error: string | null
  jobId: string | null
}

interface ExtractedMetrics {
  score: number
  lufs: number | null
  truePeak: number | null
  headroom: number | null
  plr: number | null
  stereoCorr: number | null
  msRatio: number | null
  lrBalance: number | null
  crestFactor: number | null
  spectral: Record<string, number> | null
}

const INITIAL_SLOT: SlotData = {
  state: 'idle', file: null, progress: 0, result: null, error: null, jobId: null,
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

function getSpectral(result: any): Record<string, number> | null {
  if (!result) return null
  if (result.spectral_6band && typeof result.spectral_6band === 'object') return result.spectral_6band
  if (result.frequency_balance?.spectral_6band) return result.frequency_balance.spectral_6band
  // Also check inside metrics array for frequency balance metric
  const fbMetric = result.metrics?.find?.((m: any) => m.internal_key === 'Frequency Balance')
  if (fbMetric?.spectral_6band) return fbMetric.spectral_6band
  return null
}

function parseNum(val: string | number | null | undefined): number | null {
  if (val == null) return null
  if (typeof val === 'number') return val
  const match = String(val).match(/-?[\d.]+/)
  return match ? parseFloat(match[0]) : null
}

function extractMetrics(result: any): ExtractedMetrics | null {
  if (!result) return null
  const metrics = result.metrics || []
  const find = (key: string) => metrics.find((m: any) => m.internal_key === key)

  const headroom = find('Headroom')
  const tp = find('True Peak')
  const lufs = find('LUFS (Integrated)')
  const plr = find('PLR')
  const stereo = find('Stereo Width')
  const crest = find('Crest Factor')

  return {
    score: result.score ?? 0,
    headroom: headroom?.peak_db ?? parseNum(headroom?.value),
    truePeak: parseNum(tp?.value),
    lufs: parseNum(lufs?.value),
    plr: parseNum(plr?.value),
    stereoCorr: stereo?.correlation ?? null,
    msRatio: stereo?.ms_ratio ?? null,
    lrBalance: stereo?.lr_balance_db ?? null,
    crestFactor: parseNum(crest?.value),
    spectral: getSpectral(result),
  }
}

function getScoreColor(score: number | undefined): string {
  if (score === undefined || score === null) return 'var(--mr-text-primary)'
  if (score >= 85) return 'var(--mr-green)'
  if (score >= 60) return 'var(--mr-amber)'
  return 'var(--mr-red)'
}

function fmtVal(v: number | null, decimals: number = 1): string {
  if (v === null) return '–'
  return v.toFixed(decimals)
}

function fmtDelta(v: number | null, decimals: number = 1): string {
  if (v === null) return '–'
  return (v > 0 ? '+' : '') + v.toFixed(decimals)
}

function deltaColor(delta: number | null, inverted: boolean = false): string {
  if (delta === null || Math.abs(delta) < 0.1) return 'var(--mr-text-tertiary)'
  // For some metrics, positive delta is "worse" (e.g., True Peak going up)
  // inverted=true means positive = bad
  if (inverted) return delta > 0 ? 'var(--mr-red)' : 'var(--mr-green)'
  return 'var(--mr-text-secondary)'
}

function matchLevel(diff: number, close: number, moderate: number): 'close' | 'moderate' | 'far' {
  const abs = Math.abs(diff)
  if (abs <= close) return 'close'
  if (abs <= moderate) return 'moderate'
  return 'far'
}

function matchIcon(level: 'close' | 'moderate' | 'far') {
  if (level === 'close') return { icon: '≈', color: 'var(--mr-green)' }
  if (level === 'moderate') return { icon: '~', color: 'var(--mr-amber)' }
  return { icon: '≠', color: 'var(--mr-red)' }
}

// ============================================================================
// UPLOAD SLOT COMPONENT
// ============================================================================

function UploadSlot({ label, slot, lang, onFileSelected, onReset, accentColor }: {
  label: string
  slot: SlotData
  lang: 'es' | 'en'
  onFileSelected: (file: File) => void
  onReset: () => void
  accentColor?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const accent = accentColor || 'var(--mr-primary)'

  return (
    <div style={{
      background: 'var(--mr-bg-card)',
      borderRadius: 'var(--mr-radius)',
      border: '1px solid var(--mr-border)',
      borderTop: `3px solid ${accent}`,
      padding: '1.25rem',
      boxShadow: 'var(--mr-shadow)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{label}</h3>
        {slot.state !== 'idle' && (
          <button onClick={onReset} style={{
            background: 'none', border: 'none', color: 'var(--mr-text-tertiary)',
            cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center',
          }} title={lang === 'es' ? 'Reiniciar' : 'Reset'}>
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {slot.state === 'idle' && (
        <div onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          style={{
            border: '2px dashed var(--mr-border)', borderRadius: 'var(--mr-radius-sm)',
            padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--mr-border)' }}
        >
          <Upload size={20} style={{ color: 'var(--mr-text-tertiary)', margin: '0 auto 0.5rem', display: 'block' }} />
          <p style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)', margin: 0 }}>
            {lang === 'es' ? 'Haz clic para seleccionar' : 'Click to select'}
          </p>
          <input ref={inputRef} type="file" accept={ACCEPTED_FORMATS} style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); e.target.value = '' }} />
        </div>
      )}

      {(slot.state === 'uploading' || slot.state === 'analyzing') && (
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)', margin: '0 0 0.5rem' }}>
            {truncateFilename(slot.file?.name || '', 30)}
          </p>
          <div style={{ height: '6px', background: 'var(--mr-bg-hover)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div style={{ width: `${slot.progress}%`, height: '100%', background: accent, borderRadius: '3px', transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)', margin: 0 }}>
            {slot.state === 'uploading'
              ? (lang === 'es' ? 'Subiendo...' : 'Uploading...')
              : (lang === 'es' ? `Analizando... ${slot.progress}%` : `Analyzing... ${slot.progress}%`)}
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
            {truncateFilename(slot.file?.name || '', 30)}
          </p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: getScoreColor(slot.result?.score), margin: 0 }}>
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
          <p style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)', margin: 0 }}>{slot.error}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SPECTRAL COMPARISON COMPONENT
// ============================================================================

function SpectralComparison({ specA, specB, nameA, nameB, lang, colorA, colorB }: {
  specA: Record<string, number>
  specB: Record<string, number>
  nameA: string
  nameB: string
  lang: 'es' | 'en'
  colorA: string
  colorB: string
}) {
  const maxVal = Math.max(
    ...BANDS.map(b => Math.max(specA[b.key] ?? 0, specB[b.key] ?? 0)),
    1
  )
  const barScale = 90 / maxVal

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--mr-text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: colorA, opacity: 0.7 }} />
          <span>{nameA}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: colorB, opacity: 0.7 }} />
          <span>{nameB}</span>
        </div>
      </div>

      {BANDS.map((band, i) => {
        const valA = specA[band.key] ?? 0
        const valB = specB[band.key] ?? 0
        const delta = valB - valA
        return (
          <div key={band.key} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 60px', gap: '0.5rem',
            padding: '0.5rem 0.25rem', alignItems: 'center',
            background: i % 2 === 0 ? 'transparent' : 'var(--mr-bg-hover)',
            borderRadius: 'var(--mr-radius-sm)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{lang === 'es' ? band.es : band.en}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--mr-text-tertiary)' }}>{band.range}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {[{ val: valA, color: colorA }, { val: valB, color: colorB }].map((bar, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ flex: 1, height: '12px', background: 'var(--mr-bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(bar.val * barScale, 100)}%`, height: '100%',
                      background: bar.color, borderRadius: '3px', opacity: 0.7, transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 500, minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--mr-text-secondary)' }}>
                    {bar.val.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums', color: Math.abs(delta) < 1 ? 'var(--mr-text-tertiary)' : delta > 0 ? 'var(--mr-green)' : 'var(--mr-red)' }}>
              {fmtDelta(delta)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// METRIC DELTA TABLE COMPONENT
// ============================================================================

function MetricDeltaTable({ metricsA, metricsB, metricKeys, lang }: {
  metricsA: ExtractedMetrics
  metricsB: ExtractedMetrics
  metricKeys: string[]
  lang: 'es' | 'en'
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '110px 80px 80px 70px', gap: '0.5rem',
        padding: '0.5rem 0.5rem', fontSize: '0.6875rem', fontWeight: 600,
        color: 'var(--mr-text-tertiary)', borderBottom: '1px solid var(--mr-border)',
      }}>
        <div>{lang === 'es' ? 'Métrica' : 'Metric'}</div>
        <div style={{ textAlign: 'right' }}>A</div>
        <div style={{ textAlign: 'right' }}>B</div>
        <div style={{ textAlign: 'center' }}>Delta</div>
      </div>

      {metricKeys.map((key, i) => {
        const def = METRIC_DEFS.find(d => d.key === key)
        if (!def) return null
        const valA = (metricsA as any)[key] as number | null
        const valB = (metricsB as any)[key] as number | null
        const delta = valA !== null && valB !== null ? valB - valA : null
        const decimals = key === 'stereoCorr' ? 2 : 1

        return (
          <div key={key} style={{
            display: 'grid', gridTemplateColumns: '110px 80px 80px 70px', gap: '0.5rem',
            padding: '0.5rem 0.5rem', alignItems: 'center', fontSize: '0.8125rem',
            background: i % 2 === 0 ? 'transparent' : 'var(--mr-bg-hover)',
            borderRadius: 'var(--mr-radius-sm)',
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              {lang === 'es' ? def.es : def.en}
            </div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--mr-text-secondary)' }}>
              {fmtVal(valA, decimals)} {def.unit}
            </div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--mr-text-secondary)' }}>
              {fmtVal(valB, decimals)} {def.unit}
            </div>
            <div style={{
              textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              color: delta === null ? 'var(--mr-text-tertiary)' : Math.abs(delta) < (key === 'stereoCorr' ? 0.02 : 0.5) ? 'var(--mr-text-tertiary)' : 'var(--mr-text-primary)',
            }}>
              {fmtDelta(delta, decimals)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// COMPARISON PANEL COMPONENT
// ============================================================================

function ComparisonPanel({ title, subtitle, icon, slotA, slotB, nameA, nameB, metricsA, metricsB, metricKeys, lang, colorA, colorB }: {
  title: string
  subtitle: string
  icon: React.ReactNode
  slotA: SlotData
  slotB: SlotData
  nameA: string
  nameB: string
  metricsA: ExtractedMetrics
  metricsB: ExtractedMetrics
  metricKeys: string[]
  lang: 'es' | 'en'
  colorA: string
  colorB: string
}) {
  const specA = metricsA.spectral
  const specB = metricsB.spectral
  if (!specA || !specB) return null

  return (
    <div style={{
      background: 'var(--mr-bg-card)', borderRadius: 'var(--mr-radius)',
      border: '1px solid var(--mr-border)', padding: '1.5rem',
      boxShadow: 'var(--mr-shadow)', marginBottom: '1.5rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {icon}
        <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>{title}</h3>
      </div>
      <p style={{ color: 'var(--mr-text-tertiary)', fontSize: '0.8125rem', margin: '0 0 1.25rem' }}>{subtitle}</p>

      {/* Filenames */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--mr-text-secondary)' }}>
        <span><strong>A:</strong> {truncateFilename(slotA.file?.name || '', 25)}</span>
        <span><strong>B:</strong> {truncateFilename(slotB.file?.name || '', 25)}</span>
      </div>

      {/* Metric deltas */}
      {metricKeys.length > 0 && (
        <MetricDeltaTable metricsA={metricsA} metricsB={metricsB} metricKeys={metricKeys} lang={lang} />
      )}

      {/* Spectral comparison */}
      <SpectralComparison specA={specA} specB={specB} nameA={nameA} nameB={nameB} lang={lang} colorA={colorA} colorB={colorB} />
    </div>
  )
}

// ============================================================================
// CROSS-EXAM PANEL
// ============================================================================

function CrossExamPanel({ mixM, masterM, refM, refMasterM, lang, mixSlot, masterSlot, refSlot, refMasterSlot }: {
  mixM: ExtractedMetrics
  masterM: ExtractedMetrics
  refM: ExtractedMetrics
  refMasterM: ExtractedMetrics
  lang: 'es' | 'en'
  mixSlot: SlotData
  masterSlot: SlotData
  refSlot: SlotData
  refMasterSlot: SlotData
}) {
  // Calculate process deltas
  const yourDelta: Record<string, number | null> = {}
  const proDelta: Record<string, number | null> = {}

  for (const def of METRIC_DEFS) {
    const k = def.key as keyof ExtractedMetrics
    const mA = mixM[k] as number | null
    const mB = masterM[k] as number | null
    const rA = refM[k] as number | null
    const rB = refMasterM[k] as number | null
    yourDelta[def.key] = mA !== null && mB !== null ? mB - mA : null
    proDelta[def.key] = rA !== null && rB !== null ? rB - rA : null
  }

  // Calculate match per metric
  const matchResults: { key: string; yours: number | null; pro: number | null; diff: number | null; level: 'close' | 'moderate' | 'far' }[] = []
  let matchTotal = 0
  let matchCount = 0

  for (const def of METRIC_DEFS) {
    const y = yourDelta[def.key]
    const p = proDelta[def.key]
    const diff = y !== null && p !== null ? y - p : null
    const level = diff !== null ? matchLevel(diff, def.thresholds.close, def.thresholds.moderate) : 'far'
    matchResults.push({ key: def.key, yours: y, pro: p, diff, level })
    if (diff !== null) {
      matchTotal += level === 'close' ? 100 : level === 'moderate' ? 50 : 0
      matchCount++
    }
  }

  // Spectral cross-exam
  const specMatchResults: { band: typeof BANDS[number]; yourDelta: number; proDelta: number; diff: number; level: 'close' | 'moderate' | 'far' }[] = []
  if (mixM.spectral && masterM.spectral && refM.spectral && refMasterM.spectral) {
    for (const band of BANDS) {
      const yD = (masterM.spectral[band.key] ?? 0) - (mixM.spectral[band.key] ?? 0)
      const pD = (refMasterM.spectral[band.key] ?? 0) - (refM.spectral[band.key] ?? 0)
      const diff = yD - pD
      const level = matchLevel(diff, 1.5, 3.0)
      specMatchResults.push({ band, yourDelta: yD, proDelta: pD, diff, level })
      matchTotal += level === 'close' ? 100 : level === 'moderate' ? 50 : 0
      matchCount++
    }
  }

  const overallMatch = matchCount > 0 ? Math.round(matchTotal / matchCount) : 0
  const overallColor = overallMatch >= 70 ? 'var(--mr-green)' : overallMatch >= 40 ? 'var(--mr-amber)' : 'var(--mr-red)'

  return (
    <div style={{
      background: 'var(--mr-bg-card)', borderRadius: 'var(--mr-radius)',
      border: '2px solid var(--mr-purple, #7c3aed)', padding: '1.5rem',
      boxShadow: 'var(--mr-shadow)', marginBottom: '1.5rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <GitCompare size={20} style={{ color: 'var(--mr-purple, #7c3aed)' }} />
        <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
          {lang === 'es' ? 'Cross-Exam: Comparación de Proceso' : 'Cross-Exam: Process Comparison'}
        </h3>
      </div>
      <p style={{ color: 'var(--mr-text-tertiary)', fontSize: '0.8125rem', margin: '0 0 1.25rem' }}>
        {lang === 'es'
          ? 'Compara lo que hizo tu mastering vs lo que hizo el ingeniero de referencia.'
          : 'Compare what your mastering did vs what the reference engineer did.'}
      </p>

      {/* Overall match */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
        padding: '1rem', borderRadius: 'var(--mr-radius-sm)',
        background: 'var(--mr-bg-elevated)', marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: overallColor }}>{overallMatch}%</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            {lang === 'es' ? 'Similitud de proceso' : 'Process similarity'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--mr-text-tertiary)' }}>
            {overallMatch >= 70
              ? (lang === 'es' ? 'Enfoque similar al de la referencia' : 'Similar approach to the reference')
              : overallMatch >= 40
              ? (lang === 'es' ? 'Enfoque parcialmente diferente' : 'Partially different approach')
              : (lang === 'es' ? 'Enfoque muy diferente al de la referencia' : 'Very different approach from the reference')}
          </div>
        </div>
      </div>

      {/* Process labels */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--mr-text-secondary)' }}>
        <span><strong>{lang === 'es' ? 'Tu proceso' : 'Your process'}:</strong> {truncateFilename(mixSlot.file?.name || '', 15)} → {truncateFilename(masterSlot.file?.name || '', 15)}</span>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--mr-text-secondary)' }}>
        <span><strong>{lang === 'es' ? 'Proceso ref.' : 'Ref. process'}:</strong> {truncateFilename(refSlot.file?.name || '', 15)} → {truncateFilename(refMasterSlot.file?.name || '', 15)}</span>
      </div>

      {/* Metric cross-exam table */}
      <div style={{
        display: 'grid', gridTemplateColumns: '100px 80px 80px 40px', gap: '0.5rem',
        padding: '0.5rem 0.5rem', fontSize: '0.6875rem', fontWeight: 600,
        color: 'var(--mr-text-tertiary)', borderBottom: '1px solid var(--mr-border)',
      }}>
        <div>{lang === 'es' ? 'Métrica' : 'Metric'}</div>
        <div style={{ textAlign: 'right' }}>{lang === 'es' ? 'Tu Δ' : 'Your Δ'}</div>
        <div style={{ textAlign: 'right' }}>{lang === 'es' ? 'Ref Δ' : 'Ref Δ'}</div>
        <div style={{ textAlign: 'center' }}></div>
      </div>

      {matchResults.map((r, i) => {
        const def = METRIC_DEFS.find(d => d.key === r.key)!
        const mi = matchIcon(r.level)
        const decimals = r.key === 'stereoCorr' ? 2 : 1
        return (
          <div key={r.key} style={{
            display: 'grid', gridTemplateColumns: '100px 80px 80px 40px', gap: '0.5rem',
            padding: '0.5rem 0.5rem', alignItems: 'center', fontSize: '0.8125rem',
            background: i % 2 === 0 ? 'transparent' : 'var(--mr-bg-hover)',
            borderRadius: 'var(--mr-radius-sm)',
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{lang === 'es' ? def.es : def.en}</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--mr-text-secondary)' }}>
              {fmtDelta(r.yours, decimals)}
            </div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--mr-text-secondary)' }}>
              {fmtDelta(r.pro, decimals)}
            </div>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.9375rem', color: mi.color }}>{mi.icon}</div>
          </div>
        )
      })}

      {/* Spectral cross-exam */}
      {specMatchResults.length > 0 && (
        <>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--mr-border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              {lang === 'es' ? 'EQ: Cambio por banda' : 'EQ: Per-band change'}
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '90px 70px 70px 40px', gap: '0.5rem',
            padding: '0.5rem 0.5rem', fontSize: '0.6875rem', fontWeight: 600,
            color: 'var(--mr-text-tertiary)', borderBottom: '1px solid var(--mr-border)',
          }}>
            <div>{lang === 'es' ? 'Banda' : 'Band'}</div>
            <div style={{ textAlign: 'right' }}>{lang === 'es' ? 'Tu Δ' : 'Your Δ'}</div>
            <div style={{ textAlign: 'right' }}>{lang === 'es' ? 'Ref Δ' : 'Ref Δ'}</div>
            <div style={{ textAlign: 'center' }}></div>
          </div>

          {specMatchResults.map((r, i) => {
            const mi = matchIcon(r.level)
            return (
              <div key={r.band.key} style={{
                display: 'grid', gridTemplateColumns: '90px 70px 70px 40px', gap: '0.5rem',
                padding: '0.5rem 0.5rem', alignItems: 'center', fontSize: '0.8125rem',
                background: i % 2 === 0 ? 'transparent' : 'var(--mr-bg-hover)',
                borderRadius: 'var(--mr-radius-sm)',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{lang === 'es' ? r.band.es : r.band.en}</div>
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--mr-text-secondary)' }}>
                  {fmtDelta(r.yourDelta)}%
                </div>
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--mr-text-secondary)' }}>
                  {fmtDelta(r.proDelta)}%
                </div>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.9375rem', color: mi.color }}>{mi.icon}</div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MasteringLabPage() {
  const { user, session } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [lang, setLang] = useState<'es' | 'en'>('es')

  const [slotMix, setSlotMix] = useState<SlotData>({ ...INITIAL_SLOT })
  const [slotRef, setSlotRef] = useState<SlotData>({ ...INITIAL_SLOT })
  const [slotMaster, setSlotMaster] = useState<SlotData>({ ...INITIAL_SLOT })
  const [slotRefMaster, setSlotRefMaster] = useState<SlotData>({ ...INITIAL_SLOT })

  const pollMix = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollMaster = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRefMaster = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setLang(detectLanguage()) }, [])

  // Admin check
  useEffect(() => {
    if (!user?.id || !session) { setIsAdmin(false); setAdminChecked(true); return }
    const check = async () => {
      try {
        const fresh = await createFreshQueryClient({ access_token: session.access_token, refresh_token: session.refresh_token })
        const { data } = await fresh.from('profiles').select('is_admin').eq('id', user.id).single()
        setIsAdmin(data?.is_admin === true)
      } catch { setIsAdmin(false) }
      setAdminChecked(true)
    }
    check()
  }, [user?.id, session?.access_token])

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollMix.current) clearInterval(pollMix.current)
      if (pollRef.current) clearInterval(pollRef.current)
      if (pollMaster.current) clearInterval(pollMaster.current)
      if (pollRefMaster.current) clearInterval(pollRefMaster.current)
    }
  }, [])

  // Slot routing
  const getSlotParts = useCallback((id: SlotId) => {
    switch (id) {
      case 'mix': return { set: setSlotMix, poll: pollMix }
      case 'ref': return { set: setSlotRef, poll: pollRef }
      case 'master': return { set: setSlotMaster, poll: pollMaster }
      case 'refMaster': return { set: setSlotRefMaster, poll: pollRefMaster }
    }
  }, [])

  const analyzeFile = useCallback(async (id: SlotId, file: File) => {
    const { set: setSlot, poll: pollRefSlot } = getSlotParts(id)
    if (pollRefSlot.current) { clearInterval(pollRefSlot.current); pollRefSlot.current = null }
    setSlot({ state: 'uploading', file, progress: 5, result: null, error: null, jobId: null })

    try {
      const response = await startAnalysisPolling(file, { lang, mode: 'short', strict: false, genre: null, isAuthenticated: true })
      const jobId = response.job_id
      setSlot(prev => ({ ...prev, state: 'analyzing', progress: 10, jobId }))

      pollRefSlot.current = setInterval(async () => {
        try {
          const status = await getAnalysisStatus(jobId, lang)
          if (status.progress !== undefined) setSlot(prev => ({ ...prev, progress: Math.max(prev.progress, status.progress) }))
          if (status.status === 'complete' && status.result) {
            if (pollRefSlot.current) clearInterval(pollRefSlot.current)
            pollRefSlot.current = null
            setSlot(prev => ({ ...prev, state: 'done', progress: 100, result: status.result }))
          } else if (status.status === 'error') {
            if (pollRefSlot.current) clearInterval(pollRefSlot.current)
            pollRefSlot.current = null
            setSlot(prev => ({ ...prev, state: 'error', error: status.error || 'Analysis error' }))
          }
        } catch { /* transient */ }
      }, 3000)
    } catch (err: any) {
      setSlot(prev => ({ ...prev, state: 'error', error: err.message || 'Upload error' }))
    }
  }, [lang, getSlotParts])

  const handleReset = useCallback((id: SlotId) => {
    const { set: setSlot, poll: pollRefSlot } = getSlotParts(id)
    if (pollRefSlot.current) { clearInterval(pollRefSlot.current); pollRefSlot.current = null }
    setSlot({ ...INITIAL_SLOT })
  }, [getSlotParts])

  // Auth gates
  if (!adminChecked) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--mr-bg-base)' }}>
      <span style={{ color: 'var(--mr-text-secondary)' }}>{lang === 'es' ? 'Verificando acceso...' : 'Verifying access...'}</span>
    </div>
  )
  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '1rem', background: 'var(--mr-bg-base)' }}>
      <p style={{ color: 'var(--mr-text-primary)', margin: 0 }}>{lang === 'es' ? 'Inicia sesión para acceder' : 'Log in to access'}</p>
      <Link href="/admin" style={{ color: 'var(--mr-primary)', textDecoration: 'underline' }}>{lang === 'es' ? 'Ir a Admin' : 'Go to Admin'}</Link>
    </div>
  )
  if (!isAdmin) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '1rem', background: 'var(--mr-bg-base)' }}>
      <p style={{ color: 'var(--mr-text-primary)', margin: 0 }}>{lang === 'es' ? 'Acceso denegado' : 'Access denied'}</p>
      <Link href="/" style={{ color: 'var(--mr-primary)', textDecoration: 'underline' }}>{lang === 'es' ? 'Volver al inicio' : 'Back to home'}</Link>
    </div>
  )

  // Extract metrics
  const mMix = extractMetrics(slotMix.result)
  const mRef = extractMetrics(slotRef.result)
  const mMaster = extractMetrics(slotMaster.result)
  const mRefMaster = extractMetrics(slotRefMaster.result)

  // Determine which comparisons are available
  const mixDone = slotMix.state === 'done' && mMix
  const refDone = slotRef.state === 'done' && mRef
  const masterDone = slotMaster.state === 'done' && mMaster
  const refMasterDone = slotRefMaster.state === 'done' && mRefMaster

  const canCrossExam = mixDone && refDone && masterDone && refMasterDone
  const canMixVsMaster = mixDone && masterDone
  const canMasterVsRefMaster = masterDone && refMasterDone
  const canMixVsRef = mixDone && refDone
  const canRefVsRefMaster = refDone && refMasterDone

  const anyComparison = canCrossExam || canMixVsMaster || canMasterVsRefMaster || canMixVsRef || canRefVsRefMaster
  const slotsAnalyzing = [slotMix, slotRef, slotMaster, slotRefMaster].some(s => s.state === 'uploading' || s.state === 'analyzing')
  const slotsDone = [slotMix, slotRef, slotMaster, slotRefMaster].filter(s => s.state === 'done').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mr-bg-base)', color: 'var(--mr-text-primary)', overflowX: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--mr-border)', background: 'var(--mr-bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/admin" style={{ color: 'var(--mr-text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} style={{ color: 'var(--mr-purple, #7c3aed)' }} />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {lang === 'es' ? 'Mastering Lab' : 'Mastering Lab'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/admin/comparison" style={{ fontSize: '0.8125rem', color: 'var(--mr-text-secondary)', textDecoration: 'underline' }}>
            {lang === 'es' ? 'Comparador EQ' : 'EQ Comparator'}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <p style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
          {lang === 'es'
            ? 'Sube hasta 4 archivos para comparar procesos de mastering, resultados y perfiles de frecuencia.'
            : 'Upload up to 4 files to compare mastering processes, results, and frequency profiles.'}
        </p>
        <p style={{ color: 'var(--mr-text-tertiary)', marginBottom: '2rem', fontSize: '0.8125rem' }}>
          {lang === 'es'
            ? 'Cada archivo se analiza de forma independiente. Las comparaciones aparecen automáticamente.'
            : 'Each file is analyzed independently. Comparisons appear automatically.'}
        </p>

        {/* Upload grid — 2x2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem', marginBottom: '2rem',
        }}>
          <UploadSlot
            label={lang === 'es' ? 'Tu Mezcla' : 'Your Mix'}
            slot={slotMix} lang={lang} accentColor="var(--mr-primary)"
            onFileSelected={(f) => analyzeFile('mix', f)} onReset={() => handleReset('mix')}
          />
          <UploadSlot
            label={lang === 'es' ? 'Referencia' : 'Reference Track'}
            slot={slotRef} lang={lang} accentColor="var(--mr-amber)"
            onFileSelected={(f) => analyzeFile('ref', f)} onReset={() => handleReset('ref')}
          />
          <UploadSlot
            label={lang === 'es' ? 'Tu Master' : 'Your Master'}
            slot={slotMaster} lang={lang} accentColor="#8b5cf6"
            onFileSelected={(f) => analyzeFile('master', f)} onReset={() => handleReset('master')}
          />
          <UploadSlot
            label={lang === 'es' ? 'Master de Referencia' : 'Reference Master'}
            slot={slotRefMaster} lang={lang} accentColor="var(--mr-green)"
            onFileSelected={(f) => analyzeFile('refMaster', f)} onReset={() => handleReset('refMaster')}
          />
        </div>

        {/* Status line */}
        {!anyComparison && (
          <p style={{ textAlign: 'center', color: 'var(--mr-text-tertiary)', fontSize: '0.8125rem', marginBottom: '2rem' }}>
            {slotsAnalyzing
              ? (lang === 'es' ? 'Analizando...' : 'Analyzing...')
              : slotsDone === 1
              ? (lang === 'es' ? 'Sube al menos un archivo más para ver comparaciones.' : 'Upload at least one more file to see comparisons.')
              : slotsDone === 0
              ? (lang === 'es' ? 'Sube al menos 2 archivos para comenzar.' : 'Upload at least 2 files to get started.')
              : null
            }
          </p>
        )}

        {/* Score overview (when 2+ done) */}
        {slotsDone >= 2 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap',
            marginBottom: '2rem', padding: '1rem', background: 'var(--mr-bg-card)',
            borderRadius: 'var(--mr-radius)', border: '1px solid var(--mr-border)',
          }}>
            {[
              { slot: slotMix, label: lang === 'es' ? 'Mezcla' : 'Mix', color: 'var(--mr-primary)' },
              { slot: slotRef, label: lang === 'es' ? 'Ref' : 'Ref', color: 'var(--mr-amber)' },
              { slot: slotMaster, label: lang === 'es' ? 'Master' : 'Master', color: '#8b5cf6' },
              { slot: slotRefMaster, label: lang === 'es' ? 'Ref Master' : 'Ref Master', color: 'var(--mr-green)' },
            ].filter(s => s.slot.state === 'done').map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', color: s.color, fontWeight: 600, marginBottom: '0.25rem' }}>{s.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: getScoreColor(s.slot.result?.score) }}>
                  {s.slot.result?.score ?? '-'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--mr-text-tertiary)', marginTop: '0.125rem' }}>
                  {truncateFilename(s.slot.file?.name || '', 18)}
                </div>
              </div>
            ))}
            {slotsDone >= 2 && (
              <div style={{
                alignSelf: 'center', fontSize: '0.6875rem', color: 'var(--mr-text-tertiary)',
                fontStyle: 'italic', maxWidth: '180px', textAlign: 'center',
              }}>
                {lang === 'es'
                  ? 'Score evalúa preparación para mastering, no calidad del master terminado.'
                  : 'Score evaluates mastering readiness, not finished master quality.'}
              </div>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────── */}
        {/* COMPARISONS                                              */}
        {/* ──────────────────────────────────────────────────────── */}

        {/* 1. Cross-Exam (highest value, only when all 4) */}
        {canCrossExam && (
          <CrossExamPanel
            mixM={mMix!} masterM={mMaster!} refM={mRef!} refMasterM={mRefMaster!} lang={lang}
            mixSlot={slotMix} masterSlot={slotMaster} refSlot={slotRef} refMasterSlot={slotRefMaster}
          />
        )}

        {/* 2. Mix → Your Master */}
        {canMixVsMaster && (
          <ComparisonPanel
            title={lang === 'es' ? 'Mezcla → Tu Master' : 'Mix → Your Master'}
            subtitle={lang === 'es' ? 'Qué cambió tu proceso de mastering.' : 'What your mastering process changed.'}
            icon={<Zap size={18} style={{ color: '#8b5cf6' }} />}
            slotA={slotMix} slotB={slotMaster}
            nameA={lang === 'es' ? 'Mezcla' : 'Mix'} nameB={lang === 'es' ? 'Master' : 'Master'}
            metricsA={mMix!} metricsB={mMaster!}
            metricKeys={COMPARISON_METRICS.mix_vs_master} lang={lang}
            colorA="var(--mr-primary)" colorB="#8b5cf6"
          />
        )}

        {/* 3. Your Master vs Reference Master */}
        {canMasterVsRefMaster && (
          <ComparisonPanel
            title={lang === 'es' ? 'Tu Master vs Master de Referencia' : 'Your Master vs Reference Master'}
            subtitle={lang === 'es' ? 'Qué tan cerca está tu resultado del objetivo.' : 'How close your result is to the target.'}
            icon={<Target size={18} style={{ color: 'var(--mr-green)' }} />}
            slotA={slotMaster} slotB={slotRefMaster}
            nameA={lang === 'es' ? 'Tu Master' : 'Your Master'} nameB={lang === 'es' ? 'Ref Master' : 'Ref Master'}
            metricsA={mMaster!} metricsB={mRefMaster!}
            metricKeys={COMPARISON_METRICS.master_vs_refmaster} lang={lang}
            colorA="#8b5cf6" colorB="var(--mr-green)"
          />
        )}

        {/* 4. Reference → Reference Master */}
        {canRefVsRefMaster && (
          <ComparisonPanel
            title={lang === 'es' ? 'Referencia → Master de Referencia' : 'Reference → Reference Master'}
            subtitle={lang === 'es' ? 'Qué hizo el ingeniero profesional (la "respuesta").' : 'What the professional engineer did (the "answer key").'}
            icon={<Music size={18} style={{ color: 'var(--mr-amber)' }} />}
            slotA={slotRef} slotB={slotRefMaster}
            nameA={lang === 'es' ? 'Ref Track' : 'Ref Track'} nameB={lang === 'es' ? 'Ref Master' : 'Ref Master'}
            metricsA={mRef!} metricsB={mRefMaster!}
            metricKeys={COMPARISON_METRICS.ref_vs_refmaster} lang={lang}
            colorA="var(--mr-amber)" colorB="var(--mr-green)"
          />
        )}

        {/* 5. Mix vs Reference (EQ only) */}
        {canMixVsRef && mMix!.spectral && mRef!.spectral && (
          <ComparisonPanel
            title={lang === 'es' ? 'Tu Mezcla vs Referencia (EQ)' : 'Your Mix vs Reference (EQ)'}
            subtitle={lang === 'es' ? 'Comparación tonal. El volumen no afecta estos valores.' : 'Tonal comparison. Volume does not affect these values.'}
            icon={<BarChart3 size={18} style={{ color: 'var(--mr-primary)' }} />}
            slotA={slotMix} slotB={slotRef}
            nameA={lang === 'es' ? 'Mezcla' : 'Mix'} nameB={lang === 'es' ? 'Referencia' : 'Reference'}
            metricsA={mMix!} metricsB={mRef!}
            metricKeys={COMPARISON_METRICS.mix_vs_ref} lang={lang}
            colorA="var(--mr-primary)" colorB="var(--mr-amber)"
          />
        )}
      </main>
    </div>
  )
}
