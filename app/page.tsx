'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import AnalysisOptions from '@/components/AnalysisOptions'
import Results from '@/components/Results'
import PrivacyBadge from '@/components/PrivacyBadge'
import { analyzeFile } from '@/lib/api'

export default function Home() {
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

    // CRITICAL: Validate file size BEFORE sending to API
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setError(
        lang === 'es'
          ? `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 50MB en beta. Para archivos más grandes, contacta support@masteringready.com`
          : `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 50MB in beta. For larger files, contact support@masteringready.com`
      )
      return
    }

    setLoading(true)
    setProgress(0)
    setError(null)

    // Simulate progress bar with more realistic timing
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Slow down at 90% to make it more realistic
        if (prev >= 90) return Math.min(prev + 1, 95) // Very slow at end
        if (prev >= 70) return prev + 5 // Slower
        if (prev >= 40) return prev + 8 // Medium
        return prev + 12 // Fast at start
      })
    }, 800) // Slightly slower interval

    try {
      const data = await analyzeFile(file, { lang, mode, strict })
      setProgress(100)
      setResult(data)
    } catch (err: any) {
      setError(err.message || (lang === 'es' ? 'Error al analizar el archivo' : 'Error analyzing file'))
      console.error('Analysis error:', err)
    } finally {
      clearInterval(progressInterval)
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

  // Check if file is too large
  const isFileTooLarge = file && file.size > 50 * 1024 * 1024

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold gradient-text">🎵 MasteringReady</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                className="text-sm font-medium text-gray-600 hover:text-purple-600 transition"
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="inline-block bg-purple-100 rounded-full px-4 py-2 mb-4">
            <span className="text-sm font-medium text-purple-900">
              {lang === 'es' 
                ? '✨ Metodología probada en más de 300 producciones profesionales'
                : '✨ Methodology proven in over 300 professional productions'}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {lang === 'es' 
              ? '¿Tu mezcla está lista para el mastering?'
              : 'Is your mix ready for mastering?'}
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            {lang === 'es'
              ? 'Análisis técnico en 30 segundos basado en la metodología de Matías Carvajal'
              : 'Technical analysis in 30 seconds based on Matías Carvajal\'s methodology'}
          </p>
        </div>

        {/* Privacy Badge */}
        <PrivacyBadge />

        {/* Main Content */}
        {!result ? (
          <div className="mt-8 space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <FileUpload 
                onFileSelect={setFile}
                disabled={loading}
              />
            </div>

            {/* Selected File Info */}
            {file && (
              <div className={`border rounded-lg p-4 ${
                isFileTooLarge 
                  ? 'bg-red-50 border-red-300' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm font-medium ${
                  isFileTooLarge ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {lang === 'es' ? 'Archivo seleccionado:' : 'Selected file:'}
                </p>
                <p className={`text-lg font-bold ${
                  isFileTooLarge ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {file.name}
                </p>
                <p className={`text-sm ${
                  isFileTooLarge ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {isFileTooLarge && (
                  <div className="mt-2 bg-red-100 border border-red-300 rounded p-3">
                    <p className="text-sm text-red-800 font-semibold">
                      ⚠️ {lang === 'es' 
                        ? 'Archivo demasiado grande (máximo 50MB en beta)'
                        : 'File too large (maximum 50MB in beta)'}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {lang === 'es'
                        ? 'Para archivos más grandes, contacta support@masteringready.com'
                        : 'For larger files, contact support@masteringready.com'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            {file && !isFileTooLarge && (
              <AnalysisOptions
                lang={lang}
                mode={mode}
                strict={strict}
                onLangChange={setLang}
                onModeChange={setMode}
                onStrictChange={setStrict}
              />
            )}

            {/* Analyze Button */}
            {file && (
              <button
                onClick={handleAnalyze}
                disabled={loading || isFileTooLarge}
                className="w-full btn-primary text-white py-4 rounded-lg
                         font-semibold text-lg hover:bg-purple-700 transition
                         disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>
                        {lang === 'es' ? 'Analizando...' : 'Analyzing...'}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs opacity-75">
                      {progress}% • {lang === 'es' ? 'Esto puede tomar hasta 30 segundos' : 'This may take up to 30 seconds'}
                    </span>
                  </div>
                ) : isFileTooLarge ? (
                  lang === 'es' ? 'Archivo muy grande (máx 50MB)' : 'File too large (max 50MB)'
                ) : (
                  lang === 'es' ? 'Analizar Mezcla' : 'Analyze Mix'
                )}
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  {lang === 'es' ? 'Error:' : 'Error:'}
                </p>
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* Results */
          <Results 
            data={result} 
            onReset={handleReset}
            lang={lang}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 MasteringReady by Matías Carvajal. {lang === 'es' ? 'Todos los derechos reservados' : 'All rights reserved'}.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {lang === 'es' ? 'Basado en la metodología "Mastering Ready"' : 'Based on the "Mastering Ready" methodology'}
          </p>
        </div>
      </footer>
    </div>
  )
}
