'use client'

import { useState } from 'react'
import { Download, Check, Upload, Zap, Shield, TrendingUp } from 'lucide-react'
import { analyzeFile } from '@/lib/api'
import { compressAudioFile } from '@/lib/audio-compression'

export default function LandingPage() {
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [mode, setMode] = useState<'short' | 'write'>('write')
  const [strict, setStrict] = useState(false)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!file) return

    setLoading(true)
    setProgress(0)
    setError(null)

    const maxSizeMB = 50
    let fileToUpload: File = file
    let progressInterval: ReturnType<typeof setInterval> | undefined

    try {
      // Si el archivo es mayor al límite, lo comprimimos antes de enviar
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(
          lang === 'es'
            ? `Archivo grande detectado (${(file.size / 1024 / 1024).toFixed(1)} MB). Comprimiendo audio para análisis…`
            : `Large file detected (${(file.size / 1024 / 1024).toFixed(1)} MB). Compressing audio for analysis…`
        )

        const { file: compressedFile } = await compressAudioFile(file, maxSizeMB)
        fileToUpload = compressedFile
        setError(null)
      }

      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 98
          if (prev >= 90) return prev + 2
          if (prev >= 70) return prev + 5
          if (prev >= 40) return prev + 8
          return prev + 12
        })
      }, 700)

      const data = await analyzeFile(fileToUpload, { lang, mode, strict })
      setProgress(100)
      setResult(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || (lang === 'es' ? 'Error al analizar' : 'Analysis error'))
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setLoading(false)
      setProgress(0)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setLoading(false)
    setProgress(0)
  }

  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([result.report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analisis-${result.filename || 'mezcla'}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const scrollToAnalyzer = () => {
    document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' })
  }

  const gradientText = 'bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 bg-clip-text text-transparent'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* NAVBAR */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400 shadow-lg shadow-purple-500/30">
              <span className="text-xl font-bold">MR</span>
            </div>
            <div>
              <div className={`text-lg font-semibold ${gradientText}`}>MasteringReady</div>
              <p className="text-xs text-slate-400">
                {lang === 'es'
                  ? 'Analizador técnico de mezcla por Matías Carvajal'
                  : 'Technical mix analyzer by Matías Carvajal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(prev => (prev === 'es' ? 'en' : 'es'))}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 hover:border-purple-500/60 hover:bg-slate-900/70"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-[10px] font-semibold">
                {lang === 'es' ? 'ES' : 'EN'}
              </span>
              <span className="hidden sm:inline">
                {lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b border-slate-900/60 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:py-16">
          {/* LEFT */}
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-100 shadow-sm shadow-purple-500/20">
              <Zap className="h-3.5 w-3.5" />
              <span className="font-medium">
                {lang === 'es'
                  ? 'Metodología probada en más de 300 producciones'
                  : 'Methodology tested on 300+ professional releases'}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                <span className="block">
                  {lang === 'es'
                    ? '¿Tu mezcla está lista'
                    : 'Is your mix really ready'}
                </span>
                <span className={`block mt-1 ${gradientText}`}>
                  {lang === 'es'
                    ? 'para el mastering?'
                    : 'for mastering?'}
                </span>
              </h1>

              <p className="max-w-xl text-sm text-slate-300 sm:text-base">
                {lang === 'es'
                  ? 'Sube tu mezcla y recibe un análisis técnico objetivo en segundos: headroom, LUFS, PLR, ancho estéreo y balance de frecuencias, basado en la metodología de Matías Carvajal.'
                  : 'Upload your mix and get an objective technical analysis in seconds: headroom, LUFS, PLR, stereo image and tonal balance, based on Matías Carvajal’s mastering workflow.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={scrollToAnalyzer}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-500/40 hover:opacity-95 active:scale-[0.99]"
              >
                <Upload className="h-4 w-4" />
                {lang === 'es' ? 'Subir mezcla para analizar' : 'Upload mix for analysis'}
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {lang === 'es'
                    ? 'Tu archivo no se almacena ni se comparte'
                    : 'Your audio is never stored or shared'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {lang === 'es'
                    ? 'Headroom y true peak listos para mastering'
                    : 'Headroom & true peak ready for mastering'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                <span>
                  {lang === 'es'
                    ? 'PLR y dinámica pensados para streaming'
                    : 'PLR & dynamics tuned for streaming'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <Shield className="h-3.5 w-3.5 text-amber-300" />
                <span>
                  {lang === 'es'
                    ? 'Chequeos técnicos objetivos, sin humo'
                    : 'Objective technical checks, no fluff'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT (CARD) */}
          <div className="flex-1">
            <div
              id="analyzer"
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-purple-500/20 sm:p-6"
            >
              {/* Glow background */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.16),_transparent_60%)]" />

              <div className="relative space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-50 sm:text-base">
                      {lang === 'es'
                        ? 'Sube tu mezcla en WAV o AIFF'
                        : 'Upload your mix in WAV or AIFF'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {lang === 'es'
                        ? 'Ideal: 24 bits, -6 dBFS de pico, sin limitador agresivo en el master bus.'
                        : 'Ideal: 24-bit, -6 dBFS peak, no heavy limiting on the mix bus.'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full border border-emerald-500/40 bg-slate-900/80 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                      {lang === 'es' ? 'Análisis técnico' : 'Technical analysis'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'es' ? 'No altera tu audio' : 'Non-destructive, read-only'}
                    </span>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  className={`relative mt-2 rounded-xl border-2 border-dashed ${
                    file ? 'border-purple-500/70 bg-slate-900/70' : 'border-slate-700/80 bg-slate-900/40'
                  } px-4 py-6 text-center transition-colors`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#a855f7'
                      e.currentTarget.style.background = 'rgba(15,23,42,0.9)'
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = file ? '#a855f7' : '#334155'
                    e.currentTarget.style.background = file
                      ? 'rgba(15,23,42,0.9)'
                      : 'rgba(15,23,42,0.6)'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = file ? '#a855f7' : '#334155'
                    e.currentTarget.style.background = file
                      ? 'rgba(15,23,42,0.9)'
                      : 'rgba(15,23,42,0.6)'

                    if (!loading && e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setFile(e.dataTransfer.files[0])
                    }
                  }}
                >
                  <label className="flex cursor-pointer flex-col items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 shadow-inner shadow-slate-950/80">
                      <Upload className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-50">
                        {file
                          ? (lang === 'es' ? 'Archivo listo para analizar' : 'File ready for analysis')
                          : (lang === 'es' ? 'Arrastra tu mezcla aquí' : 'Drag your mix here')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {lang === 'es'
                          ? 'O haz click para seleccionar un archivo .wav, .aiff, .mp3'
                          : 'Or click to select a .wav, .aiff, .mp3 file'}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".wav,.aiff,.aif,.mp3,.flac,.m4a"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f && !loading) {
                          setFile(f)
                          setResult(null)
                          setError(null)
                        }
                      }}
                    />
                  </label>

                  {file && (
                    <div className="mt-4 rounded-lg bg-slate-900/90 px-3 py-2 text-left text-xs text-slate-300">
                      <p className="truncate font-medium text-slate-50">{file.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB •{' '}
                        {lang === 'es'
                          ? 'Se recomienda mezcla estéreo final (no stems)'
                          : 'Recommended: final stereo mix (not stems)'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {lang === 'es' ? 'Idioma del reporte' : 'Report language'}
                    </p>
                    <div className="inline-flex rounded-full bg-slate-900 p-1">
                      <button
                        onClick={() => setLang('es')}
                        className={`flex-1 rounded-full px-2 py-1 text-[11px] ${
                          lang === 'es'
                            ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/40'
                            : 'text-slate-300'
                        }`}
                      >
                        ES
                      </button>
                      <button
                        onClick={() => setLang('en')}
                        className={`flex-1 rounded-full px-2 py-1 text-[11px] ${
                          lang === 'en'
                            ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/40'
                            : 'text-slate-300'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {lang === 'es' ? 'Modo de reporte' : 'Report mode'}
                    </p>
                    <div className="inline-flex rounded-full bg-slate-900 p-1">
                      <button
                        onClick={() => setMode('short')}
                        className={`flex-1 rounded-full px-2 py-1 text-[11px] ${
                          mode === 'short'
                            ? 'bg-sky-500 text-white shadow-sm shadow-sky-400/40'
                            : 'text-slate-300'
                        }`}
                      >
                        {lang === 'es' ? 'Resumen' : 'Short'}
                      </button>
                      <button
                        onClick={() => setMode('write')}
                        className={`flex-1 rounded-full px-2 py-1 text-[11px] ${
                          mode === 'write'
                            ? 'bg-sky-500 text-white shadow-sm shadow-sky-400/40'
                            : 'text-slate-300'
                        }`}
                      >
                        {lang === 'es' ? 'Detallado' : 'Detailed'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {lang === 'es' ? 'Modo estricto' : 'Strict mode'}
                    </p>
                    <button
                      onClick={() => setStrict(prev => !prev)}
                      className={`inline-flex w-full items-center justify-between rounded-full border px-2 py-1 text-[11px] ${
                        strict
                          ? 'border-red-500/60 bg-red-500/10 text-red-200'
                          : 'border-slate-700 bg-slate-900 text-slate-300'
                      }`}
                    >
                      <span>
                        {lang === 'es'
                          ? strict
                            ? 'Más exigente con los errores'
                            : 'Tolerante (recomendado)'
                          : strict
                            ? 'Harsher on issues'
                            : 'Forgiving (recommended)'}
                      </span>
                      <span
                        className={`ml-2 inline-flex h-4 w-7 items-center rounded-full ${
                          strict ? 'bg-red-500/80' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`h-3 w-3 rounded-full bg-white transition-transform ${
                            strict ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>

                {/* Progress + Error */}
                <div className="space-y-2">
                  {loading && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {lang === 'es'
                            ? 'Analizando mezcla…'
                            : 'Analyzing your mix…'}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400"
                          style={{
                            width: `${progress}%`,
                            transition: 'width 0.4s ease-out'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
                      <p className="font-semibold">
                        {lang === 'es' ? 'Error:' : 'Error:'}
                      </p>
                      <p className="mt-0.5">{error}</p>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleAnalyze}
                  disabled={!file || loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                      {lang === 'es' ? 'Analizando…' : 'Analyzing…'}
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      {lang === 'es' ? 'Analizar mezcla' : 'Analyze mix'}
                    </>
                  )}
                </button>

                {/* Result */}
                {result && (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {lang === 'es' ? 'Resultado' : 'Result'}
                        </p>
                        <p className="font-semibold text-slate-100">
                          {result.filename || 'Mix'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
                          {lang === 'es' ? 'Puntuación ' : 'Score '}{result.score}/100
                        </div>
                        <button
                          onClick={handleDownload}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {lang === 'es' ? 'Descargar reporte' : 'Download report'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 p-2 text-[11px] text-slate-200 whitespace-pre-wrap">
                      {result.report}
                    </div>
                  </div>
                )}

                {/* Reset */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <button
                    onClick={handleReset}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {lang === 'es'
                      ? 'Limpiar y analizar otra mezcla'
                      : 'Reset and analyze another mix'}
                  </button>
                  <span>
                    {lang === 'es'
                      ? 'Este análisis no reemplaza el criterio humano de un ingeniero de mastering.'
                      : 'This analysis does not replace the human judgment of a mastering engineer.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER SIMPLE */}
      <footer className="border-t border-slate-900/80 bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} MasteringReady • Matías Carvajal
          </p>
          <div className="flex items-center gap-3">
            <span>
              {lang === 'es'
                ? 'Basado en la metodología "Mastering Ready"'
                : 'Based on the "Mastering Ready" methodology'}
            </span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
