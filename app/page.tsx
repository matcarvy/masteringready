'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Check, Upload, Zap, Shield, TrendingUp, Play, Music } from 'lucide-react'
import { analyzeFile } from '@/lib/api'
import { startAnalysisPolling, getAnalysisStatus } from '@/lib/api'
import { compressAudioFile } from '@/lib/audio-compression'

// Interpretative Section Component
interface InterpretativeSectionProps {
  title: string
  interpretation: string
  recommendation: string
  metrics: {
    [key: string]: any
    status: 'excellent' | 'good' | 'warning' | 'error'
  }
  lang: 'es' | 'en'
}

function InterpretativeSection({ title, interpretation, recommendation, metrics, lang }: InterpretativeSectionProps) {
  const statusColors = {
    excellent: { border: '#10b981', bg: '#d1fae5', text: '#065f46' },
    good: { border: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
    warning: { border: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
    error: { border: '#ef4444', bg: '#fee2e2', text: '#991b1b' }
  }

  const colors = statusColors[metrics.status] || statusColors.good

  return (
    <div style={{
      border: `2px solid ${colors.border}`,
      borderRadius: '1rem',
      padding: '1.5rem',
      background: 'white',
      marginBottom: '1.5rem'
    }}>
      {/* Title */}
      <h4 style={{
        fontSize: '1.25rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {title}
      </h4>
      
      {/* 1. TECHNICAL METRICS FIRST */}
      <div style={{
        background: '#f9fafb',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.25rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          fontSize: '0.875rem', 
          color: '#6b7280',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {Object.entries(metrics).map(([key, value]) => {
            if (key === 'status') return null
            
            // Format key names with correct capitalization
            let formattedKey = key
            
            // Handle specific cases first
            if (key === 'headroom_dbfs') {
              formattedKey = 'Headroom dBFS'
            } else if (key === 'true_peak_dbtp') {
              formattedKey = 'True Peak dBTP'
            } else if (key === 'plr' || key === 'dr_lu') {
              formattedKey = 'PLR'
            } else if (key === 'balance_l_r' || key === 'balance_lr') {
              formattedKey = 'Balance L/R'
            } else if (key === 'ms_ratio') {
              formattedKey = 'M/S Ratio'
            } else if (key === 'correlation') {
              formattedKey = 'Correlation'
            } else if (key === 'lufs') {
              formattedKey = 'LUFS'
            } else {
              // Generic formatting for other keys
              formattedKey = key
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }
            
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{formattedKey}:</strong>
                <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* 2. INTERPRETATION TEXT SECOND */}
      <p style={{
        fontSize: '1rem',
        lineHeight: '1.7',
        marginBottom: '1.25rem',
        color: '#374151'
      }}>
        {interpretation}
      </p>
      
      {/* 3. RECOMMENDATION THIRD */}
      <div style={{
        background: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        padding: '0.75rem 1rem',
        borderRadius: '0.25rem'
      }}>
        <p style={{
          fontSize: '0.875rem',
          color: '#1e40af',
          margin: 0,
          lineHeight: '1.6'
        }}>
          <strong>💡 {lang === 'es' ? 'Recomendación' : 'Recommendation'}:</strong> {recommendation}
        </p>
      </div>
    </div>
  )
}

function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [mode, setMode] = useState<'short' | 'write'>('write')
  const [strict, setStrict] = useState(false)
  const [langDetected, setLangDetected] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [reportView, setReportView] = useState<'visual' | 'short' | 'write'>('visual')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedback, setFeedback] = useState({ rating: 0, liked: '', change: '', add: '' })
  
  // Store request ID for PDF download
  const requestIdRef = useRef<string>('')

  // Auto-detect language based on user's location
  useEffect(() => {
    if (!langDetected) {
      // Try to detect language from browser/timezone
      const detectLanguage = async () => {
        try {
          // Get timezone
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          
          // Spanish-speaking regions and Spain
          const spanishRegions = [
            'America/', // All Americas (Latin America)
            'Europe/Madrid', // Spain
            'Atlantic/Canary', // Canary Islands
            'Africa/Ceuta' // Spanish territories
          ]
          
          // Check if timezone matches Spanish-speaking regions
          const isSpanishRegion = spanishRegions.some(region => timezone.startsWith(region))
          
          // Also check browser language as fallback
          const browserLang = navigator.language || navigator.languages?.[0] || ''
          const isSpanishLang = browserLang.toLowerCase().startsWith('es')
          
          // Set Spanish if either timezone or browser language indicates Spanish
          if (isSpanishRegion || isSpanishLang) {
            setLang('es')
          } else {
            // Default to English for rest of the world
            setLang('en')
          }
          
          setLangDetected(true)
        } catch (error) {
          // If detection fails, keep default (Spanish)
          setLangDetected(true)
        }
      }
      
      detectLanguage()
    }
  }, [langDetected])

  // Scroll to results when analysis completes
  useEffect(() => {
    if (result) {
      const resultsElement = document.getElementById('analysis-results')
      if (resultsElement) {
        setTimeout(() => {
          resultsElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          })
        }, 100)
      }
    }
  }, [result])

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

const handleAnalyze = async () => {
  if (!file) return

  setLoading(true)
  setProgress(0)
  setError(null)

  try {
    let fileToAnalyze = file
    
    // Check if file needs compression
    const maxSize = 30 * 1024 * 1024  // 30MB threshold
    if (file.size > maxSize) {
      setCompressing(true)
      setCompressionProgress(0)
      
      // Simulate compression progress
      const compressionInterval = setInterval(() => {
        setCompressionProgress(prev => Math.min(prev + 10, 90))
      }, 500)
      
      try {
        const { file: compressedFile, compressed, originalSize, newSize } = 
          await compressAudioFile(file, 20)
        
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

    // START ANALYSIS (returns job_id immediately)
    console.log('🚀 Starting analysis with polling...')
    const startData = await startAnalysisPolling(fileToAnalyze, { lang, mode, strict })
    const jobId = startData.job_id
    
    // Store request ID for PDF download
    requestIdRef.current = jobId
    
    console.log(`🆔 Job ID: ${jobId}`)
    setProgress(10)
    
    // POLL FOR RESULT
    let pollAttempts = 0
    const maxPollAttempts = 60  // 60 attempts * 3 sec = 3 min max
    
    const pollForResult = async (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          pollAttempts++
          
          try {
            const statusData = await getAnalysisStatus(jobId)
            
            console.log(`📊 Poll ${pollAttempts}: ${statusData.status} - ${statusData.progress}%`)
            
            // Update progress bar (don't allow it to go backwards)
            setProgress(prev => Math.max(prev, statusData.progress || 0))
            
            if (statusData.status === 'complete') {
              clearInterval(pollInterval)
              console.log('✅ Analysis complete!')
              resolve(statusData.result)
              
            } else if (statusData.status === 'error') {
              clearInterval(pollInterval)
              console.error('❌ Analysis error:', statusData.error)
              reject(new Error(statusData.error || 'Analysis failed'))
              
            } else if (pollAttempts >= maxPollAttempts) {
              clearInterval(pollInterval)
              console.error('⏱️ Polling timeout')
              reject(new Error(
                lang === 'es'
                  ? 'El análisis está tardando más de lo esperado. Por favor, intenta de nuevo.'
                  : 'Analysis is taking longer than expected. Please try again.'
              ))
            }
            
          } catch (pollError: any) {
            clearInterval(pollInterval)
            console.error('❌ Polling error:', pollError)
            reject(pollError)
          }
          
        }, 3000)  // Poll every 3 seconds
      })
    }
    
    // Wait for result
    const data = await pollForResult()
    
    setProgress(100)
    setResult(data)
    console.log('🔍 RESULT:', data)
    console.log('🔍 Has interpretations:', !!data.interpretations)
    
    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    
  } catch (err: any) {
    console.error('Analysis error:', err)
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
    
    let content = ''
    
    if (reportView === 'visual') {
      // Quick mode download - Include ALL visual analysis content
      const visualReport = (result as any).report_visual || result.report_short || result.report || ''
      const cleanedReport = cleanReportText(visualReport)
      
      content = `${lang === 'es' ? 'ANÁLISIS RÁPIDO' : 'QUICK ANALYSIS'}
${'═'.repeat(50)}

${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Puntuación' : 'Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}

${lang === 'es' ? 'MÉTRICAS PRINCIPALES' : 'MAIN METRICS'}
${'─'.repeat(50)}
Headroom:              ${result.metrics?.find((m: any) => m.name === 'Headroom')?.value || 'N/A'}
True Peak:             ${result.metrics?.find((m: any) => m.name === 'True Peak')?.value || 'N/A'}
${lang === 'es' ? 'Balance Estéreo' : 'Stereo Balance'}:       ${result.metrics?.find((m: any) => m.name === 'Stereo Balance' || m.name === 'Balance Estéreo')?.value || 'N/A'}
LUFS:                  ${result.metrics?.find((m: any) => m.name === 'LUFS')?.value || 'N/A'}
PLR:                   ${result.metrics?.find((m: any) => m.name === 'PLR')?.value || 'N/A'}
${lang === 'es' ? 'Correlación' : 'Correlation'}:           ${result.metrics?.find((m: any) => m.name === 'Correlation' || m.name === 'Correlación')?.value || 'N/A'}

${lang === 'es' ? 'ANÁLISIS DETALLADO' : 'DETAILED ANALYSIS'}
${'─'.repeat(50)}
${cleanedReport}

${'─'.repeat(50)}
${lang === 'es' ? 'Generado por' : 'Generated by'} Mastering Ready
${new Date().toLocaleDateString()}
`
    } else if (reportView === 'short') {
      // Summary mode download
      content = `${lang === 'es' ? 'ANÁLISIS RESUMEN' : 'SUMMARY ANALYSIS'}
${'═'.repeat(50)}

${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Puntuación' : 'Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}

${'─'.repeat(50)}
${cleanReportText(result.report_short || result.report)}

${'─'.repeat(50)}
${lang === 'es' ? 'Generado por' : 'Generated by'} Mastering Ready
${new Date().toLocaleDateString()}
`
    } else {
      // Complete mode download - Include interpretations
      let completeContent = `${lang === 'es' ? 'ANÁLISIS TÉCNICO DETALLADO' : 'DETAILED TECHNICAL ANALYSIS'}
${'═'.repeat(50)}

${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Puntuación' : 'Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}
`

      // Add interpretative sections FIRST if they exist
      if (result.interpretations) {
        
        // Helper function to format interpretation section
        const formatInterpretation = (
          sectionKey: string, 
          titleEs: string, 
          titleEn: string
        ) => {
          const section = result.interpretations[sectionKey]
          if (!section) return ''
          
          const title = lang === 'es' ? titleEs : titleEn
          const recLabel = lang === 'es' ? 'Recomendación' : 'Recommendation'
          
          let output = `

${title}
${'─'.repeat(50)}
`
          
          // Add metrics FIRST
          const metrics = section.metrics || {}
          const metricsEntries = Object.entries(metrics).filter(([key]) => key !== 'status')
          
          if (metricsEntries.length > 0) {
            output += `\n${lang === 'es' ? 'Datos técnicos' : 'Technical data'}:\n`
            
            for (const [key, value] of metricsEntries) {
            
            // Format key names with correct capitalization
            let formattedKey = key
            
            // Handle specific cases first (same as visual component)
            if (key === 'headroom_dbfs') {
              formattedKey = 'Headroom dBFS'
            } else if (key === 'true_peak_dbtp') {
              formattedKey = 'True Peak dBTP'
            } else if (key === 'plr' || key === 'dr_lu') {
              formattedKey = 'PLR'
            } else if (key === 'balance_l_r' || key === 'balance_lr') {
              formattedKey = 'Balance L/R'
            } else if (key === 'ms_ratio') {
              formattedKey = 'M/S Ratio'
            } else if (key === 'correlation') {
              formattedKey = 'Correlation'
            } else if (key === 'lufs') {
              formattedKey = 'LUFS'
            } else {
              // Generic formatting for other keys
              formattedKey = key
                .replace(/_/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }
            
            const formattedValue = typeof value === 'number' ? value.toFixed(2) : value
            output += `  • ${formattedKey}: ${formattedValue}\n`
            }
          }
          
          // Add interpretation AFTER metrics
          output += `\n${section.interpretation}\n`
          
          // Add recommendation LAST
          output += `\n💡 ${recLabel}: ${section.recommendation}\n`
          
          return output
        }
        
        // Add all 4 sections
        completeContent += formatInterpretation(
          'headroom',
          '🎚️ HEADROOM & TRUE PEAK',
          '🎚️ HEADROOM & TRUE PEAK'
        )
        
        completeContent += formatInterpretation(
          'dynamic_range',
          '📈 RANGO DINÁMICO',
          '📈 DYNAMIC RANGE'
        )
        
        completeContent += formatInterpretation(
          'overall_level',
          '🔊 NIVEL GENERAL',
          '🔊 OVERALL LEVEL'
        )
        
        completeContent += formatInterpretation(
          'stereo_balance',
          '🎚️ BALANCE ESTÉREO',
          '🎚️ STEREO BALANCE'
        )
      }
      
      // Add complete narrative analysis AFTER technical sections
      completeContent += `

${'═'.repeat(50)}
${lang === 'es' ? 'ANÁLISIS COMPLETO' : 'COMPLETE ANALYSIS'}
${'═'.repeat(50)}

${'─'.repeat(50)}
${cleanReportText(result.report_write || result.report)}
`
      
      // Add footer
      completeContent += `
${'─'.repeat(50)}
${lang === 'es' ? 'Generado por' : 'Generated by'} Mastering Ready
${new Date().toLocaleDateString()}
`
      
      content = completeContent
    }
    
    // Get translated filename
    const getModeFilename = (mode: string) => {
      const modeNames = {
        es: {
          visual: 'rapido',
          short: 'resumen',
          write: 'completo'
        },
        en: {
          visual: 'quick',
          short: 'summary',
          write: 'complete'
        }
      }
      return modeNames[lang][mode as keyof typeof modeNames.es] || mode
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masteringready-${getModeFilename(reportView)}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadFull = async () => {
    if (!result) {
      console.error('❌ No result available')
      alert(lang === 'es' ? 'Error: análisis no disponible' : 'Error: analysis not available')
      return
    }

    // Verify that analysis is actually complete
    if (!result.score || !result.verdict) {
      console.error('❌ Analysis incomplete, missing score or verdict')
      alert(lang === 'es' 
        ? 'El análisis aún no está completo. Por favor espera unos segundos.' 
        : 'Analysis not yet complete. Please wait a few seconds.')
      return
    }
    
    try {
      // Try PDF first if endpoint is available
      if (requestIdRef.current) {
        console.log('📄 Attempting PDF download...')
        console.log('🆔 Request ID:', requestIdRef.current)
        console.log('🌍 Language:', lang)
        console.log('📊 Score:', result.score, 'Verdict:', result.verdict)
        
        try {
          const formData = new FormData()
          formData.append('request_id', requestIdRef.current)
          formData.append('lang', lang)

          // Use full backend URL instead of relative path
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://masteringready.onrender.com'
          const pdfUrl = `${backendUrl}/api/download/pdf`
          console.log('🔗 Calling:', pdfUrl)
          
          const response = await fetch(pdfUrl, {
            method: 'POST',
            body: formData
          })

          console.log('📡 Response status:', response.status)

          if (response.ok) {
            // PDF download successful
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const filename = result.filename?.replace(/\.(wav|mp3|flac)$/i, '') || 'analisis'
            a.download = `masteringready-${lang === 'es' ? 'detallado' : 'detailed'}-${filename}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            
            console.log('✅ PDF downloaded successfully')
            return
          } else {
            const errorText = await response.text()
            console.error('❌ PDF error response:', errorText)
            console.warn('⚠️ PDF endpoint returned error, falling back to TXT')
          }
        } catch (pdfError) {
          console.error('❌ PDF exception:', pdfError)
          console.warn('⚠️ PDF download failed, falling back to TXT')
        }
      } else {
        console.warn('⚠️ No request ID available, skipping PDF, using TXT')
      }
      
      // Fallback to TXT download
      console.log('📄 Downloading complete TXT report...')
      
      const content = `${'═'.repeat(50)}
   MASTERINGREADY - ${lang === 'es' ? 'Reporte Completo' : 'Complete Report'}
${'═'.repeat(50)}

${lang === 'es' ? 'INFORMACIÓN DEL ARCHIVO' : 'FILE INFORMATION'}
${lang === 'es' ? 'Archivo' : 'File'}: ${result.filename || 'N/A'}
${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
${lang === 'es' ? 'Puntuación' : 'Score'}: ${result.score}/100
${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${result.verdict}

${lang === 'es' ? 'ANÁLISIS RÁPIDO' : 'QUICK ANALYSIS'}
${cleanReportText((result as any).report_visual || '')}

${lang === 'es' ? 'ANÁLISIS RESUMEN' : 'SUMMARY ANALYSIS'}
${cleanReportText(result.report_short || '')}

${lang === 'es' ? 'ANÁLISIS COMPLETO' : 'COMPLETE ANALYSIS'}
${cleanReportText(result.report_write || result.report || '')}

${'─'.repeat(50)}
${lang === 'es' ? 'Analizado con' : 'Analyzed with'} Mastering Ready
www.masteringready.com
by Matías Carvajal
`
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = result.filename?.replace(/\.(wav|mp3|flac)$/i, '') || 'analisis'
      a.download = `masteringready-${lang === 'es' ? 'detallado' : 'detailed'}-${filename}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('✅ TXT downloaded successfully')
      
    } catch (error) {
      // Only show error if TXT download also failed
      console.error('❌ Complete download failed:', error)
      alert(lang === 'es' 
        ? 'Error al descargar archivo. Por favor intenta de nuevo.' 
        : 'Error downloading file. Please try again.')
    }
  }

  const scrollToAnalyzer = () => {
    document.getElementById('analyze')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Clean report text from decorative lines for better mobile display
  const cleanReportText = (text: string): string => {
    if (!text) return ''
    
    return text
      // Remove song title header (already shown above)
      .replace(/^🎵\s*Sobre\s*"[^"]*"\s*\n*/i, '')
      .replace(/^🎵\s*About\s*"[^"]*"\s*\n*/i, '')
      // Remove score and verdict lines (already shown in header)
      .replace(/^Puntuación:\s*\d+\/100\s*\n*/im, '')
      .replace(/^Score:\s*\d+\/100\s*\n*/im, '')
      .replace(/^Veredicto:\s*[^\n]+\s*\n*/im, '')
      .replace(/^Verdict:\s*[^\n]+\s*\n*/im, '')
      // Remove ALL decorative lines (multiple patterns)
      .replace(/[═─━]{3,}/g, '')              // Lines with 3+ chars (including ━)
      .replace(/^[═─━\s]+$/gm, '')            // Lines that are ONLY decorative chars
      .replace(/[═─━]{2,}/g, '')              // Lines with 2+ chars (more aggressive)
      // Fix headers: Add emojis and proper casing (ONLY if not already present)
      .replace(/(?<!✅\s)ASPECTOS POSITIVOS/g, '✅ Aspectos Positivos')
      .replace(/(?<!✅\s)POSITIVE ASPECTS/g, '✅ Positive Aspects')
      .replace(/(?<!⚠️\s)ASPECTOS PARA REVISAR/g, '⚠️ Aspectos para Revisar')
      .replace(/(?<!⚠️\s)AREAS TO REVIEW/g, '⚠️ Areas to Review')
      // Fix additional headers (ONLY if not already present)
      .replace(/(?<!⚠️\s)SI ESTE ARCHIVO CORRESPONDE A UNA MEZCLA:/g, '⚠️ Si este archivo corresponde a una mezcla:')
      .replace(/(?<!⚠️\s)IF THIS FILE IS A MIX:/g, '⚠️ If this file is a mix:')
      .replace(/(?<!✅\s)SI ESTE ES TU MASTER FINAL:/g, '✅ Si este es tu master final:')
      .replace(/(?<!✅\s)IF THIS IS YOUR FINAL MASTER:/g, '✅ If this is your final master:')
      // Remove duplicate emojis
      .replace(/✅\s*✅/g, '✅')
      .replace(/⚠️\s*⚠️/g, '⚠️')
      // Remove excessive newlines (max 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Remove lines that are just spaces
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Final cleanup - max 2 newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim()
  }

  const isFileTooLarge = file && file.size > 500 * 1024 * 1024 // 500MB hard limit
  const needsCompression = file && file.size > 30 * 1024 * 1024 && file.size <= 500 * 1024 * 1024  // 30MB threshold

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
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Music size={24} style={{ color: '#667eea', flexShrink: 0 }} /> Mastering Ready
                <span style={{
                  fontSize: '0.5em',
                  fontWeight: '700',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                  backgroundColor: '#667eea',
                  padding: '0.2em 0.5em',
                  borderRadius: '0.3em',
                  verticalAlign: 'middle',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  BETA
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'clamp(0.5rem, 2vw, 1rem)', alignItems: 'center' }}>
              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                style={{
                  fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                  fontWeight: '500',
                  color: '#6b7280',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  padding: 'clamp(0.25rem, 1vw, 0.5rem) clamp(0.5rem, 2vw, 1rem)'
                }}
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <button
                onClick={scrollToAnalyzer}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 3vw, 1.5rem)',
                  borderRadius: '9999px',
                  fontWeight: '600',
                  fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  whiteSpace: 'nowrap'
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
                {lang === 'es' ? 'Analizar' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" style={{
        paddingBottom: '4rem',
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
              <div className="methodology-badge" style={{
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '9999px',
                padding: '0.5rem 1rem'
              }}>
                <span style={{ fontSize: '1rem', fontWeight: '500' }}>
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
                  ? 'Análisis técnico en 60 segundos + recomendaciones basadas en metodologías profesionales'
                  : 'Technical analysis in 60 seconds + recommendations based on professional methodologies'}
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
                {lang === 'es' ? 'Pruébalo sin costo' : 'Try it free'}
              </button>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem' }}>
                {[
                  'Privacy-first',
                  lang === 'es' ? 'Inglés y Español' : 'English & Spanish'
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check size={20} />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right: Demo Card */}
            <div className="demo-card-container">
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
                      97/100
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
                      width: '97%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Headroom', value: '-6.2 dBFS' },
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
                  <p style={{ fontSize: '1rem', color: '#6b21a8', fontWeight: '600' }}>
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
      <section id="features" className="features-section" style={{
        background: '#f9fafb'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="features-title-container" style={{ 
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {lang === 'es' ? '¿Por qué Mastering Ready?' : 'Why Mastering Ready?'}
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
            gap: '1.5rem'
          }}>
            {[
              {
                icon: <Zap size={48} color="#667eea" />,
                title: lang === 'es' ? 'Análisis en 60 segundos o menos' : 'Analysis in 60 seconds or less',
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
      <section id="analyze" className="analyzer-section" style={{ 
        background: 'white' 
      }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          {!result ? (
            <>
              <div className="analyzer-title-container" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  {lang === 'es' ? 'Analiza Tu Mezcla Ahora' : 'Analyze Your Mix Now'}
                </h2>
                <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                  {lang === 'es'
                    ? 'Sube tu archivo y obtén un reporte profesional en 60 segundos o menos'
                    : 'Upload your file and get a professional report in 60 seconds or less'}
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
                      const droppedFile = e.dataTransfer.files[0]
                      setFile(droppedFile)
                      
                      // Scroll to analyze section
                      setTimeout(() => {
                        const analyzeSection = document.getElementById('analyze-section')
                        if (analyzeSection) {
                          analyzeSection.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center'
                          })
                        }
                      }, 100)
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
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] || null
                      setFile(selectedFile)
                      
                      // Scroll to analyze section when file is selected
                      if (selectedFile) {
                        setTimeout(() => {
                          const analyzeSection = document.getElementById('analyze-section')
                          if (analyzeSection) {
                            analyzeSection.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'center'
                            })
                          }
                        }, 100)
                      }
                    }}
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
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#f0fdf4',
                    borderRadius: '0.5rem',
                    border: '1px solid #86efac'
                  }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span>
                    <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0 }}>
                      {lang === 'es'
                        ? 'Tus archivos se borran automáticamente de nuestros servidores después del análisis'
                        : 'Your files are automatically deleted from our servers after analysis'}
                    </p>
                  </div>
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
                          ? `Tu archivo será comprimido automáticamente de ${(file.size / 1024 / 1024).toFixed(1)}MB a ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB antes del análisis. Esto toma ~10-15 segundos.`
                          : `Your file will be automatically compressed from ${(file.size / 1024 / 1024).toFixed(1)}MB to ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB before analysis. Takes ~10-15 seconds.`}
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
                <div 
                  id="analyze-section"
                  style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}
                >
                  <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '1rem' }}>
                    {lang === 'es' ? 'Opciones de Análisis' : 'Analysis Options'}
                  </h3>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      {lang === 'es' ? 'Modo de Reporte' : 'Report Mode'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      {['visual', 'short', 'write'].map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setReportView(m as 'visual' | 'short' | 'write')
                            if (m !== 'visual') {
                              setMode(m as 'short' | 'write')
                            }
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: reportView === m ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6',
                            color: reportView === m ? 'white' : '#111827',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.875rem'
                          }}
                        >
                          {m === 'visual' ? (lang === 'es' ? '⚡ Rápido' : '⚡ Quick') :
                           m === 'short' ? (lang === 'es' ? '📝 Resumen' : '📝 Summary') :
                           (lang === 'es' ? '📄 Completo' : '📄 Complete')}
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '1.5rem', width: '1.5rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                          {lang === 'es' ? 'Comprimiendo...' : 'Compressing...'}
                        </span>
                      </div>
                      <div style={{ width: '100%' }}>
                        <div style={{
                          width: '100%',
                          background: '#e5e7eb',
                          borderRadius: '9999px',
                          height: '1rem',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            height: '1rem',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease-out',
                            width: `${compressionProgress}%`,
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                          }} />
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          marginTop: '0.75rem',
                          fontSize: '0.875rem',
                          opacity: 0.9
                        }}>
                          <span style={{ fontWeight: '600' }}>{compressionProgress}%</span>
                          <span>
                            {lang === 'es' 
                              ? `${(file.size / 1024 / 1024).toFixed(1)}MB → ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB`
                              : `${(file.size / 1024 / 1024).toFixed(1)}MB → ~${Math.min(35, (file.size / 1024 / 1024) * 0.3).toFixed(1)}MB`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '1.5rem', width: '1.5rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                          {lang === 'es' ? 'Analizando...' : 'Analyzing...'}
                        </span>
                      </div>
                      <div style={{ width: '100%' }}>
                        <div style={{
                          width: '100%',
                          background: '#e5e7eb',
                          borderRadius: '9999px',
                          height: '1rem',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            height: '1rem',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease-out',
                            width: `${progress}%`,
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                          }} />
                        </div>
                        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                          {getProgressMessage(progress)}
                        </p>
                        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {lang === 'es' ? 'Puede tardar hasta 60 segundos' : 'May take up to 60 seconds'}
                        </p>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          marginTop: '0.75rem',
                          fontSize: '0.875rem',
                          opacity: 0.9
                        }}>
                          <span style={{ fontWeight: '600' }}>{progress}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {needsCompression ? (
                        <>
                          <Play size={18} style={{ marginRight: '0.5rem' }} />
                          {lang === 'es' ? 'Comprimir y Analizar' : 'Compress & Analyze'}
                        </>
                      ) : (
                        <>
                          <Play size={18} style={{ marginRight: '0.5rem' }} />
                          {lang === 'es' ? 'Analizar Mezcla' : 'Analyze Mix'}
                        </>
                      )}
                    </div>
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
            <div id="analysis-results" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                padding: '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: typeof window !== 'undefined' && window.innerWidth < 768 ? '1rem' : '1.5rem'
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
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '1rem',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ color: '#374151', fontWeight: '500', fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>
                        {lang === 'es' ? 'Puntuación' : 'Score'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 'clamp(2rem, 6vw, 3rem)',
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

                {/* Report View Toggle */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                  background: '#f3f4f6',
                  padding: '0.25rem',
                  borderRadius: '0.5rem'
                }}>
                  {(['visual', 'short', 'write'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setReportView(view)}
                      style={{
                        flex: '1 1 calc(33.333% - 0.5rem)',
                        minWidth: '90px',
                        padding: '0.625rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        background: reportView === view ? 'white' : 'transparent',
                        color: reportView === view ? '#667eea' : '#6b7280',
                        fontWeight: reportView === view ? '600' : '500',
                        fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: reportView === view ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {view === 'visual' ? (lang === 'es' ? '⚡ Rápido' : '⚡ Quick') :
                       view === 'short' ? (lang === 'es' ? '📝 Resumen' : '📝 Summary') :
                       (lang === 'es' ? '📄 Completo' : '📄 Complete')}
                    </button>
                  ))}
                </div>

                {/* Visual Mode */}
                {reportView === 'visual' && (
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.75rem',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ fontWeight: '600', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', marginBottom: '0.5rem' }}>
                      {lang === 'es' ? '⚡ Análisis Rápido' : '⚡ Quick Analysis'}
                    </h3>
                    
                    {/* File name subtitle */}
                    <p style={{
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                      color: '#6b7280',
                      marginBottom: '1.5rem',
                      fontStyle: 'italic'
                    }}>
                      {lang === 'es' ? '🎵 Sobre' : '🎵 About'} "{result.filename || 'archivo'}"
                    </p>
                    
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                      lineHeight: '1.6',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      overflowX: 'auto',
                      maxWidth: '100%',
                      margin: 0
                    }}>
                      {cleanReportText((result as any).report_visual || result.report_short || result.report)}
                    </pre>
                  </div>
                )}

                {/* Short Mode */}
                {reportView === 'short' && (
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.75rem',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ fontWeight: '600', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', marginBottom: '0.5rem' }}>
                      {lang === 'es' ? '📝 Análisis Resumen' : '📝 Summary Analysis'}
                    </h3>
                    
                    {/* File name subtitle */}
                    <p style={{
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                      color: '#6b7280',
                      marginBottom: '1.5rem',
                      fontStyle: 'italic'
                    }}>
                      {lang === 'es' ? '🎵 Sobre' : '🎵 About'} "{result.filename || 'archivo'}"
                    </p>
                    
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                      lineHeight: '1.6',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      overflowX: 'auto',
                      maxWidth: '100%',
                      margin: 0
                    }}>
                      {cleanReportText(result.report_short || result.report)}
                    </pre>
                  </div>
                )}

                {/* Write Mode */}
                {reportView === 'write' && (
                  <>
                    {/* NEW: Interpretative Sections FIRST */}
                    {result.interpretations && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ 
                          fontWeight: '700', 
                          fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', 
                          marginBottom: '0.5rem',
                          color: '#111827'
                        }}>
                          {lang === 'es' ? '📊 Análisis Técnico Detallado' : '📊 Detailed Technical Analysis'}
                        </h3>
                        
                        {/* File name subtitle */}
                        <p style={{
                          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                          color: '#6b7280',
                          marginBottom: '1.5rem',
                          fontStyle: 'italic'
                        }}>
                          {lang === 'es' ? '🎵 Sobre' : '🎵 About'} "{result.filename || 'archivo'}"
                        </p>

                        {/* Headroom & True Peak */}
                        {result.interpretations.headroom && (
                          <InterpretativeSection
                            title={lang === 'es' ? '🎚️ Headroom & True Peak' : '🎚️ Headroom & True Peak'}
                            interpretation={result.interpretations.headroom.interpretation}
                            recommendation={result.interpretations.headroom.recommendation}
                            metrics={result.interpretations.headroom.metrics}
                            lang={lang}
                          />
                        )}

                        {/* Dynamic Range */}
                        {result.interpretations.dynamic_range && (
                          <InterpretativeSection
                            title={lang === 'es' ? '📈 Rango Dinámico' : '📈 Dynamic Range'}
                            interpretation={result.interpretations.dynamic_range.interpretation}
                            recommendation={result.interpretations.dynamic_range.recommendation}
                            metrics={result.interpretations.dynamic_range.metrics}
                            lang={lang}
                          />
                        )}

                        {/* Overall Level */}
                        {result.interpretations.overall_level && (
                          <InterpretativeSection
                            title={lang === 'es' ? '🔊 Nivel General' : '🔊 Overall Level'}
                            interpretation={result.interpretations.overall_level.interpretation}
                            recommendation={result.interpretations.overall_level.recommendation}
                            metrics={result.interpretations.overall_level.metrics}
                            lang={lang}
                          />
                        )}

                        {/* Stereo Balance */}
                        {result.interpretations.stereo_balance && (
                          <InterpretativeSection
                            title={lang === 'es' ? '🎚️ Balance Estéreo' : '🎚️ Stereo Balance'}
                            interpretation={result.interpretations.stereo_balance.interpretation}
                            recommendation={result.interpretations.stereo_balance.recommendation}
                            metrics={result.interpretations.stereo_balance.metrics}
                            lang={lang}
                          />
                        )}
                      </div>
                    )}

                    {/* Original Report Text SECOND */}
                    <div style={{
                      background: '#f9fafb',
                      borderRadius: '0.75rem',
                      padding: 'clamp(1rem, 3vw, 1.5rem)',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{ fontWeight: '600', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', marginBottom: '1rem' }}>
                        {lang === 'es' ? '📄 Análisis Completo' : '📄 Complete Analysis'}
                      </h3>
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                        lineHeight: '1.6',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        overflowX: 'auto',
                        maxWidth: '100%',
                        margin: 0
                      }}>
                        {cleanReportText(result.report_write || result.report)}
                      </pre>
                    </div>
                  </>
                )}

                {/* Download Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Download Current View */}
                  <button
                    onClick={handleDownload}
                    style={{
                      flex: 1,
                      minWidth: '160px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.875rem 1.25rem',
                      background: 'white',
                      color: '#667eea',
                      border: '2px solid #667eea',
                      borderRadius: '0.75rem',
                      fontWeight: '600',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <Download size={18} />
                    {lang === 'es' 
                      ? `Descargar ${reportView === 'visual' ? 'Rápido' : reportView === 'short' ? 'Resumen' : 'Completo'}`
                      : `Download ${reportView === 'visual' ? 'Quick' : reportView === 'short' ? 'Summary' : 'Complete'}`}
                  </button>

                  {/* Download Full Report */}
                  <button
                    onClick={handleDownloadFull}
                    style={{
                      flex: 1,
                      minWidth: '160px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.875rem 1.25rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.75rem',
                      fontWeight: '600',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    <Download size={18} />
                    {lang === 'es' ? 'Análisis Detallado' : 'Detailed Analysis'}
                  </button>
                </div>
              </div>

              {/* CTA for Mastering Service - Dynamic from backend */}
              {result.cta_message && result.cta_button && (
                <div style={{
                  background: 'linear-gradient(to bottom right, #818cf8 0%, #6366f1 100%)',
                  borderRadius: '1.5rem',
                  padding: '2.5rem 2rem',
                  color: 'white',
                  boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Icon circle - dynamic based on score */}
                    <div style={{
                      width: '4rem',
                      height: '4rem',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '2rem' }}>
                        {result.score >= 85 ? '🎧' : 
                         result.score >= 60 ? '🔧' : 
                         result.score >= 40 ? '🔍' : 
                         result.score >= 20 ? '🔧' : '💬'}
                      </span>
                    </div>
                    
                    {/* Message */}
                    <div style={{ flex: 1 }}>
                      {/* Title - clean, no extra icons */}
                      <h3 style={{
                        fontSize: '1.375rem',
                        lineHeight: '1.3',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        marginTop: '0.25rem'
                      }}>
                        {(() => {
                          let title = result.cta_message.split('\n')[0];
                          // Remove ALL emojis, symbols, and special characters from the start
                          // This regex removes: emojis, symbols, punctuation, whitespace at the start
                          title = title.replace(/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+/gu, '');
                          return title;
                        })()}
                      </h3>
                      
                      {/* Description - full on desktop, shortened on mobile */}
                      <p style={{
                        fontSize: window.innerWidth >= 768 ? '1.0625rem' : '1rem',
                        lineHeight: '1.5',
                        opacity: '0.95',
                        margin: 0
                      }}>
                        {(() => {
                          const fullText = result.cta_message.split('\n').slice(1).join(' ');
                          // On mobile, shorten to first sentence or ~80 chars
                          if (window.innerWidth < 768) {
                            const firstSentence = fullText.split('.')[0];
                            return firstSentence.length > 80 
                              ? firstSentence.substring(0, 77) + '...'
                              : firstSentence + '.';
                          }
                          return fullText;
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  {/* CTA Button */}
                  <div style={{ paddingLeft: window.innerWidth >= 768 ? '5rem' : '0' }}>
                    <button
                      onClick={() => setShowContactModal(true)}
                      style={{
                        background: 'white',
                        color: '#6366f1',
                        padding: '1rem 2rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '1.125rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s',
                        width: window.innerWidth < 768 ? '100%' : 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {result.cta_button}
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback Button - SECOND */}
              {!feedbackSubmitted && (
                <div style={{
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    {lang === 'es'
                      ? 'Estamos en beta. ¿Cómo te fue con el análisis?'
                      : 'We\'re in beta. How was your analysis experience?'}
                  </p>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    style={{
                      background: 'white',
                      color: '#667eea',
                      padding: '0.75rem 2rem',
                      borderRadius: '9999px',
                      fontWeight: '600',
                      border: '2px solid #667eea',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.95rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    💬 {lang === 'es' ? 'Dejarnos Feedback' : 'Give Feedback'}
                  </button>
                </div>
              )}

              {/* Thank you message after feedback */}
              {feedbackSubmitted && (
                <div style={{
                  background: '#f0fdf4',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  border: '1px solid #86efac',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🙏</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#166534', marginBottom: '0.5rem' }}>
                    {lang === 'es' ? '¡Gracias por tu feedback!' : 'Thank you for your feedback!'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#15803d' }}>
                    {lang === 'es'
                      ? 'Tu opinión nos ayuda a mejorar Mastering Ready para todos.'
                      : 'Your input helps us improve Mastering Ready for everyone.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section" style={{
        background: 'linear-gradient(to bottom, #1e1b4b 0%, #312e81 100%)',
        color: 'white',
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="footer-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            textAlign: 'left'
          }}>
            {/* Brand */}
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Music size={24} style={{ color: '#ffffff', flexShrink: 0 }} /> Mastering Ready
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                {lang === 'es'
                  ? 'Prepara tu mezcla para el mastering. Análisis técnico claro y rápido.'
                  : 'Prepare your mix for mastering. Clear and fast technical analysis.'}
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="footer-heading" style={{ 
                fontWeight: '600', 
                color: '#ffffff' 
              }}>
                {lang === 'es' ? 'Contacto' : 'Contact'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a 
                  href="mailto:mat@matcarvy.com"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📧</span>
                  <span>mat@matcarvy.com</span>
                </a>
                <a 
                  href="https://wa.me/573155576115"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📱</span>
                  <span>WhatsApp</span>
                </a>
                <a 
                  href="https://instagram.com/matcarvy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <span>📷</span>
                  <span>@matcarvy</span>
                </a>
              </div>
            </div>

            {/* Resources */}
            <div>
              <h4 className="footer-heading" style={{ 
                fontWeight: '600', 
                color: '#ffffff' 
              }}>
                {lang === 'es' ? 'Acerca de' : 'About'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                  {lang === 'es'
                    ? 'Análisis profesional de mezclas basado en la metodología Mastering Ready.'
                    : 'Professional mix analysis based on the Mastering Ready methodology.'}
                </p>
                <a 
                  href="https://www.masteringready.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  masteringready.com
                </a>
              </div>
            </div>
          </div>
          
          <div className="footer-copyright" style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
            textAlign: 'center' 
          }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem' }}>
              © 2026 Mastering Ready by Matías Carvajal.
            </p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              {lang === 'es' 
                ? 'Basado en la metodología "Mastering Ready"'
                : 'Based on the "Mastering Ready" methodology'}
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div 
          onClick={() => setShowContactModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowContactModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎧</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? '¡Trabajemos juntos!' : 'Let\'s work together!'}
              </h3>
              <p style={{ color: '#6b7280' }}>
                {lang === 'es' 
                  ? 'Elige cómo prefieres contactarme:'
                  : 'Choose how you prefer to contact me:'}
              </p>
            </div>

            {/* Contact options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* WhatsApp */}
              <a
                href={`https://wa.me/573155576115?text=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola! Acabo de analizar mi mezcla en Mastering Ready y me gustaría hablar sobre el mastering.\n\nPuntuación obtenida: ${result?.score || 'N/A'}/100`
                    : `Hi! I just analyzed my mix on Mastering Ready and would like to talk about mastering.\n\nScore obtained: ${result?.score || 'N/A'}/100`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: '#166534',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dcfce7'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f0fdf4'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📱</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>WhatsApp</div>
                  <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
                    {lang === 'es' ? 'Mensaje directo instantáneo' : 'Instant direct message'}
                  </div>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:mat@matcarvy.com?subject=${encodeURIComponent(
                  lang === 'es' 
                    ? 'Solicitud de Mastering - Mastering Ready'
                    : 'Mastering Request - Mastering Ready'
                )}&body=${encodeURIComponent(
                  lang === 'es'
                    ? `Hola Matías,\n\nAcabo de analizar mi mezcla en Mastering Ready y me gustaría hablar sobre el proceso de mastering.\n\nPuntuación obtenida: ${result?.score || 'N/A'}/100\nArchivo: ${result?.filename || 'N/A'}\n\nGracias!`
                    : `Hi Matías,\n\nI just analyzed my mix on Mastering Ready and would like to discuss the mastering process.\n\nScore obtained: ${result?.score || 'N/A'}/100\nFile: ${result?.filename || 'N/A'}\n\nThanks!`
                )}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: '#1e40af',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dbeafe'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#eff6ff'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>mat@matcarvy.com</div>
                </div>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/matcarvy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: '#fdf2f8',
                  border: '1px solid #f9a8d4',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: '#9f1239',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fce7f3'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fdf2f8'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📷</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Instagram</div>
                  <div style={{ fontSize: '0.875rem', color: '#be123c' }}>@matcarvy</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div 
          onClick={() => {
            setShowFeedbackModal(false)
            setFeedback({ rating: 0, liked: '', change: '', add: '' })
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowFeedbackModal(false)
                setFeedback({ rating: 0, liked: '', change: '', add: '' })
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💬</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {lang === 'es' ? '¿Cómo te fue?' : 'How was it?'}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {lang === 'es' 
                  ? 'Tu feedback nos ayuda a mejorar Mastering Ready'
                  : 'Your feedback helps us improve Mastering Ready'}
              </p>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Rating 1-10 */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', display: 'block', textAlign: 'center' }}>
                  {lang === 'es' ? '¿Qué tan útil fue el análisis?' : 'How useful was the analysis?'}
                </label>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(2rem, 1fr))',
                  gap: 'clamp(0.25rem, 1vw, 0.5rem)', 
                  justifyContent: 'center',
                  marginBottom: '0.5rem',
                  maxWidth: '100%'
                }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setFeedback({...feedback, rating: num})}
                      style={{
                        width: '100%',
                        minWidth: '2rem',
                        height: 'clamp(2rem, 8vw, 2.5rem)',
                        borderRadius: '0.5rem',
                        border: feedback.rating === num ? '2px solid #667eea' : '1px solid #d1d5db',
                        background: feedback.rating === num ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                        color: feedback.rating === num ? 'white' : '#374151',
                        fontWeight: '600',
                        fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (feedback.rating !== num) {
                          e.currentTarget.style.borderColor = '#667eea'
                          e.currentTarget.style.transform = 'scale(1.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (feedback.rating !== num) {
                          e.currentTarget.style.borderColor = '#d1d5db'
                          e.currentTarget.style.transform = 'scale(1)'
                        }
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  paddingLeft: '0.5rem',
                  paddingRight: '0.5rem'
                }}>
                  <span>😞 {lang === 'es' ? 'No útil' : 'Not useful'}</span>
                  <span>{lang === 'es' ? 'Muy útil' : 'Very useful'} 😍</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  {lang === 'es' ? '¿Qué te gustó?' : 'What did you like?'}
                  <span style={{ color: '#ef4444' }}> *</span>
                </label>
                <textarea
                  value={feedback.liked}
                  onChange={(e) => setFeedback({...feedback, liked: e.target.value})}
                  placeholder={lang === 'es' ? 'Ej: La velocidad del análisis...' : 'E.g: The analysis speed...'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  {lang === 'es' ? '¿Qué cambiarías?' : 'What would you change?'}
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}> ({lang === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <textarea
                  value={feedback.change}
                  onChange={(e) => setFeedback({...feedback, change: e.target.value})}
                  placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                  {lang === 'es' ? '¿Qué agregarías?' : 'What would you add?'}
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}> ({lang === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <textarea
                  value={feedback.add}
                  onChange={(e) => setFeedback({...feedback, add: e.target.value})}
                  placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                onClick={() => {
                  const feedbackText = `FEEDBACK BETA - Mastering Ready\n\n⭐ Utilidad: ${feedback.rating}/10\n\n✅ Qué gustó:\n${feedback.liked}\n\n🔄 Qué cambiaría:\n${feedback.change || 'N/A'}\n\n➕ Qué agregaría:\n${feedback.add || 'N/A'}\n\nScore obtenido: ${result?.score || 'N/A'}/100`
                  window.open(`https://wa.me/573155576115?text=${encodeURIComponent(feedbackText)}`, '_blank')
                  setFeedbackSubmitted(true)
                  setShowFeedbackModal(false)
                }}
                disabled={!feedback.liked || feedback.rating === 0}
                style={{
                  background: (feedback.liked && feedback.rating > 0) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#d1d5db',
                  color: 'white',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (feedback.liked && feedback.rating > 0) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  fontSize: '1rem',
                  marginTop: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (feedback.liked && feedback.rating > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {lang === 'es' ? 'Enviar Feedback' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ============================================
           DESKTOP STYLES (default)
           ============================================ */
        
        /* Hero Section */
        .hero-section {
          padding-top: 6rem;
          padding-bottom: 5.5rem;
        }
        
        .methodology-badge {
          margin-bottom: 1rem; /* Bajado más para alinear con box */
        }
        
        .demo-card-container {
          margin-top: -0.5rem; /* Ajustado para mejor alineación */
          padding-bottom: 1.5rem; /* Estirado para terminar con checkmarks */
        }

        /* Features Section */
        .features-section {
          padding: 1.75rem 1.5rem;
        }
        
        .features-title-container {
          margin-bottom: 2.5rem;
        }

        /* Analyzer Section */
        .analyzer-section {
          padding: 1.25rem 1.5rem;
        }
        
        .analyzer-title-container {
          margin-bottom: 2.5rem;
        }

        /* Footer - alineación perfecta */
        .footer-section {
          padding: 2.5rem 1.5rem 1.75rem;
        }
        
        .footer-grid {
          gap: 2.5rem;
          margin-bottom: 1.5rem;
        }
        
        /* Alinear TODOS los títulos a la misma altura */
        .footer-heading {
          margin-bottom: 0.75rem;
          margin-top: 0.25rem;
        }
        
        /* Mastering Ready baja para alinearse */
        .footer-grid > div:first-child > div:first-child {
          margin-bottom: 0.75rem;
          margin-top: 0.25rem;
        }
        
        /* Igualar espacios entre título y contenido */
        .footer-grid > div > div:first-child {
          margin-bottom: 0.75rem;
        }
        
        .footer-copyright {
          padding-top: 0.875rem;
        }

        /* ============================================
           MOBILE STYLES (max-width: 767px)
           ============================================ */
        @media (max-width: 767px) {
          /* Hero Section */
          .hero-section {
            padding-top: 4.5rem;
            padding-bottom: 4rem;
          }
          
          .methodology-badge {
            margin-bottom: 0.5rem; /* Bajado un poco más para balance perfecto */
          }
          
          .demo-card-container {
            margin-top: -1rem;
          }
          
          /* Features Section */
          .features-section {
            padding: 1.125rem 1.5rem 2rem 1.5rem;
          }
          
          .features-title-container {
            margin-bottom: 1.5rem;
          }
          
          /* Analyzer Section */
          .analyzer-section {
            padding: 1.125rem 1.5rem;
          }
          
          .analyzer-title-container {
            margin-bottom: 2.25rem;
          }
          
          /* Footer - espaciado mejorado */
          .footer-section {
            padding: 1.75rem 1.5rem 1.5rem;
          }
          
          .footer-grid {
            gap: 1.25rem;
            margin-bottom: 0.75rem;
          }
          
          /* Separación entre secciones del footer */
          .footer-grid > div:nth-child(2) {
            margin-bottom: 1rem; /* Espacio entre Contacto y Acerca de */
          }
          
          .footer-heading {
            margin-bottom: 0.625rem;
            margin-top: 0;
          }
          
          .footer-grid > div:first-child > div:first-child {
            margin-bottom: 0.625rem;
            margin-top: 0;
          }
          
          .footer-copyright {
            padding-top: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Home

