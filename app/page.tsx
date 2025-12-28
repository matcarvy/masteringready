'use client'

import React, { useRef, useState } from 'react'
import { ArrowRight, Check, Shield, Upload, Zap, FileAudio2, Loader2, BarChart2, Download, AlertCircle, XCircle, Music2, Gauge, TrendingUp, ChevronDown } from 'lucide-react'

type Language = 'es' | 'en'

interface Metric {
  name: string
  value: string
  status: 'pass' | 'warn' | 'fail' | 'info'
  message: string
}

interface SectionAnalysis {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

interface AnalysisResult {
  file: {
    path: string
    duration_seconds?: number
    sample_rate_hz?: number
    channels?: number
    genre?: string
  }
  metrics: Metric[]
  technical_summary: string[]
  musical_summary: string[]
  suggestions: string[]
  sections?: SectionAnalysis[]
  raw_text?: string
  short_feedback?: string
  score?: number
  severity?: 'low' | 'medium' | 'high'
  recommendations?: string[]
  notes?: string[]
}

const gradientBg = {
  background: 'radial-gradient(circle at top left, rgba(129, 140, 248, 0.25) 0, transparent 55%), radial-gradient(circle at bottom right, rgba(244, 114, 182, 0.18) 0, transparent 55%), linear-gradient(135deg, #0f172a 0%, #020617 100%)'
}

const cardStyle = {
  background: 'rgba(15, 23, 42, 0.9)',
  borderRadius: '1.25rem',
  border: '1px solid rgba(148, 163, 184, 0.5)',
  boxShadow: '0 22px 80px rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(24px)'
}

const pillStyle = {
  background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08), rgba(236, 72, 153, 0.12))',
  borderRadius: '999px',
  padding: '0.35rem 0.75rem',
  border: '1px solid rgba(148, 163, 184, 0.7)'
}

const badgeStyle = {
  borderRadius: '999px',
  padding: '0.25rem 0.75rem',
  border: '1px solid rgba(148, 163, 184, 0.5)'
}

const labelStyle = {
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const
}

const iconBadgeStyle = {
  padding: '0.4rem',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.6)',
  background: 'radial-gradient(circle at top, rgba(148, 163, 184, 0.45), rgba(15, 23, 42, 0.95))'
}

