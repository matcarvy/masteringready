'use client'

import { useState } from 'react'
import { Download, Check, Upload, Zap, Shield, TrendingUp } from 'lucide-react'
import { analyzeFile } from '@/lib/api'

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

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setError(
        lang === 'es'
          ? `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 50MB.`
          : `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 50MB.`
      )
      return
    }

    setLoading(true)
    setProgress(0)
    setError(null)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 98
        if (prev >= 90) return prev + 2
        if (prev >= 70) return prev + 5
        if (prev >= 40) return prev + 8
        return prev + 12
      })
    }, 700)

    try {
      const data = await analyzeFile(file, { lang, mode, strict })
      setProgress(100)
      setResult(data)
    } catch (err: any) {
      setError(err.message || (lang === 'es' ? 'Error al analizar' : 'Analysis error'))
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
    document.getElementById('analyze')?.scrollIntoView({ behavior: 'smooth' })
  }

  const isFileTooLarge = file && file.size > 50 * 1024 * 1024

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold gradient-text">🎵 MasteringReady</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-purple-600 transition">
                {lang === 'es' ? 'Características' : 'Features'}
              </a>
              <a href="#how-it-works" className="text-gray-700 hover:text-purple-600 transition">
                {lang === 'es' ? 'Cómo Funciona' : 'How It Works'}
              </a>
              <a href="#analyze" className="text-gray-700 hover:text-purple-600 transition">
                {lang === 'es' ? 'Analizar' : 'Analyze'}
              </a>
              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                className="text-sm font-medium text-gray-600 hover:text-purple-600 transition"
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
            </div>
            <div className="flex items-center">
              <button
                onClick={scrollToAnalyzer}
                className="btn-primary text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transition"
              >
                {lang === 'es' ? 'Analizar Gratis' : 'Analyze Free'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 gradient-bg">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="text-white">
              <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <span className="text-sm font-medium">
                  ✨ {lang === 'es' 
                    ? 'Metodología probada en más de 300 producciones profesionales'
                    : 'Methodology proven in over 300 professional productions'}
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                {lang === 'es'
                  ? '¿Tu mezcla está lista para el mastering?'
                  : 'Is your mix ready for mastering?'}
              </h1>
              
              <p className="text-xl md:text-2xl mb-8 text-purple-100">
                {lang === 'es'
                  ? 'Análisis técnico en 30 segundos + recomendaciones basadas en metodología profesional'
                  : 'Technical analysis in 30 seconds + recommendations based on professional methodology'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={scrollToAnalyzer}
                  className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition transform hover:scale-105"
                >
                  {lang === 'es' ? 'Analiza Tu Mezcla Gratis' : 'Analyze Your Mix Free'}
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center">
                  <Check className="w-5 h-5 mr-2" />
                  {lang === 'es' ? 'Sin tarjeta requerida' : 'No credit card required'}
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 mr-2" />
                  {lang === 'es' ? 'Privacy-first' : 'Privacy-first'}
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 mr-2" />
                  {lang === 'es' ? 'Español e Inglés' : 'Spanish & English'}
                </div>
              </div>
            </div>
            
            {/* Right: Demo Card */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition duration-300">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600 font-medium">
                      {lang === 'es' ? 'Puntuación' : 'Score'}
                    </span>
                    <span className="text-4xl font-bold gradient-text">85/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-purple h-3 rounded-full transition-all duration-1000" style={{width: '85%'}}></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="flex items-center text-green-800">
                      <Check className="w-5 h-5 mr-2" />
                      Headroom
                    </span>
                    <span className="text-green-700 font-semibold">-6.2 dB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="flex items-center text-green-800">
                      <Check className="w-5 h-5 mr-2" />
                      True Peak
                    </span>
                    <span className="text-green-700 font-semibold">-3.1 dBTP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="flex items-center text-green-800">
                      <Check className="w-5 h-5 mr-2" />
                      {lang === 'es' ? 'Balance Estéreo' : 'Stereo Balance'}
                    </span>
                    <span className="text-green-700 font-semibold">0.75</span>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800 font-medium">
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
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {lang === 'es' ? '¿Por qué MasteringReady?' : 'Why MasteringReady?'}
            </h2>
            <p className="text-xl text-gray-600">
              {lang === 'es'
                ? 'Metodología profesional basada en 300+ producciones'
                : 'Professional methodology based on 300+ productions'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg feature-card">
              <div className="text-purple-600 mb-4">
                <Zap className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {lang === 'es' ? 'Análisis en 30 Segundos' : 'Analysis in 30 Seconds'}
              </h3>
              <p className="text-gray-600">
                {lang === 'es'
                  ? 'Headroom, LUFS, True Peak, balance de frecuencias, estéreo y más. Todo automático y preciso.'
                  : 'Headroom, LUFS, True Peak, frequency balance, stereo and more. All automatic and precise.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg feature-card">
              <div className="text-purple-600 mb-4">
                <Shield className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {lang === 'es' ? 'Privacy-First' : 'Privacy-First'}
              </h3>
              <p className="text-gray-600">
                {lang === 'es'
                  ? 'Tu audio se analiza solo en memoria y se elimina inmediatamente. Sin almacenamiento sin consentimiento.'
                  : 'Your audio is analyzed in-memory only and deleted immediately. No storage without consent.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg feature-card">
              <div className="text-purple-600 mb-4">
                <TrendingUp className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {lang === 'es' ? 'Metodología Profesional' : 'Professional Methodology'}
              </h3>
              <p className="text-gray-600">
                {lang === 'es'
                  ? 'Basado en técnicas de ingenieros top como Bob Clearmountain, Andrew Scheps y Chris Lord-Alge.'
                  : 'Based on techniques from top engineers like Bob Clearmountain, Andrew Scheps and Chris Lord-Alge.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analyzer Section */}
      <section id="analyze" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          {!result ? (
            <>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">
                  {lang === 'es' ? 'Analiza Tu Mezcla Ahora' : 'Analyze Your Mix Now'}
                </h2>
                <p className="text-xl text-gray-600">
                  {lang === 'es'
                    ? 'Sube tu archivo y obtén un reporte profesional en 30 segundos'
                    : 'Upload your file and get a professional report in 30 seconds'}
                </p>
              </div>

              {/* Privacy Badge */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">
                    🔒 Privacy-First Analyzer
                  </span>
                </div>
                <p className="text-sm text-green-800">
                  {lang === 'es'
                    ? 'Tu audio se analiza solo en memoria y se elimina inmediatamente. No guardamos archivos sin tu consentimiento explícito.'
                    : 'Your audio is analyzed in-memory only and deleted immediately. We don\'t store files without your explicit consent.'}
                </p>
              </div>

              {/* File Upload */}
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                <div
                  onClick={() => !loading && document.getElementById('file-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-500 hover:bg-purple-50'}`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".wav,.mp3,.aiff"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={loading}
                  />
                  
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    {lang === 'es' ? 'Sube tu mezcla' : 'Upload your mix'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {lang === 'es'
                      ? 'Arrastra y suelta o haz click para seleccionar'
                      : 'Drag and drop or click to select'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    WAV, MP3 o AIFF (máx 50MB)
                  </p>
                </div>
              </div>

              {/* Selected File */}
              {file && (
                <div className={`rounded-lg border p-4 mb-6 ${
                  isFileTooLarge ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-sm font-medium ${isFileTooLarge ? 'text-red-900' : 'text-blue-900'}`}>
                    {lang === 'es' ? 'Archivo seleccionado:' : 'Selected file:'}
                  </p>
                  <p className={`text-lg font-bold ${isFileTooLarge ? 'text-red-900' : 'text-blue-900'}`}>
                    {file.name}
                  </p>
                  <p className={`text-sm ${isFileTooLarge ? 'text-red-700' : 'text-blue-700'}`}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {isFileTooLarge && (
                    <div className="mt-2 bg-red-100 border border-red-300 rounded p-3">
                      <p className="text-sm text-red-800 font-semibold">
                        ⚠️ {lang === 'es' 
                          ? 'Archivo demasiado grande (máximo 50MB)'
                          : 'File too large (maximum 50MB)'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Options */}
              {file && !isFileTooLarge && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="font-semibold text-lg mb-4">
                    {lang === 'es' ? 'Opciones de Análisis' : 'Analysis Options'}
                  </h3>
                  
                  {/* Mode */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      {lang === 'es' ? 'Modo de Reporte' : 'Report Mode'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMode('short')}
                        className={`px-4 py-2 rounded-lg transition ${
                          mode === 'short'
                            ? 'bg-gradient-purple text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        📱 Short
                      </button>
                      <button
                        onClick={() => setMode('write')}
                        className={`px-4 py-2 rounded-lg transition ${
                          mode === 'write'
                            ? 'bg-gradient-purple text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        📄 Write
                      </button>
                    </div>
                  </div>

                  {/* Strict Mode */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={strict}
                        onChange={(e) => setStrict(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">
                        {lang === 'es' ? 'Modo Strict' : 'Strict Mode'}
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {lang === 'es'
                        ? 'Estándares comerciales más exigentes'
                        : 'More demanding commercial standards'}
                    </p>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              {file && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading || isFileTooLarge}
                  className="w-full btn-primary text-white py-4 rounded-xl font-semibold text-lg 
                           hover:shadow-xl transition-all transform hover:scale-105
                           disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{lang === 'es' ? 'Analizando...' : 'Analyzing...'}</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                        <div 
                          className="bg-white h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs opacity-75">
                        {progress}% • {lang === 'es' ? 'Hasta 30 segundos' : 'Up to 30 seconds'}
                      </span>
                    </div>
                  ) : isFileTooLarge ? (
                    lang === 'es' ? 'Archivo muy grande' : 'File too large'
                  ) : (
                    lang === 'es' ? 'Analizar Mezcla' : 'Analyze Mix'
                  )}
                </button>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-red-800 font-medium">Error:</p>
                  <p className="text-red-700">{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Results */
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold">
                    {lang === 'es' ? 'Resultados del Análisis' : 'Analysis Results'}
                  </h2>
                  <button
                    onClick={handleReset}
                    className="text-sm text-purple-600 hover:underline font-medium"
                  >
                    {lang === 'es' ? 'Analizar otro archivo' : 'Analyze another file'}
                  </button>
                </div>

                {/* Score Card */}
                <div className={`rounded-xl border p-6 mb-6 ${getScoreBg(result.score)}`}>
                  <div className="grid grid-cols-2 gap-8 items-center mb-4">
                    <div className="text-left">
                      <span className="text-gray-700 font-medium text-lg">
                        {lang === 'es' ? 'Puntuación' : 'Score'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                        {result.score}/100
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div 
                      className="bg-gradient-purple h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${result.score}%` }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold">{result.verdict}</p>
                </div>

                {/* Report */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-lg mb-4">
                    {lang === 'es' ? 'Reporte Detallado' : 'Detailed Report'}
                  </h3>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                    {result.report}
                  </pre>
                </div>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 bg-gradient-purple text-white px-6 py-3 
                           rounded-xl font-medium hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <Download className="w-4 h-4" />
                  {lang === 'es' ? 'Descargar Reporte' : 'Download Report'}
                </button>
              </div>

              {/* CTA */}
              {result.score >= 60 && (
                <div className="bg-gradient-purple text-white rounded-2xl p-8">
                  <h3 className="text-2xl font-semibold mb-3">
                    🎧 {lang === 'es' 
                      ? '¿Te gustaría que mastericemos esta canción?'
                      : 'Would you like us to master this song?'}
                  </h3>
                  <p className="mb-4 text-purple-100">
                    {lang === 'es'
                      ? 'Tu mezcla está en buen punto. Trabajemos juntos en el mastering.'
                      : 'Your mix is in good shape. Let\'s work together on mastering.'}
                  </p>
                  <button className="bg-white text-purple-600 px-8 py-3 rounded-full 
                                   font-semibold hover:bg-gray-100 transition transform hover:scale-105">
                    {lang === 'es' ? 'Solicitar Mastering' : 'Request Mastering'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {lang === 'es' ? 'Cómo Funciona' : 'How It Works'}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">
                {lang === 'es' ? 'Sube tu mezcla' : 'Upload your mix'}
              </h3>
              <p className="text-gray-600">
                WAV, MP3 {lang === 'es' ? 'o' : 'or'} AIFF {lang === 'es' ? 'hasta' : 'up to'} 50MB
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">
                {lang === 'es' ? 'Análisis automático' : 'Automatic analysis'}
              </h3>
              <p className="text-gray-600">
                {lang === 'es'
                  ? 'En 30 segundos: headroom, LUFS, frecuencias, estéreo'
                  : 'In 30 seconds: headroom, LUFS, frequencies, stereo'}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">
                {lang === 'es' ? 'Reporte profesional' : 'Professional report'}
              </h3>
              <p className="text-gray-600">
                {lang === 'es'
                  ? 'Recomendaciones basadas en metodología comprobada'
                  : 'Recommendations based on proven methodology'}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-bold mb-3">
                {lang === 'es' ? 'Descarga o comparte' : 'Download or share'}
              </h3>
              <p className="text-gray-600">
                {lang === 'es'
                  ? 'Reporte en texto para tu ingeniero'
                  : 'Text report for your engineer'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 gradient-bg text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {lang === 'es'
              ? 'Prepara Tu Mezcla Como Los Profesionales'
              : 'Prepare Your Mix Like The Pros'}
          </h2>
          <p className="text-xl mb-8 text-purple-100">
            {lang === 'es'
              ? 'Metodología profesional comprobada en 300+ producciones'
              : 'Professional methodology proven in 300+ productions'}
          </p>
          
          <button
            onClick={scrollToAnalyzer}
            className="bg-white text-purple-600 px-10 py-4 rounded-full font-bold text-lg 
                     hover:bg-gray-100 transition transform hover:scale-105 shadow-2xl"
          >
            {lang === 'es' 
              ? 'Analiza Tu Mezcla Gratis'
              : 'Analyze Your Mix Free'}
          </button>
          
          <div className="flex justify-center items-center flex-wrap gap-8 mt-8 text-sm">
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              {lang === 'es' ? 'Privacy-first' : 'Privacy-first'}
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              {lang === 'es' ? 'Sin compromiso' : 'No commitment'}
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              {lang === 'es' ? 'Resultados inmediatos' : 'Immediate results'}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-2xl font-bold mb-4">🎵 MasteringReady</div>
          <p className="text-gray-400 mb-8">
            {lang === 'es'
              ? 'Prepara tu mezcla para el mastering profesional'
              : 'Prepare your mix for professional mastering'}
          </p>
          
          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-400">
              © 2025 MasteringReady by Matías Carvajal. {lang === 'es' ? 'Todos los derechos reservados' : 'All rights reserved'}.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {lang === 'es' 
                ? 'Basado en la metodología "Mastering Ready"'
                : 'Based on the "Mastering Ready" methodology'}
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .gradient-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .bg-gradient-purple {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .feature-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  )
}
