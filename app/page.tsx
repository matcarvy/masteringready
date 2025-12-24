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
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!file) return

    // FIX: Check file size limit (50MB for beta)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setError('Archivo demasiado grande. Máximo: 50MB en beta. Para archivos más grandes, contacta support@masteringready.com')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await analyzeFile(file, { lang, mode, strict })
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error al analizar el archivo')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setLoading(false)  // FIX: Reset loading state to allow re-analysis
  }

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
              ✨ Metodología probada en más de 300 producciones profesionales
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ¿Tu mezcla está lista para el mastering?
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            Análisis técnico en 30 segundos basado en la metodología de Matías Carvajal
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
                file.size > 50 * 1024 * 1024 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm font-medium ${
                  file.size > 50 * 1024 * 1024 ? 'text-red-900' : 'text-blue-900'
                }`}>
                  Archivo seleccionado:
                </p>
                <p className={`text-lg font-bold ${
                  file.size > 50 * 1024 * 1024 ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {file.name}
                </p>
                <p className={`text-sm ${
                  file.size > 50 * 1024 * 1024 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {file.size > 50 * 1024 * 1024 && (
                    <span className="block mt-1">
                      ⚠️ Archivo muy grande (máx 50MB en beta)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Options */}
            {file && file.size <= 50 * 1024 * 1024 && (
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
                disabled={loading || file.size > 50 * 1024 * 1024}
                className="w-full btn-primary text-white py-4 rounded-lg
                         font-semibold text-lg hover:bg-purple-700 transition
                         disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analizando... (puede tomar hasta 30 seg)
                  </span>
                ) : file.size > 50 * 1024 * 1024 ? (
                  'Archivo muy grande (máx 50MB)'
                ) : (
                  'Analizar Mezcla'
                )}
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error:</p>
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* Results */}
          <Results 
            data={result} 
            onReset={handleReset}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 MasteringReady by Matías Carvajal. Todos los derechos reservados.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Basado en la metodología "Mastering Ready"
          </p>
        </div>
      </footer>
    </div>
  )
}
