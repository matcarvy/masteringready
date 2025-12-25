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
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)

  const handleAnalyze = async () => {
    if (!file) return

    setLoading(true)
    setProgress(0)
    setError(null)

    try {
      let fileToAnalyze = file
      
      // Check if file needs compression
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        setCompressing(true)
        setCompressionProgress(0)
        
        // Simulate compression progress
        const compressionInterval = setInterval(() => {
          setCompressionProgress(prev => Math.min(prev + 10, 90))
        }, 500)
        
        try {
          const { file: compressedFile, compressed, originalSize, newSize } = 
            await compressAudioFile(file, 50)
          
          clearInterval(compressionInterval)
          setCompressionProgress(100)
          
          if (compressed) {
            console.log(`Compressed: ${(originalSize/1024/1024).toFixed(1)}MB → ${(newSize/1024/1024).toFixed(1)}MB`)
          }
          
          fileToAnalyze = compressedFile
          
          // Wait a moment to show completion
          await new Promise(resolve => setTimeout(resolve, 500))
          setCompressing(false)
          setCompressionProgress(0)
        } catch (compressionError) {
          clearInterval(compressionInterval)
          setCompressing(false)
          setCompressionProgress(0)
          throw new Error(
            lang === 'es'
              ? 'Error al comprimir el archivo. Por favor, intenta con un archivo más pequeño.'
              : 'Error compressing file. Please try a smaller file.'
          )
        }
      }

      // Progress bar for analysis
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 98
          if (prev >= 90) return prev + 2
          if (prev >= 70) return prev + 5
          if (prev >= 40) return prev + 8
          return prev + 12
        })
      }, 700)

      const data = await analyzeFile(fileToAnalyze, { lang, mode, strict })
      setProgress(100)
      setResult(data)
      clearInterval(progressInterval)
    } catch (err: any) {
      setError(err.message || (lang === 'es' ? 'Error al analizar' : 'Analysis error'))
    } finally {
      setLoading(false)
      setProgress(0)
      setCompressing(false)
      setCompressionProgress(0)
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

  const isFileTooLarge = file && file.size > 500 * 1024 * 1024 // 500MB hard limit
  const needsCompression = file && file.size > 50 * 1024 * 1024 && file.size <= 500 * 1024 * 1024

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreBg = (score: number) => {
    if (score >= 85) return '#ecfdf5'
    if (score >= 60) return '#fffbeb'
    return '#fef2f2'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                🎵 MasteringReady
              </span>
            </div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  padding: '0.5rem 1rem'
                }}
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <button
                onClick={scrollToAnalyzer}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '9999px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {lang === 'es' ? 'Analizar Gratis' : 'Analyze Free'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '5rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}>
            {/* Left: Copy */}
            <div style={{ color: 'white' }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '9999px',
                padding: '0.5rem 1rem',
                marginBottom: '1.5rem'
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  ✨ {lang === 'es' 
                    ? 'Metodología probada en más de 300 producciones profesionales'
                    : 'Methodology proven in over 300 professional productions'}
                </span>
              </div>
              
              <h1 style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
                lineHeight: '1.2'
              }}>
                {lang === 'es'
                  ? '¿Tu mezcla está lista para el mastering?'
                  : 'Is your mix ready for mastering?'}
              </h1>
              
              <p style={{
                fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                marginBottom: '2rem',
                color: '#e9d5ff'
              }}>
                {lang === 'es'
                  ? 'Análisis técnico en 30 segundos + recomendaciones basadas en metodología profesional'
                  : 'Technical analysis in 30 seconds + recommendations based on professional methodology'}
              </p>
              
              <button
                onClick={scrollToAnalyzer}
                style={{
                  background: 'white',
                  color: '#667eea',
                  padding: '1rem 2rem',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  fontSize: '1.125rem',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '2rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'
                }}
              >
                {lang === 'es' ? 'Analiza Tu Mezcla Gratis' : 'Analyze Your Mix Free'}
              </button>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem' }}>
                {[
                  lang === 'es' ? 'Sin tarjeta requerida' : 'No credit card required',
                  'Privacy-first',
                  lang === 'es' ? 'Español e Inglés' : 'Spanish & English'
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check size={20} />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right: Demo Card */}
            <div>
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                padding: '2rem',
                transition: 'transform 0.3s'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>
                      {lang === 'es' ? 'Puntuación' : 'Score'}
                    </span>
                    <span style={{
                      fontSize: '2.25rem',
                      fontWeight: 'bold',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      85/100
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '0.75rem',
                    background: '#e5e7eb',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '85%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Headroom', value: '-6.2 dB' },
                    { label: 'True Peak', value: '-3.1 dBTP' },
                    { label: lang === 'es' ? 'Balance Estéreo' : 'Stereo Balance', value: '0.75' }
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: '#ecfdf5',
                      borderRadius: '0.5rem'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46' }}>
                        <Check size={20} color="#10b981" />
                        {item.label}
                      </span>
                      <span style={{ color: '#047857', fontWeight: '600' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: '#f3e8ff',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b21a8', fontWeight: '500' }}>
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
      <section id="features" style={{
        padding: '5rem 1.5rem',
        background: '#f9fafb'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {lang === 'es' ? '¿Por qué MasteringReady?' : 'Why MasteringReady?'}
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
              {lang === 'es'
                ? 'Metodología profesional basada en 300+ producciones'
                : 'Professional methodology based on 300+ productions'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            {[
              {
                icon: <Zap size={48} color="#667eea" />,
                title: lang === 'es' ? 'Análisis en 30 Segundos' : 'Analysis in 30 Seconds',
                desc: lang === 'es'
                  ? 'Headroom, LUFS, True Peak, balance de frecuencias, estéreo y más.'
                  : 'Headroom, LUFS, True Peak, frequency balance, stereo and more.'
              },
              {
                icon: <Shield size={48} color="#667eea" />,
                title: 'Privacy-First',
                desc: lang === 'es'
                  ? 'Tu audio se analiza solo en memoria y se elimina inmediatamente.'
                  : 'Your audio is analyzed in-memory only and deleted immediately.'
              },
              {
                icon: <TrendingUp size={48} color="#667eea" />,
                title: lang === 'es' ? 'Metodología Profesional' : 'Professional Methodology',
                desc: lang === 'es'
                  ? 'Basado en técnicas de ingenieros top.'
                  : 'Based on techniques from top engineers.'
              }
            ].map((feature, i) => (
              <div key={i} style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                transition: 'transform 0.3s, box-shadow 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'
              }}>
                <div style={{ marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analyzer Section - Same as before but with inline styles */}
      <section id="analyze" style={{ padding: '5rem 1.5rem', background: 'white' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          {!result ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  {lang === 'es' ? 'Analiza Tu Mezcla Ahora' : 'Analyze Your Mix Now'}
                </h2>
                <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                  {lang === 'es'
                    ? 'Sube tu archivo y obtén un reporte profesional en 30 segundos'
                    : 'Upload your file and get a professional report in 30 seconds'}
                </p>
              </div>

              {/* Privacy Badge */}
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Shield size={20} color="#059669" />
                  <span style={{ fontWeight: '600', color: '#064e3b' }}>
                    🔒 Privacy-First Analyzer
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#065f46' }}>
                  {lang === 'es'
                    ? 'Tu audio se analiza solo en memoria y se elimina inmediatamente.'
                    : 'Your audio is analyzed in-memory only and deleted immediately.'}
                </p>
              </div>

              {/* File Upload */}
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                padding: '2rem',
                marginBottom: '1.5rem'
              }}>
                <div
                  onClick={() => !loading && document.getElementById('file-input')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#a855f7'
                      e.currentTarget.style.background = '#faf5ff'
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.background = 'transparent'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.background = 'transparent'
                    
                    if (!loading && e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setFile(e.dataTransfer.files[0])
                    }
                  }}
                  style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '0.75rem',
                    padding: '3rem',
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#a855f7'
                      e.currentTarget.style.background = '#faf5ff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".wav,.mp3,.aiff"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                    disabled={loading}
                  />
                  
                  <Upload size={64} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    {lang === 'es' ? 'Sube tu mezcla' : 'Upload your mix'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {lang === 'es'
                      ? 'Arrastra y suelta o haz click para seleccionar'
                      : 'Drag and drop or click to select'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                    WAV, MP3 o AIFF (máx 50MB)
                  </p>
                </div>
              </div>

              {/* Selected File */}
              {file && (
                <div style={{
                  borderRadius: '0.5rem',
                  border: `1px solid ${isFileTooLarge ? '#fca5a5' : needsCompression ? '#fbbf24' : '#93c5fd'}`,
                  background: isFileTooLarge ? '#fef2f2' : needsCompression ? '#fffbeb' : '#eff6ff',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: isFileTooLarge ? '#7f1d1d' : needsCompression ? '#78350f' : '#1e3a8a'
                  }}>
                    {lang === 'es' ? 'Archivo seleccionado:' : 'Selected file:'}
                  </p>
                  <p style={{
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: isFileTooLarge ? '#7f1d1d' : needsCompression ? '#78350f' : '#1e3a8a'
                  }}>
                    {file.name}
                  </p>
                  <p style={{
                    fontSize: '0.875rem',
                    color: isFileTooLarge ? '#991b1b' : needsCompression ? '#92400e' : '#1e40af'
                  }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {needsCompression && !isFileTooLarge && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#fef3c7',
                      border: '1px solid #fbbf24',
                      borderRadius: '0.25rem',
                      padding: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#78350f', fontWeight: '600', marginBottom: '0.25rem' }}>
                        ℹ️ {lang === 'es' 
                          ? 'Archivo grande detectado'
                          : 'Large file detected'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#92400e' }}>
                        {lang === 'es'
                          ? `Tu archivo será comprimido automáticamente de ${(file.size / 1024 / 1024).toFixed(1)}MB a ~${Math.min(45, (file.size / 1024 / 1024) * 0.4).toFixed(1)}MB antes del análisis. Esto toma ~10-15 segundos.`
                          : `Your file will be automatically compressed from ${(file.size / 1024 / 1024).toFixed(1)}MB to ~${Math.min(45, (file.size / 1024 / 1024) * 0.4).toFixed(1)}MB before analysis. Takes ~10-15 seconds.`}
                      </p>
                    </div>
                  )}
                  {isFileTooLarge && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      borderRadius: '0.25rem',
                      padding: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#7f1d1d', fontWeight: '600', marginBottom: '0.25rem' }}>
                        ⚠️ {lang === 'es' 
                          ? 'Archivo demasiado grande'
                          : 'File too large'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#991b1b' }}>
                        {lang === 'es'
                          ? `El límite máximo es 500MB. Tu archivo tiene ${(file.size / 1024 / 1024).toFixed(1)}MB. Por favor, usa un archivo más pequeño.`
                          : `Maximum limit is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please use a smaller file.`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Options */}
              {file && !isFileTooLarge && (
                <div style={{
                  background: 'white',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '1rem' }}>
                    {lang === 'es' ? 'Opciones de Análisis' : 'Analysis Options'}
                  </h3>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      {lang === 'es' ? 'Modo de Reporte' : 'Report Mode'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {['short', 'write'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m as 'short' | 'write')}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: mode === m ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6',
                            color: mode === m ? 'white' : '#111827',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {m === 'short' ? '📱 Short' : '📄 Write'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={strict}
                        onChange={(e) => setStrict(e.target.checked)}
                        style={{ width: '1rem', height: '1rem', borderRadius: '0.25rem' }}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        {lang === 'es' ? 'Modo Strict' : 'Strict Mode'}
                      </span>
                    </label>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                      {lang === 'es'
                        ? 'Estándares comerciales más exigentes'
                        : 'More demanding commercial standards'}
                    </p>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              {file && !isFileTooLarge && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading || compressing}
                  style={{
                    width: '100%',
                    background: (loading || compressing) ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: (loading || compressing) ? '#6b7280' : 'white',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    fontWeight: '600',
                    fontSize: '1.125rem',
                    border: 'none',
                    cursor: (loading || compressing) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: (loading || compressing) ? 'none' : '0 4px 20px rgba(102, 126, 234, 0.3)',
                    opacity: (loading || compressing) ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !compressing) {
                      e.currentTarget.style.transform = 'scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = (loading || compressing) ? 'none' : '0 4px 20px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {compressing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '1.25rem', width: '1.25rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{lang === 'es' ? 'Comprimiendo...' : 'Compressing...'}</span>
                      </div>
                      <div style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '9999px',
                        height: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          background: 'white',
                          height: '0.5rem',
                          borderRadius: '9999px',
                          transition: 'width 0.3s',
                          width: `${compressionProgress}%`
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                        {compressionProgress}% • {lang === 'es' 
                          ? `${(file.size / 1024 / 1024).toFixed(1)}MB → ~${Math.min(45, (file.size / 1024 / 1024) * 0.4).toFixed(1)}MB`
                          : `${(file.size / 1024 / 1024).toFixed(1)}MB → ~${Math.min(45, (file.size / 1024 / 1024) * 0.4).toFixed(1)}MB`}
                      </span>
                    </div>
                  ) : loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '1.25rem', width: '1.25rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{lang === 'es' ? 'Analizando...' : 'Analyzing...'}</span>
                      </div>
                      <div style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '9999px',
                        height: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          background: 'white',
                          height: '0.5rem',
                          borderRadius: '9999px',
                          transition: 'width 0.3s',
                          width: `${progress}%`
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                        {progress}% • {lang === 'es' ? 'Hasta 30 segundos' : 'Up to 30 seconds'}
                      </span>
                    </div>
                  ) : (
                    <>
                      {needsCompression ? (
                        <>
                          {lang === 'es' ? '🗜️ Comprimir y Analizar' : '🗜️ Compress & Analyze'}
                        </>
                      ) : (
                        lang === 'es' ? 'Analizar Mezcla' : 'Analyze Mix'
                      )}
                    </>
                  )}
                </button>
              )}

              {/* Message when file is too large (>500MB) */}
              {file && isFileTooLarge && (
                <div style={{
                  width: '100%',
                  background: '#fee2e2',
                  border: '2px solid #ef4444',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '600', 
                    color: '#7f1d1d',
                    marginBottom: '0.5rem'
                  }}>
                    🚫 {lang === 'es' ? 'Archivo demasiado grande' : 'File too large'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                    {lang === 'es'
                      ? `El límite máximo es 500MB. Tu archivo tiene ${(file.size / 1024 / 1024).toFixed(1)}MB.`
                      : `Maximum limit is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.5rem' }}>
                    {lang === 'es'
                      ? 'Contáctanos en support@masteringready.com para archivos más grandes.'
                      : 'Contact us at support@masteringready.com for larger files.'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <p style={{ color: '#7f1d1d', fontWeight: '500' }}>Error:</p>
                  <p style={{ color: '#991b1b' }}>{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Results - Same structure but inline styles */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                padding: '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem'
                }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {lang === 'es' ? 'Resultados del Análisis' : 'Analysis Results'}
                  </h2>
                  <button
                    onClick={handleReset}
                    style={{
                      fontSize: '0.875rem',
                      color: '#a855f7',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontWeight: '500'
                    }}
                  >
                    {lang === 'es' ? 'Analizar otro archivo' : 'Analyze another file'}
                  </button>
                </div>

                {/* Score Card */}
                <div style={{
                  borderRadius: '0.75rem',
                  border: `1px solid ${result.score >= 85 ? '#a7f3d0' : result.score >= 60 ? '#fcd34d' : '#fca5a5'}`,
                  background: getScoreBg(result.score),
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2rem',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ color: '#374151', fontWeight: '500', fontSize: '1.125rem' }}>
                        {lang === 'es' ? 'Puntuación' : 'Score'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: getScoreColor(result.score)
                      }}>
                        {result.score}/100
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    background: '#e5e7eb',
                    borderRadius: '9999px',
                    height: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      height: '0.75rem',
                      borderRadius: '9999px',
                      width: `${result.score}%`,
                      transition: 'width 0.5s'
                    }} />
                  </div>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>{result.verdict}</p>
                </div>

                {/* Report */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '1rem' }}>
                    {lang === 'es' ? 'Reporte Detallado' : 'Detailed Report'}
                  </h3>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}>
                    {result.report}
                  </pre>
                </div>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <Download size={16} />
                  {lang === 'es' ? 'Descargar Reporte' : 'Download Report'}
                </button>
              </div>

              {/* CTA */}
              {result.score >= 60 && (
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '1rem',
                  padding: '2rem'
                }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    🎧 {lang === 'es' 
                      ? '¿Te gustaría que mastericemos esta canción?'
                      : 'Would you like us to master this song?'}
                  </h3>
                  <p style={{ marginBottom: '1rem', color: '#e9d5ff' }}>
                    {lang === 'es'
                      ? 'Tu mezcla está en buen punto. Trabajemos juntos en el mastering.'
                      : 'Your mix is in good shape. Let\'s work together on mastering.'}
                  </p>
                  <button style={{
                    background: 'white',
                    color: '#667eea',
                    padding: '0.75rem 2rem',
                    borderRadius: '9999px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.background = '#f3f4f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.background = 'white'
                  }}>
                    {lang === 'es' ? 'Solicitar Mastering' : 'Request Mastering'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#111827',
        color: 'white',
        padding: '3rem 1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            🎵 MasteringReady
          </div>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
            {lang === 'es'
              ? 'Prepara tu mezcla para el mastering profesional'
              : 'Prepare your mix for professional mastering'}
          </p>
          
          <div style={{ borderTop: '1px solid #374151', paddingTop: '2rem' }}>
            <p style={{ color: '#9ca3af' }}>
              © 2025 MasteringReady by Matías Carvajal.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              {lang === 'es' 
                ? 'Basado en la metodología "Mastering Ready"'
                : 'Based on the "Mastering Ready" methodology'}
            </p>
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