// Helper to get metric icon and colors
const getMetricStatusStyles = (status: Metric['status']) => {
  switch (status) {
    case 'pass':
      return {
        icon: '✅',
        borderColor: '#22c55e',
        bg: 'rgba(22, 163, 74, 0.08)',
        textColor: '#16a34a'
      }
    case 'warn':
      return {
        icon: '⚠️',
        borderColor: '#f97316',
        bg: 'rgba(245, 158, 11, 0.08)',
        textColor: '#ea580c'
      }
    case 'fail':
      return {
        icon: '❌',
        borderColor: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.08)',
        textColor: '#b91c1c'
      }
    default:
      return {
        icon: 'ℹ️',
        borderColor: '#64748b',
        bg: 'rgba(148, 163, 184, 0.08)',
        textColor: '#475569'
      }
  }
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<Language>('es')
  const [error, setError] = useState<string | null>(null)
  const [showRawText, setShowRawText] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [firstAnalysisDone, setFirstAnalysisDone] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'compressing' | 'analyzing' | 'generating' | 'completed'>('idle')
  const [compressing, setCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const analyzerRef = useRef<HTMLDivElement | null>(null)

  const scrollToAnalyzer = () => {
    analyzerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Progress message helper
  const getProgressMessage = (progress: number) => {
    if (progress < 5) {
      return lang === 'es' ? 'Cargando archivo...' : 'Loading file...'
    } else if (progress < 10) {
      return compressing
        ? (lang === 'es' ? 'Comprimiendo archivo...' : 'Compressing file...')
        : (lang === 'es' ? 'Preparando análisis...' : 'Preparing analysis...')
    } else if (progress < 70) {
      return lang === 'es' ? 'Analizando audio...' : 'Analyzing audio...'
    } else {
      return lang === 'es' ? 'Generando reportes...' : 'Generating reports...'
    }
  }

  const handleFileChange = (f: File | null) => {
    setUploadError(null)
    setError(null)
    setResult(null)
    setFirstAnalysisDone(false)
    setProgress(0)
    setUploadStatus('idle')

    if (!f) {
      setFile(null)
      return
    }

    const maxSize = 100 * 1024 * 1024
    if (f.size > maxSize) {
      setUploadError(
        lang === 'es'
          ? 'El archivo es demasiado grande. El tamaño máximo permitido es de 100 MB.'
          : 'File is too large. Maximum allowed size is 100 MB.'
      )
      setFile(null)
      return
    }

    const validTypes = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/flac', 'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/ogg']
    if (!validTypes.includes(f.type)) {
      setUploadError(
        lang === 'es'
          ? 'Formato de archivo no soportado. Usa WAV, FLAC, MP3, AAC u OGG.'
          : 'Unsupported file format. Please use WAV, FLAC, MP3, AAC or OGG.'
      )
      setFile(null)
      return
    }

    setFile(f)
  }

  const compressAudioIfNeeded = async (inputFile: File): Promise<File> => {
    const maxSize = 50 * 1024 * 1024

    if (inputFile.size <= maxSize) {
      return inputFile
    }

    setCompressing(true)
    setUploadStatus('compressing')
    setProgress(8)

    try {
      let audioContext: AudioContext
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (err) {
        console.warn('AudioContext not available, skipping compression', err)
        return inputFile
      }

      const arrayBuffer = await inputFile.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const sampleRate = 44100
      const targetBitrate = 128000
      const durationSeconds = audioBuffer.duration
      const estimatedMp3Size = (targetBitrate * durationSeconds) / 8

      if (estimatedMp3Size >= inputFile.size) {
        return inputFile
      }

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.floor(audioBuffer.duration * sampleRate),
        sampleRate
      )

      const source = offlineContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(offlineContext.destination)
      source.start(0)

      const renderedBuffer = await offlineContext.startRendering()

      const wavBuffer = audioBufferToWav(renderedBuffer)

      const compressedFile = new File([wavBuffer], inputFile.name.replace(/\.[^/.]+$/, '') + '_compressed.wav', {
        type: 'audio/wav',
        lastModified: Date.now()
      })

      return compressedFile
    } catch (error) {
      console.error('Error while compressing audio:', error)
      return inputFile
    } finally {
      setCompressing(false)
    }
  }

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numOfChan = buffer.numberOfChannels
    const length = buffer.length * numOfChan * 2 + 44
    const bufferArray = new ArrayBuffer(length)
    const view = new DataView(bufferArray)

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    let offset = 0

    writeString(view, offset, 'RIFF')
    offset += 4
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true)
    offset += 4
    writeString(view, offset, 'WAVE')
    offset += 4
    writeString(view, offset, 'fmt ')
    offset += 4

    view.setUint32(offset, 16, true)
    offset += 4
    view.setUint16(offset, 1, true)
    offset += 2

    view.setUint16(offset, numOfChan, true)
    offset += 2
    view.setUint32(offset, buffer.sampleRate, true)
    offset += 4

    view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true)
    offset += 4
    view.setUint16(offset, numOfChan * 2, true)
    offset += 2
    view.setUint16(offset, 16, true)
    offset += 2

    writeString(view, offset, 'data')
    offset += 4
    view.setUint32(offset, buffer.length * numOfChan * 2, true)
    offset += 4

    const channels = []
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i))
    }

    let sample = 0
    while (sample < buffer.length) {
      for (let ch = 0; ch < numOfChan; ch++) {
        const s = Math.max(-1, Math.min(1, channels[ch][sample]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
        offset += 2
      }
      sample++
    }

    return bufferArray
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    const f = e.dataTransfer.files?.[0]
    if (f) {
      handleFileChange(f)
    }
  }

  const resetState = () => {
    setResult(null)
    setError(null)
    setShowRawText(false)
    setShowAdvanced(false)
    setUploadError(null)
    setProgress(0)
    setUploadStatus('idle')
    setCompressing(false)
  }

  const trans = {
    es: {
      heroPill: 'Metodología probada en más de 300 producciones profesionales',
      heroTitle: '¿Tu mezcla está lista para el mastering?',
      heroSubtitle: 'Análisis técnico en 60 segundos + recomendaciones basadas en metodologías profesionales',
      heroCTA: 'Pruébalo sin costo',
      heroFeature1: 'Privacy-first',
      heroFeature2: 'Inglés y Español',
      demoScore: 'Puntuación',
      demoMetrics: {
        headroom: 'Headroom',
        truePeak: 'True Peak',
        stereoBalance: 'Balance Estéreo'
      },
      demoStatus: 'Lista para mastering profesional',
      whyTitle: '¿Por qué MasteringReady?',
      whySubtitle: 'Metodología profesional basada en 300+ producciones',
      feature1Title: 'Análisis en 60 segundos o menos',
      feature1Desc: 'Headroom, LUFS, True Peak, balance de frecuencias, estéreo y más.',
      feature2Title: 'Privacy-First',
      feature2Desc: 'Tu audio se analiza solo en memoria y se elimina inmediatamente.',
      feature3Title: 'Metodología Profesional',
      feature3Desc: 'Basado en técnicas de ingenieros top.',
      analyzerTitle: 'Analiza Tu Mezcla Ahora',
      analyzerSubtitle: 'Sube tu archivo y obtén un reporte profesional en 60 segundos o menos',
      privacyBadgeTitle: 'Privacy-First Analyzer',
      privacyBadgeDesc: 'Tu audio se analiza solo en memoria y se elimina inmediatamente.',
      dropTitle: 'Arrastra tu mezcla aquí',
      dropSubtitle: 'WAV, FLAC, MP3, AAC u OGG hasta 100 MB',
      or: 'o',
      browseButton: 'Selecciona un archivo',
      loadingMessage: 'Analizando tu mezcla... Esto normalmente toma menos de 60 segundos.',
      loadingFooter: 'Puedes seguir navegando. Te mostraremos el resultado aquí mismo.',
      analysisReadyTitle: 'Tu análisis está listo',
      analysisReadySubtitle: 'Esto es lo que encontramos en tu mezcla.',
      technicalSummaryTitle: 'Resumen Técnico',
      musicalSummaryTitle: 'Resumen Musical / Contextual',
      suggestionsTitle: 'Recomendaciones para Mejorar',
      sectionsTitle: 'Análisis por Secciones',
      rawTextToggle: 'Ver análisis técnico en texto completo',
      rawTextHide: 'Ocultar análisis técnico completo',
      advancedToggle: 'Ver detalles avanzados',
      advancedHide: 'Ocultar detalles avanzados',
      backButton: 'Analizar otra mezcla',
      errorTitle: 'Ocurrió un error',
      errorRetry: 'Intenta de nuevo',
      uploadErrorTitle: 'Error de archivo',
      uploadErrorDescription: 'Por favor revisa el formato y tamaño del archivo.',
      scoreLabel: 'Score',
      severityLow: 'Ajustes menores recomendados',
      severityMedium: 'Mejoras importantes sugeridas',
      severityHigh: 'Requiere correcciones críticas',
      fileInfoTitle: 'Información del archivo',
      durationLabel: 'Duración',
      sampleRateLabel: 'Sample Rate',
      channelsLabel: 'Canales',
      genreLabel: 'Género (si fue detectado)',
      noGenre: 'No especificado',
      downloadTxt: 'Descargar reporte como TXT',
      shortFeedbackTitle: 'Resumen Ejecutivo',
      recommendationsTitle: 'Recomendaciones Clave',
      notesTitle: 'Notas adicionales',
      phase: {
        idle: 'Listo para analizar tu mezcla.',
        uploading: 'Subiendo archivo...',
        compressing: 'Comprimiendo archivo...',
        analyzing: 'Analizando audio...',
        generating: 'Generando reportes...',
        completed: 'Análisis completado.'
      },
      metricLabels: {
        headroom: 'Headroom',
        lufs: 'LUFS Integrado',
        truePeak: 'True Peak',
        crestFactor: 'Crest Factor',
        stereoWidth: 'Anchura Estéreo',
        phase: 'Fase',
        dynamics: 'Dinámica',
        tonalBalance: 'Balance Tonal'
      },
      downloadNote: 'El reporte TXT incluye todos los detalles técnicos y recomendaciones.',
      introPill: 'Desarrollado por ingeniero de mastering con crédito Latin Grammy',
      ctaSecondary: 'Analizar Gratis',
      progressTimeHint: 'Puede tardar hasta 60 segundos'
    },
    en: {
      heroPill: 'Methodology proven in over 300 professional productions',
      heroTitle: 'Is your mix ready for mastering?',
      heroSubtitle: 'Technical analysis in 60 seconds + recommendations based on professional methodologies',
      heroCTA: 'Try it free',
      heroFeature1: 'Privacy-first',
      heroFeature2: 'English & Spanish',
      demoScore: 'Score',
      demoMetrics: {
        headroom: 'Headroom',
        truePeak: 'True Peak',
        stereoBalance: 'Stereo Balance'
      },
      demoStatus: 'Ready for professional mastering',
      whyTitle: 'Why MasteringReady?',
      whySubtitle: 'Professional methodology based on 300+ productions',
      feature1Title: 'Analysis in 60 seconds or less',
      feature1Desc: 'Headroom, LUFS, True Peak, frequency balance, stereo and more.',
      feature2Title: 'Privacy-First',
      feature2Desc: 'Your audio is analyzed in-memory only and deleted immediately.',
      feature3Title: 'Professional Methodology',
      feature3Desc: 'Based on techniques from top engineers.',
      analyzerTitle: 'Analyze Your Mix Now',
      analyzerSubtitle: 'Upload your file and get a professional report in 60 seconds or less',
      privacyBadgeTitle: 'Privacy-First Analyzer',
      privacyBadgeDesc: 'Your audio is analyzed in-memory only and deleted immediately.',
      dropTitle: 'Drag your mix here',
      dropSubtitle: 'WAV, FLAC, MP3, AAC or OGG up to 100 MB',
      or: 'or',
      browseButton: 'Choose a file',
      loadingMessage: 'Analyzing your mix... This usually takes less than 60 seconds.',
      loadingFooter: 'You can keep browsing. We’ll show the result right here.',
      analysisReadyTitle: 'Your analysis is ready',
      analysisReadySubtitle: 'Here’s what we found in your mix.',
      technicalSummaryTitle: 'Technical Summary',
      musicalSummaryTitle: 'Musical / Context Summary',
      suggestionsTitle: 'Suggestions To Improve',
      sectionsTitle: 'Section-Based Analysis',
      rawTextToggle: 'View full technical analysis text',
      rawTextHide: 'Hide full technical analysis',
      advancedToggle: 'View advanced details',
      advancedHide: 'Hide advanced details',
      backButton: 'Analyze another mix',
      errorTitle: 'An error occurred',
      errorRetry: 'Try again',
      uploadErrorTitle: 'File error',
      uploadErrorDescription: 'Please check the file format and size.',
      scoreLabel: 'Score',
      severityLow: 'Minor adjustments recommended',
      severityMedium: 'Important improvements suggested',
      severityHigh: 'Requires critical fixes',
      fileInfoTitle: 'File Info',
      durationLabel: 'Duration',
      sampleRateLabel: 'Sample Rate',
      channelsLabel: 'Channels',
      genreLabel: 'Genre (if detected)',
      noGenre: 'Not specified',
      downloadTxt: 'Download report as TXT',
      shortFeedbackTitle: 'Executive Summary',
      recommendationsTitle: 'Key Recommendations',
      notesTitle: 'Additional Notes',
      phase: {
        idle: 'Ready to analyze your mix.',
        uploading: 'Uploading file...',
        compressing: 'Compressing file...',
        analyzing: 'Analyzing audio...',
        generating: 'Generating reports...',
        completed: 'Analysis completed.'
      },
      metricLabels: {
        headroom: 'Headroom',
        lufs: 'Integrated LUFS',
        truePeak: 'True Peak',
        crestFactor: 'Crest Factor',
        stereoWidth: 'Stereo Width',
        phase: 'Phase',
        dynamics: 'Dynamics',
        tonalBalance: 'Tonal Balance'
      },
      downloadNote: 'The TXT report includes all technical details and recommendations.',
      introPill: 'Built by a mastering engineer with Latin Grammy credit',
      ctaSecondary: 'Analyze Free',
      progressTimeHint: 'May take up to 60 seconds'
    }
  }

  const t = trans[lang]

  const handleAnalyze = async () => {
    if (!file) return

    resetState()
    setLoading(true)
    setUploadStatus('uploading')
    setProgress(3)
    setFirstAnalysisDone(false)

    try {
      const compressedFile = await compressAudioIfNeeded(file)

      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('lang', lang)

      const generateRequestId = () => {
        return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
      }

      const requestId = generateRequestId()
      formData.append('request_id', requestId)

      setUploadStatus('analyzing')
      setProgress((prev) => Math.max(prev, 15))

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to analyze mix')
      }

      const initialData = await res.json()

      setProgress(40)
      setUploadStatus('analyzing')

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/status?request_id=${requestId}`, {
            method: 'GET'
          })

          if (!statusResponse.ok) {
            console.warn('Status check failed')
            return
          }

          const statusData = await statusResponse.json()
          const status = statusData.status || 'analyzing'

          if (status === 'completed') {
            clearInterval(pollInterval)
            if (statusData.result) {
              setResult(statusData.result)
            } else if (initialData.result) {
              setResult(initialData.result)
            } else {
              throw new Error('No analysis result received.')
            }

            setUploadStatus('completed')
            setProgress(100)
            setLoading(false)
            setFirstAnalysisDone(true)
          } else if (status === 'failed') {
            clearInterval(pollInterval)
            throw new Error(statusData.error || 'Analysis failed.')
          } else {
            setUploadStatus('analyzing')
            setProgress((prev) => {
              if (prev < 80) {
                return prev + 7
              }
              return prev
            })
          }
        } catch (error) {
          console.error('Error during status polling:', error)
        }
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || (lang === 'es' ? 'Error analizando la mezcla.' : 'Error analyzing the mix.'))
      setLoading(false)
      setUploadStatus('idle')
      setProgress(0)
    }
  }

  const downloadTxtReport = () => {
    if (!result) return

    const lines: string[] = []

    lines.push(lang === 'es' ? '🎵 REPORTE DE ANÁLISIS DE MEZCLA' : '🎵 MIX ANALYSIS REPORT')
    lines.push('='.repeat(60))
    lines.push('')

    if (result.file?.path) {
      lines.push((lang === 'es' ? 'Archivo: ' : 'File: ') + result.file.path)
    }
    lines.push('')

    if (typeof result.score === 'number') {
      lines.push((lang === 'es' ? 'Puntuación global: ' : 'Overall score: ') + `${result.score}/100`)
      if (result.severity) {
        const severityMap = {
          low: lang === 'es' ? 'Ajustes menores recomendados' : 'Minor adjustments recommended',
          medium: lang === 'es' ? 'Mejoras importantes sugeridas' : 'Important improvements suggested',
          high: lang === 'es' ? 'Requiere correcciones críticas' : 'Requires critical fixes'
        }
        lines.push((lang === 'es' ? 'Severidad: ' : 'Severity: ') + severityMap[result.severity])
      }
      lines.push('')
    }

    if (result.metrics?.length) {
      lines.push(lang === 'es' ? 'Métricas técnicas:' : 'Technical metrics:')
      lines.push('-'.repeat(40))
      result.metrics.forEach((m) => {
        lines.push(`• ${m.name}: ${m.value} (${m.status.toUpperCase()})`)
        lines.push(`  ${m.message}`)
      })
      lines.push('')
    }

    if (result.technical_summary?.length) {
      lines.push(lang === 'es' ? 'Resumen técnico:' : 'Technical summary:')
      lines.push('-'.repeat(40))
      result.technical_summary.forEach((item) => lines.push(`• ${item}`))
      lines.push('')
    }

    if (result.musical_summary?.length) {
      lines.push(lang === 'es' ? 'Resumen musical / contextual:' : 'Musical / contextual summary:')
      lines.push('-'.repeat(40))
      result.musical_summary.forEach((item) => lines.push(`• ${item}`))
      lines.push('')
    }

    if (result.suggestions?.length) {
      lines.push(lang === 'es' ? 'Recomendaciones:' : 'Suggestions:')
      lines.push('-'.repeat(40))
      result.suggestions.forEach((item) => lines.push(`• ${item}`))
      lines.push('')
    }

    if (result.sections?.length) {
      lines.push(lang === 'es' ? 'Análisis por secciones:' : 'Section analysis:')
      lines.push('-'.repeat(40))
      result.sections.forEach((sec) => {
        lines.push(`• ${sec.name} [${sec.status.toUpperCase()}]`)
        lines.push(`  ${sec.message}`)
      })
      lines.push('')
    }

    if (result.raw_text) {
      lines.push(lang === 'es' ? 'Análisis completo:' : 'Full analysis text:')
      lines.push('-'.repeat(40))
      lines.push(result.raw_text)
      lines.push('')
    }

    if (result.short_feedback) {
      lines.push(lang === 'es' ? 'Resumen ejecutivo:' : 'Executive summary:')
      lines.push('-'.repeat(40))
      lines.push(result.short_feedback)
      lines.push('')
    }

    if (result.recommendations?.length) {
      lines.push(lang === 'es' ? 'Recomendaciones clave:' : 'Key recommendations:')
      lines.push('-'.repeat(40))
      result.recommendations.forEach((item) => lines.push(`• ${item}`))
      lines.push('')
    }

    if (result.notes?.length) {
      lines.push(lang === 'es' ? 'Notas adicionales:' : 'Additional notes:')
      lines.push('-'.repeat(40))
      result.notes.forEach((item) => lines.push(`• ${item}`))
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url

    const baseName = result.file?.path ? result.file.path.replace(/\.[^/.]+$/, '') : 'mix_analysis'
    a.download = `${baseName}_report.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds || isNaN(seconds)) return lang === 'es' ? 'No disponible' : 'Not available'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')} min`
  }

  const formatSampleRate = (hz: number | undefined): string => {
    if (!hz || isNaN(hz)) return lang === 'es' ? 'No disponible' : 'Not available'
    return `${hz / 1000} kHz`
  }

  const formatChannels = (ch: number | undefined): string => {
    if (!ch || isNaN(ch)) return lang === 'es' ? 'No disponible' : 'Not available'
    if (ch === 1) return lang === 'es' ? 'Mono (1 canal)' : 'Mono (1 channel)'
    if (ch === 2) return lang === 'es' ? 'Estéreo (2 canales)' : 'Stereo (2 channels)'
    return `${ch} ${lang === 'es' ? 'canales' : 'channels'}`
  }

  const getSeverityTag = (severity: AnalysisResult['severity']) => {
    if (!severity) return null

    const map = {
      low: {
        label: lang === 'es' ? 'Ajustes menores' : 'Minor adjustments',
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.12)'
      },
      medium: {
        label: lang === 'es' ? 'Mejoras importantes' : 'Important improvements',
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.12)'
      },
      high: {
        label: lang === 'es' ? 'Crítico' : 'Critical',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)'
      }
    } as const

    const s = map[severity]

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '999px',
          background: s.bg,
          color: s.color,
          fontSize: '0.75rem',
          fontWeight: 600,
          border: `1px solid ${s.color}33`
        }}
      >
        <AlertCircle size={14} />
        <span>{s.label}</span>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', color: 'white', ...gradientBg }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>
        <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            padding: '0.75rem 0',
            marginBottom: '1rem',
            background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.92), transparent 100%)',
            backdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.35)'
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={iconBadgeStyle}>
                <Music2 size={24} color="#e5e7eb" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#e5e7eb'
                  }}
                >
                  🎵 MasteringReady
                </span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.introPill}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                style={{
                  ...badgeStyle,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#e5e7eb',
                  background: 'rgba(15, 23, 42, 0.9)',
                  cursor: 'pointer',
                  borderColor: 'rgba(148, 163, 184, 0.7)'
                }}
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <button
                onClick={scrollToAnalyzer}
                style={{
                  borderRadius: '999px',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
                  color: 'white',
                  boxShadow: '0 12px 45px rgba(79, 70, 229, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {t.ctaSecondary}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </nav>

        <section
          style={{
            paddingTop: '3.5rem',
            paddingBottom: '4rem',
            paddingLeft: '0.25rem',
            paddingRight: '0.25rem'
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              gap: '3rem',
              alignItems: 'center'
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  ...pillStyle,
                  marginBottom: '1.5rem'
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>✨ {t.heroPill}</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.7rem, 4vw, 3.8rem)',
                  fontWeight: 800,
                  marginBottom: '1rem',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05
                }}
              >
                {t.heroTitle}
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                  color: '#e5e7eb',
                  maxWidth: '36rem',
                  marginBottom: '1.75rem'
                }}
              >
                {t.heroSubtitle}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                <button
                  onClick={scrollToAnalyzer}
                  style={{
                    borderRadius: '999px',
                    border: 'none',
                    padding: '0.9rem 1.8rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: 'white',
                    color: '#4f46e5',
                    boxShadow: '0 18px 60px rgba(15, 23, 42, 0.65)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transform: 'translateY(0)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 20px 70px rgba(15, 23, 42, 0.9)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 18px 60px rgba(15, 23, 42, 0.65)'
                  }}
                >
                  <Zap size={18} />
                  {t.heroCTA}
                </button>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '999px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.5)'
                  }}
                >
                  <Gauge size={18} color="#a5b4fc" />
                  <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>
                    {lang === 'es' ? 'Optimizado para mezcla antes del mastering' : 'Optimized for pre-mastering mixes'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.1rem', fontSize: '0.85rem' }}>
                {['Privacy-first', lang === 'es' ? 'Inglés y Español' : 'English & Spanish'].map((text, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(148, 163, 184, 0.7)',
                      background: 'rgba(15, 23, 42, 0.9)'
                    }}
                  >
                    <Check size={16} color="#22c55e" />
                    <span style={{ color: '#e5e7eb' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  ...cardStyle,
                  padding: '1.8rem',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '1.5rem'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.46,
                    background: 'radial-gradient(circle at top, rgba(129, 140, 248, 0.25), transparent 55%)'
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                    <div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.7rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(148, 163, 184, 0.6)',
                          background: 'rgba(15, 23, 42, 0.9)'
                        }}
                      >
                        <FileAudio2 size={16} color="#a5b4fc" />
                        <span style={{ fontSize: '0.75rem', color: '#e5e7eb' }}>Demo Mix</span>
                      </div>
                      <h3
                        style={{
                          marginTop: '0.75rem',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: '#e5e7eb'
                        }}
                      >
                        {lang === 'es' ? '"Indie Pop - Verso Principal"' : '"Indie Pop - Main Verse"'}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {lang === 'es' ? 'Simulación de resultados de una mezcla lista para mastering.' : 'Simulated results for a mix ready for mastering.'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af'
                        }}
                      >
                        {t.demoScore}
                      </span>
                      <div
                        style={{
                          fontSize: '1.8rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #22c55e 0%, #bef264 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          marginTop: '0.15rem'
                        }}
                      >
                        97/100
                      </div>
                      <div
                        style={{
                          marginTop: '0.45rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                          background: 'rgba(22, 163, 74, 0.1)',
                          border: '1px solid rgba(22, 163, 74, 0.6)',
                          fontSize: '0.75rem',
                          color: '#bbf7d0'
                        }}
                      >
                        {lang === 'es' ? 'Lista para masterizar' : 'Ready to be mastered'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '0.6rem',
                      borderRadius: '999px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      overflow: 'hidden',
                      border: '1px solid rgba(148, 163, 184, 0.7)',
                      marginBottom: '1.5rem'
                    }}
                  >
                    <div
                      style={{
                        width: '97%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #22c55e 0%, #84cc16 40%, #a3e635 100%)',
                        boxShadow: '0 0 20px rgba(190, 242, 100, 0.8)'
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '1.35rem'
                    }}
                  >
                    {[
                      { label: t.demoMetrics.headroom, value: '-6.2 dBFS' },
                      { label: t.demoMetrics.truePeak, value: '-3.1 dBTP' },
                      { label: t.demoMetrics.stereoBalance, value: '0.75' }
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '0.55rem 0.7rem',
                          borderRadius: '0.9rem',
                          border: '1px solid rgba(22, 163, 74, 0.3)',
                          background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(15, 23, 42, 0.95))',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.15rem'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#bbf7d0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Check size={14} color="#22c55e" />
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            color: '#e5e7eb',
                            fontWeight: 600
                          }}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '0.9rem',
                      background: 'linear-gradient(90deg, rgba(129, 140, 248, 0.12), rgba(236, 72, 153, 0.14))',
                      border: '1px solid rgba(129, 140, 248, 0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem'
                    }}
                  >
                    <BarChart2 size={18} color="#c7d2fe" />
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: '#e5e7eb'
                      }}
                    >
                      {lang === 'es'
                        ? 'Este es un ejemplo de cómo se ve una mezcla técnicamente lista para masterizar.'
                        : 'This is an example of what a technically mastering-ready mix looks like.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          style={{
            padding: '3.5rem 0.5rem 3.75rem',
            background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.92))',
            borderRadius: '1.5rem',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            marginBottom: '3.5rem'
          }}
        >
          <div style={{ maxWidth: '1152px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.25rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  ...pillStyle,
                  background: 'transparent',
                  borderColor: 'rgba(148, 163, 184, 0.6)'
                }}
              >
                <Gauge size={16} color="#a5b4fc" />
                <span style={{ fontSize: '0.8rem', color: '#e5e7eb' }}>
                  {lang === 'es' ? 'Diseñado para mezcla antes del mastering' : 'Designed for pre-mastering mixes'}
                </span>
              </div>
              <h2
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  marginTop: '1.2rem',
                  marginBottom: '0.75rem',
                  letterSpacing: '-0.03em'
                }}
              >
                {t.whyTitle}
              </h2>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#9ca3af',
                  maxWidth: '34rem',
                  margin: '0 auto'
                }}
              >
                {t.whySubtitle}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.8rem'
              }}
            >
              {[
                {
                  icon: <Zap size={32} color="#a5b4fc" />,
                  title: t.feature1Title,
                  desc: t.feature1Desc
                },
                {
                  icon: <Shield size={32} color="#a5b4fc" />,
                  title: t.feature2Title,
                  desc: t.feature2Desc
                },
                {
                  icon: <TrendingUp size={32} color="#a5b4fc" />,
                  title: t.feature3Title,
                  desc: t.feature3Desc
                }
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(129, 140, 248, 0.18), rgba(15, 23, 42, 1))',
                    borderRadius: '1.25rem',
                    border: '1px solid rgba(148, 163, 184, 0.55)',
                    padding: '1.7rem',
                    boxShadow: '0 18px 65px rgba(15, 23, 42, 0.85)',
                    transform: 'translateY(0)',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 24px 80px rgba(15, 23, 42, 1)'
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(129, 140, 248, 0.85)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 18px 65px rgba(15, 23, 42, 0.85)'
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(148, 163, 184, 0.55)'
                  }}
                >
                  <div
                    style={{
                      marginBottom: '1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.6rem',
                      borderRadius: '999px',
                      background: 'radial-gradient(circle at top, rgba(129, 140, 248, 0.2), rgba(15, 23, 42, 1))',
                      border: '1px solid rgba(129, 140, 248, 0.75)'
                    }}
                  >
                    {feature.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      color: '#e5e7eb'
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: '#9ca3af',
                      lineHeight: 1.6
                    }}
                  >
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="analyze"
          ref={analyzerRef}
          style={{
            padding: '3.75rem 0.5rem 4rem',
            background: 'rgba(15, 23, 42, 0.98)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(148, 163, 184, 0.4)',
            marginBottom: '3.5rem'
          }}
        >
          <div style={{ maxWidth: '896px', margin: '0 auto' }}>
            {!result ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <h2
                    style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      marginBottom: '0.75rem',
                      letterSpacing: '-0.03em'
                    }}
                  >
                    {t.analyzerTitle}
                  </h2>
                  <p
                    style={{
                      fontSize: '1rem',
                      color: '#9ca3af',
                      maxWidth: '32rem',
                      margin: '0 auto'
                    }}
                  >
                    {t.analyzerSubtitle}
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(15, 23, 42, 1)',
                    borderRadius: '1.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.55)',
                    padding: '2rem',
                    boxShadow: '0 18px 70px rgba(0, 0, 0, 0.9)'
                  }}
                >
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.14), rgba(15, 23, 42, 0.95))',
                      border: '1px solid rgba(34, 197, 94, 0.65)',
                      borderRadius: '0.9rem',
                      padding: '0.85rem 1rem',
                      marginBottom: '1.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                      <Shield size={18} color="#bbf7d0" />
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#bbf7d0'
                        }}
                      >
                        🔒 {t.privacyBadgeTitle}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: '#dcfce7'
                      }}
                    >
                      {t.privacyBadgeDesc}
                    </p>
                  </div>

                  <div
                    onClick={() => !loading && fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!loading) {
                        e.currentTarget.style.borderColor = '#a855f7'
                        e.currentTarget.style.background = 'rgba(30, 64, 175, 0.65)'
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.6)'
                      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'
                    }}
                    onDrop={handleDrop}
                    style={{
                      border: '2px dashed rgba(148, 163, 184, 0.6)',
                      borderRadius: '1.25rem',
                      padding: '1.75rem 1.5rem',
                      marginBottom: '1.5rem',
                      background: 'rgba(15, 23, 42, 0.9)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.65rem',
                          borderRadius: '999px',
                          background: 'radial-gradient(circle at top, rgba(129, 140, 248, 0.2), rgba(15, 23, 42, 1))',
                          border: '1px solid rgba(129, 140, 248, 0.75)',
                          marginBottom: '0.85rem'
                        }}
                      >
                        {loading ? <Loader2 size={22} className="animate-spin" color="#e5e7eb" /> : <Upload size={22} color="#e5e7eb" />}
                      </div>
                      <h3
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          marginBottom: '0.35rem'
                        }}
                      >
                        {t.dropTitle}
                      </h3>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: '#9ca3af',
                          marginBottom: '1rem'
                        }}
                      >
                        {t.dropSubtitle}
                      </p>

                      {file && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.7)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem'
                          }}
                        >
                          <FileAudio2 size={16} color="#e5e7eb" />
                          <span
                            style={{
                              maxWidth: '16rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#e5e7eb'
                            }}
                          >
                            {file.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!loading) {
                                setFile(null)
                              }
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            <XCircle size={16} color="#f97316" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {uploadError && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        background: 'rgba(127, 29, 29, 0.3)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(239, 68, 68, 0.7)',
                        padding: '0.75rem',
                        marginBottom: '1.25rem'
                      }}
                    >
                      <AlertCircle size={16} color="#fecaca" />
                      <div>
                        <p
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#fecaca'
                          }}
                        >
                          {t.uploadErrorTitle}
                        </p>
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: '#fecaca'
                          }}
                        >
                          {t.uploadErrorDescription}
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        style={{
                          borderRadius: '999px',
                          border: '1px solid rgba(148, 163, 184, 0.8)',
                          padding: '0.6rem 1.35rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          background: 'rgba(15, 23, 42, 0.95)',
                          color: '#e5e7eb',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <FileAudio2 size={16} />
                        {t.browseButton}
                      </button>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#6b7280'
                        }}
                      >
                        {t.or}{' '}
                        <span
                          style={{
                            color: '#e5e7eb'
                          }}
                        >
                          {lang === 'es' ? 'arrastra tu archivo arriba.' : 'drag and drop your file above.'}
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={!file || loading}
                      style={{
                        borderRadius: '999px',
                        border: 'none',
                        padding: '0.7rem 1.6rem',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: !file || loading ? 'not-allowed' : 'pointer',
                        background: !file || loading ? 'rgba(55, 65, 81, 0.9)' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
                        color: 'white',
                        boxShadow: !file || loading ? 'none' : '0 14px 45px rgba(79, 70, 229, 0.75)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: !file ? 0.7 : 1
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {lang === 'es' ? 'Analizando...' : 'Analyzing...'}
                        </>
                      ) : (
                        <>
                          <BarChart2 size={16} />
                          {lang === 'es' ? 'Analizar mezcla' : 'Analyze mix'}
                        </>
                      )}
                    </button>
                  </div>

                  {loading && (
                    <div
                      style={{
                        marginTop: '1.75rem',
                        paddingTop: '1.2rem',
                        borderTop: '1px dashed rgba(75, 85, 99, 0.8)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.6rem'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#9ca3af'
                          }}
                        >
                          {t.loadingMessage}
                        </span>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#e5e7eb',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          {progress}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '0.6rem',
                          borderRadius: '999px',
                          background: 'rgba(15, 23, 42, 0.9)',
                          overflow: 'hidden',
                          border: '1px solid rgba(148, 163, 184, 0.75)'
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                            height: '100%',
                            background:
                              'linear-gradient(90deg, #4f46e5 0%, #7c3aed 40%, #ec4899 80%, #f97316 100%)',
                            boxShadow: '0 0 25px rgba(236, 72, 153, 0.75)',
                            transition: 'width 0.25s ease'
                          }}
                        />
                      </div>
                      <p
                        style={{
                          textAlign: 'center',
                          color: '#6b7280',
                          marginTop: '0.5rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        {getProgressMessage(progress)}
                      </p>
                      <p
                        style={{
                          textAlign: 'center',
                          color: '#9ca3af',
                          fontSize: '0.8rem'
                        }}
                      >
                        {t.progressTimeHint}
                      </p>
                      <p
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.8rem',
                          color: '#6b7280'
                        }}
                      >
                        {t.loadingFooter}
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    id="file-input"
                    type="file"
                    accept=".wav,.flac,.mp3,.aac,.ogg"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      handleFileChange(f)
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      ...pillStyle,
                      background: 'transparent'
                    }}
                  >
                    <BarChart2 size={16} color="#a5b4fc" />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: '#e5e7eb'
                      }}
                    >
                      {lang === 'es' ? 'Análisis completado' : 'Analysis completed'}
                    </span>
                  </div>
                  <h2
                    style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      marginTop: '1rem',
                      marginBottom: '0.75rem',
                      letterSpacing: '-0.03em'
                    }}
                  >
                    {t.analysisReadyTitle}
                  </h2>
                  <p
                    style={{
                      fontSize: '1rem',
                      color: '#9ca3af',
                      maxWidth: '34rem',
                      margin: '0 auto'
                    }}
                  >
                    {t.analysisReadySubtitle}
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.8fr)',
                    gap: '1.75rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 1)',
                      borderRadius: '1.25rem',
                      border: '1px solid rgba(148, 163, 184, 0.6)',
                      padding: '1.5rem',
                      boxShadow: '0 18px 60px rgba(0, 0, 0, 0.8)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem'
                      }}
                    >
                      <div>
                        <p
                          style={{
                            ...labelStyle,
                            color: '#9ca3af',
                            marginBottom: '0.25rem'
                          }}
                        >
                          {t.scoreLabel.toUpperCase()}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '0.35rem'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '2.4rem',
                              fontWeight: 800,
                              background: 'linear-gradient(135deg, #22c55e 0%, #84cc16 40%, #a3e635 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text'
                            }}
                          >
                            {result.score ?? '—'}
                          </span>
                          <span
                            style={{
                              fontSize: '1rem',
                              color: '#6b7280'
                            }}
                          >
                            /100
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>{getSeverityTag(result.severity)}</div>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '0.6rem',
                        borderRadius: '999px',
                        background: 'rgba(15, 23, 42, 0.95)',
                        overflow: 'hidden',
                        border: '1px solid rgba(148, 163, 184, 0.7)',
                        marginBottom: '1rem'
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(result.score ?? 0, 100)}%`,
                          height: '100%',
                          background:
                            'linear-gradient(90deg, #22c55e 0%, #84cc16 40%, #a3e635 70%, #facc15 90%, #f97316 100%)',
                          boxShadow: '0 0 25px rgba(190, 242, 100, 0.85)'
                        }}
                      />
                    </div>

                    {result.short_feedback && (
                      <div
                        style={{
                          padding: '0.8rem 0.9rem',
                          borderRadius: '0.9rem',
                          background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.14), rgba(15, 23, 42, 0.95))',
                          border: '1px solid rgba(129, 140, 248, 0.7)',
                          marginBottom: '1rem'
                        }}
                      >
                        <p
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#e5e7eb',
                            marginBottom: '0.3rem'
                          }}
                        >
                          {t.shortFeedbackTitle}
                        </p>
                        <p
                          style={{
                            fontSize: '0.85rem',
                            color: '#e5e7eb'
                          }}
                        >
                          {result.short_feedback}
                        </p>
                      </div>
                    )}

                    {result.metrics?.length > 0 && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: '0.75rem'
                        }}
                      >
                        {result.metrics.slice(0, 4).map((metric, idx) => {
                          const styles = getMetricStatusStyles(metric.status)
                          return (
                            <div
                              key={`${metric.name}-${idx}`}
                              style={{
                                padding: '0.75rem 0.9rem',
                                borderRadius: '0.9rem',
                                background: styles.bg,
                                border: `1px solid ${styles.borderColor}66`
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '0.2rem'
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    color: styles.textColor,
                                    fontWeight: 600
                                  }}
                                >
                                  {metric.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    color: '#e5e7eb',
                                    fontWeight: 500
                                  }}
                                >
                                  {metric.value}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#e5e7eb'
                                }}
                              >
                                {metric.message}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 1)',
                        borderRadius: '1.25rem',
                        border: '1px solid rgba(148, 163, 184, 0.6)',
                        padding: '1.25rem',
                        boxShadow: '0 18px 60px rgba(0, 0, 0, 0.8)'
                      }}
                    >
                      <p
                        style={{
                          ...labelStyle,
                          color: '#9ca3af',
                          marginBottom: '0.75rem'
                        }}
                      >
                        {t.fileInfoTitle.toUpperCase()}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          fontSize: '0.85rem',
                          color: '#e5e7eb'
                        }}
                      >
                        {result.file?.path && (
                          <div>
                            <span style={{ color: '#9ca3af' }}>{lang === 'es' ? 'Archivo: ' : 'File: '}</span>
                            <span>{result.file.path}</span>
                          </div>
                        )}
                        <div>
                          <span style={{ color: '#9ca3af' }}>{t.durationLabel}: </span>
                          <span>{formatDuration(result.file?.duration_seconds)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>{t.sampleRateLabel}: </span>
                          <span>{formatSampleRate(result.file?.sample_rate_hz)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>{t.channelsLabel}: </span>
                          <span>{formatChannels(result.file?.channels)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>{t.genreLabel}: </span>
                          <span>{result.file?.genre || t.noGenre}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <button
                        onClick={downloadTxtReport}
                        style={{
                          borderRadius: '999px',
                          border: '1px solid rgba(148, 163, 184, 0.7)',
                          padding: '0.65rem 1.1rem',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: 'rgba(15, 23, 42, 0.95)',
                          color: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <Download size={16} />
                        {t.downloadTxt}
                      </button>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textAlign: 'center'
                        }}
                      >
                        {t.downloadNote}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setResult(null)
                        setFile(null)
                        setFirstAnalysisDone(true)
                        setProgress(0)
                        setUploadStatus('idle')
                      }}
                      style={{
                        marginTop: '0.5rem',
                        borderRadius: '999px',
                        border: 'none',
                        padding: '0.6rem 1.2rem',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        background: 'rgba(17, 24, 39, 0.95)',
                        color: '#9ca3af'
                      }}
                    >
                      {t.backButton}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '1.5rem',
                    marginTop: '2rem'
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 1)',
                      borderRadius: '1.25rem',
                      border: '1px solid rgba(148, 163, 184, 0.6)',
                      padding: '1.25rem'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                        color: '#e5e7eb'
                      }}
                    >
                      {t.technicalSummaryTitle}
                    </h3>
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#e5e7eb'
                      }}
                    >
                      {result.technical_summary?.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.45rem'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: '#a5b4fc',
                              marginTop: '0.15rem'
                            }}
                          >
                            •
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 1)',
                      borderRadius: '1.25rem',
                      border: '1px solid rgba(148, 163, 184, 0.6)',
                      padding: '1.25rem'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                        color: '#e5e7eb'
                      }}
                    >
                      {t.musicalSummaryTitle}
                    </h3>
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#e5e7eb'
                      }}
                    >
                      {result.musical_summary?.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.45rem'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: '#a5b4fc',
                              marginTop: '0.15rem'
                            }}
                          >
                            •
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(15, 23, 42, 1)',
                    borderRadius: '1.25rem',
                    border: '1px solid rgba(148, 163, 184, 0.6)',
                    padding: '1.25rem',
                    marginTop: '1.75rem'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      marginBottom: '0.75rem',
                      color: '#e5e7eb'
                    }}
                  >
                    {t.suggestionsTitle}
                  </h3>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#e5e7eb'
                    }}
                  >
                    {result.suggestions?.map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.45rem'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#f97316',
                            marginTop: '0.15rem'
                          }}
                        >
                          →
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {result.sections?.length ? (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 1)',
                      borderRadius: '1.25rem',
                      border: '1px solid rgba(148, 163, 184, 0.6)',
                      padding: '1.25rem',
                      marginTop: '1.75rem'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                        color: '#e5e7eb'
                      }}
                    >
                      {t.sectionsTitle}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {result.sections.map((sec, idx) => {
                        const statusMap = {
                          pass: {
                            label: lang === 'es' ? 'OK' : 'OK',
                            color: '#22c55e',
                            bg: 'rgba(34, 197, 94, 0.1)'
                          },
                          warn: {
                            label: lang === 'es' ? 'Revisar' : 'Check',
                            color: '#f97316',
                            bg: 'rgba(249, 115, 22, 0.1)'
                          },
                          fail: {
                            label: lang === 'es' ? 'Crítico' : 'Critical',
                            color: '#ef4444',
                            bg: 'rgba(239, 68, 68, 0.1)'
                          }
                        } as const

                        const styleObj = statusMap[sec.status]

                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '0.85rem 0.9rem',
                              borderRadius: '0.9rem',
                              background: styleObj.bg,
                              border: `1px solid ${styleObj.color}66`
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.25rem'
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  color: '#e5e7eb'
                                }}
                              >
                                {sec.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: styleObj.color
                                }}
                              >
                                {styleObj.label.toUpperCase()}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: '0.8rem',
                                color: '#e5e7eb'
                              }}
                            >
                              {sec.message}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {(result.raw_text || result.recommendations?.length || result.notes?.length) && (
                  <div
                    style={{
                      marginTop: '1.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    {result.raw_text && (
                      <div>
                        <button
                          onClick={() => setShowRawText((prev) => !prev)}
                          style={{
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(148, 163, 184, 0.7)',
                            padding: '0.6rem 0.9rem',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            background: 'rgba(15, 23, 42, 0.95)',
                            color: '#e5e7eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <ChevronDown
                            size={16}
                            style={{
                              transform: showRawText ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.18s ease'
                            }}
                          />
                          {showRawText ? t.rawTextHide : t.rawTextToggle}
                        </button>
                        {showRawText && (
                          <pre
                            style={{
                              marginTop: '0.75rem',
                              padding: '1rem',
                              borderRadius: '0.75rem',
                              background: 'rgba(15, 23, 42, 1)',
                              border: '1px solid rgba(148, 163, 184, 0.5)',
                              whiteSpace: 'pre-wrap',
                              fontSize: '0.8rem',
                              color: '#e5e7eb',
                              maxHeight: '400px',
                              overflowY: 'auto'
                            }}
                          >
                            {result.raw_text}
                          </pre>
                        )}
                      </div>
                    )}

                    {(result.recommendations?.length || result.notes?.length) && (
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 1)',
                          borderRadius: '1.25rem',
                          border: '1px solid rgba(148, 163, 184, 0.6)',
                          padding: '1.25rem'
                        }}
                      >
                        <button
                          onClick={() => setShowAdvanced((prev) => !prev)}
                          style={{
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(148, 163, 184, 0.7)',
                            padding: '0.6rem 0.9rem',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            background: 'rgba(17, 24, 39, 0.95)',
                            color: '#e5e7eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginBottom: showAdvanced ? '0.75rem' : 0
                          }}
                        >
                          <ChevronDown
                            size={16}
                            style={{
                              transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.18s ease'
                            }}
                          />
                          {showAdvanced ? t.advancedHide : t.advancedToggle}
                        </button>

                        {showAdvanced && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1rem',
                              fontSize: '0.85rem',
                              color: '#e5e7eb'
                            }}
                          >
                            {result.recommendations?.length && (
                              <div>
                                <h4
                                  style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    marginBottom: '0.5rem',
                                    color: '#e5e7eb'
                                  }}
                                >
                                  {t.recommendationsTitle}
                                </h4>
                                <ul
                                  style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.45rem'
                                  }}
                                >
                                  {result.recommendations.map((item, idx) => (
                                    <li
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.45rem'
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '0.8rem',
                                          color: '#a5b4fc',
                                          marginTop: '0.15rem'
                                        }}
                                      >
                                        •
                                      </span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {result.notes?.length && (
                              <div>
                                <h4
                                  style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    marginBottom: '0.5rem',
                                    color: '#e5e7eb'
                                  }}
                                >
                                  {t.notesTitle}
                                </h4>
                                <ul
                                  style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.45rem'
                                  }}
                                >
                                  {result.notes.map((item, idx) => (
                                    <li
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.45rem'
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '0.8rem',
                                          color: '#a5b4fc',
                                          marginTop: '0.15rem'
                                        }}
                                      >
                                        •
                                      </span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {error && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.9rem',
                  background: 'rgba(127, 29, 29, 0.3)',
                  border: '1px solid rgba(239, 68, 68, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <AlertCircle size={18} color="#fecaca" />
                <div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#fecaca'
                    }}
                  >
                    {t.errorTitle}
                  </p>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#fee2e2'
                    }}
                  >
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer
          style={{
            paddingTop: '2rem',
            paddingBottom: '1rem',
            borderTop: '1px solid rgba(31, 41, 55, 0.9)',
            color: '#6b7280',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <span>© {new Date().getFullYear()} MasteringReady.</span>
            <span> {lang === 'es' ? 'Creado por un ingeniero de mastering.' : 'Built by a mastering engineer.'}</span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '1rem'
            }}
          >
            <span>{lang === 'es' ? 'Versión Beta' : 'Beta Version'}</span>
            <span>{lang === 'es' ? 'Enfoque: mezcla lista para mastering' : 'Focus: mastering-ready mix'}</span>
          </div>
        </footer>
      </div>
    </main>
  )
}


