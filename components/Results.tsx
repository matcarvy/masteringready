'use client'

import { Download, FileText } from 'lucide-react'
import { useState } from 'react'

interface ResultsProps {
  data: any
  onReset: () => void
  lang?: 'es' | 'en'
}

export default function Results({ data, onReset, lang: parentLang }: ResultsProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'short' | 'write'>('visual')
  const currentLang = parentLang || data.lang || 'es'

  // DEBUG: Log the entire data object to see CTA
  console.log('🔍 Results component received data:', data)
  console.log('🔍 CTA data:', data.cta)
  console.log('🔍 CTA message:', data.cta?.message)
  console.log('🔍 CTA button:', data.cta?.button)

  const handleDownload = (mode: 'visual' | 'short' | 'write' | 'complete') => {
    let content = ''
    let filename = ''
    
    if (mode === 'complete') {
      // Complete report with everything
      content = generateCompleteReport(data, currentLang)
      filename = `masteringready-complete-${data.filename || 'analisis'}-${Date.now()}.txt`
    } else {
      content = data.report_visual || data.report_short || data.report_write || data.report || ''
      if (mode === 'visual') content = data.report_visual || data.report || ''
      if (mode === 'short') content = data.report_short || data.report || ''
      if (mode === 'write') content = data.report_write || data.report || ''
      
      filename = `masteringready-${mode}-${data.filename || 'analisis'}-${Date.now()}.txt`
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

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

  // Get main metrics for visual mode
  const getMainMetrics = () => {
    if (!data.metrics) return []
    
    // Extract key metrics from the metrics array
    const metricsMap: any = {}
    data.metrics.forEach((m: any) => {
      metricsMap[m.internal_key] = m.value
    })
    
    return [
      { 
        label: 'Headroom', 
        value: metricsMap['Headroom'] || 'N/A',
        unit: ''
      },
      { 
        label: 'True Peak', 
        value: metricsMap['True Peak'] || 'N/A',
        unit: ''
      },
      { 
        label: 'LUFS', 
        value: metricsMap['LUFS (Integrated)'] || 'N/A',
        unit: ''
      },
      { 
        label: 'PLR', 
        value: metricsMap['PLR'] || 'N/A',
        unit: ''
      },
      { 
        label: currentLang === 'es' ? 'Campo Estéreo' : 'Stereo Width', 
        value: metricsMap['Stereo Width'] || 'N/A',
        unit: ''
      },
      { 
        label: currentLang === 'es' ? 'Balance Frecuencial' : 'Frequency Balance', 
        value: metricsMap['Frequency Balance'] || 'N/A',
        unit: ''
      }
    ]
  }

  const tabLabels = {
    visual: currentLang === 'es' ? 'Rápido' : 'Quick',
    short: currentLang === 'es' ? 'Resumen' : 'Summary',
    write: currentLang === 'es' ? 'Completo' : 'Complete'
  }

  return (
    <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" id="analysis-results">
      <div className="bg-white rounded-lg border shadow-lg p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold">
            {currentLang === 'es' ? 'Resultados del Análisis' : 'Analysis Results'}
          </h2>
          <button
            onClick={onReset}
            className="text-sm text-purple-600 hover:underline font-medium"
          >
            {currentLang === 'es' ? 'Analizar otro archivo' : 'Analyze another file'}
          </button>
        </div>

        {/* Score Card - Mobile Optimized with tighter spacing */}
        <div className={`rounded-lg border p-3 sm:p-6 mb-4 sm:mb-6 ${getScoreBg(data.score)}`}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center mb-3 sm:mb-4">
            <div className="text-left">
              <span className="text-gray-700 font-medium text-sm sm:text-lg">
                {currentLang === 'es' ? 'Puntuación' : 'Score'}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-3xl sm:text-5xl font-bold ${getScoreColor(data.score)}`}>
                {data.score}/100
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2 sm:mb-3">
            <div 
              className="bg-gradient-purple h-2 sm:h-3 rounded-full transition-all duration-500" 
              style={{ width: `${data.score}%` }}
            ></div>
          </div>
          <p className="text-sm sm:text-lg font-semibold">{data.verdict}</p>
        </div>

        {/* Tabs - Mobile Responsive with better spacing */}
        <div className="border-b border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-1 sm:gap-0">
            {(['visual', 'short', 'write'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition text-xs sm:text-base flex-1 sm:flex-initial
                  ${activeTab === tab
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Mode - Main Metrics with better mobile spacing */}
        {activeTab === 'visual' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {getMainMetrics().map((metric, i) => (
                <div
                  key={i}
                  className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100"
                >
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{metric.label}</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-purple-700 break-words">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Short/Write Mode - Report Text with better mobile spacing */}
        {(activeTab === 'short' || activeTab === 'write') && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
            <pre className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed font-sans overflow-x-auto">
              {activeTab === 'short' ? data.report_short : data.report_write}
            </pre>
          </div>
        )}

        {/* Download Buttons - Mobile Optimized with tighter spacing */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            onClick={() => handleDownload(activeTab)}
            className="flex items-center justify-center gap-2 bg-gradient-purple text-white px-4 sm:px-6 py-2.5 sm:py-3 
                     rounded-lg font-medium hover:opacity-90 transition text-sm sm:text-base"
          >
            <Download className="w-4 h-4" />
            {currentLang === 'es' ? `Descargar ${tabLabels[activeTab]}` : `Download ${tabLabels[activeTab]}`}
          </button>
          
          <button
            onClick={() => handleDownload('complete')}
            className="flex items-center justify-center gap-2 bg-white text-purple-600 border-2 border-purple-600 
                     px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-purple-50 transition text-sm sm:text-base"
          >
            <FileText className="w-4 h-4" />
            {currentLang === 'es' ? 'Análisis Detallado' : 'Detailed Analysis'}
          </button>
        </div>

        {/* Privacy Note */}
        {data.privacy_note && (
          <p className="text-xs text-gray-500 mt-3 sm:mt-4">
            {data.privacy_note}
          </p>
        )}
      </div>

      {/* CTA for Mastering Service - Dynamic from backend with better mobile spacing */}
      {data.cta && data.cta.message && data.cta.button && (
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-lg p-4 sm:p-6 shadow-xl">
          <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl flex-shrink-0">
              {data.cta.action === 'mastering' ? '🎧' : '🔧'}
            </span>
            <div className="flex-1">
              <div className="whitespace-pre-line text-sm sm:text-lg leading-relaxed">
                {data.cta.message}
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              // TODO: Integrate with your contact/booking system
              // For now, opens WhatsApp with pre-filled message
              const message = encodeURIComponent(
                `Hola! Me gustaría solicitar: ${data.cta.button}\n\nArchivo: ${data.filename || 'Mi canción'}\nPuntuación: ${data.score}/100`
              )
              window.open(`https://wa.me/573155576115?text=${message}`, '_blank')
            }}
            className="w-full sm:w-auto bg-white text-purple-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg 
                       font-semibold hover:bg-gray-100 transition text-sm sm:text-base shadow-md"
          >
            {data.cta.button}
          </button>
        </div>
      )}

      {/* DEBUG: Show if CTA data exists but conditions aren't met */}
      {data.cta && (!data.cta.message || !data.cta.button) && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-xs">
          🔍 Debug: CTA exists but message or button is missing<br/>
          Message: {data.cta.message ? '✓' : '✗'}<br/>
          Button: {data.cta.button ? '✓' : '✗'}<br/>
          Action: {data.cta.action || 'none'}
        </div>
      )}

      {/* DEBUG: Show if no CTA at all */}
      {!data.cta && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-xs">
          🔍 Debug: No CTA object found in data. Check console logs for full data structure.
        </div>
      )}
    </div>
  )
}

// Helper function to generate complete report
function generateCompleteReport(data: any, lang: string): string {
  let complete = ''
  complete += '╔═══════════════════════════════════════════════════════╗\n'
  complete += '   MASTERINGREADY - ' + (lang === 'es' ? 'Reporte Completo' : 'Complete Report') + '\n'
  complete += '╚═══════════════════════════════════════════════════════╝\n\n'
  
  complete += (lang === 'es' ? 'INFORMACIÓN DEL ARCHIVO' : 'FILE INFORMATION') + '\n'
  complete += '─────────────────────────────────────────────────────────\n'
  complete += `${lang === 'es' ? 'Archivo' : 'File'}: ${data.filename || 'Unknown'}\n`
  complete += `${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString(lang)}\n`
  complete += `${lang === 'es' ? 'Puntuación' : 'Score'}: ${data.score}/100\n`
  complete += `${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${data.verdict}\n\n`
  
  // Add all three modes
  if (data.report_visual) {
    complete += '\n' + (lang === 'es' ? 'ANÁLISIS RÁPIDO' : 'QUICK ANALYSIS') + '\n'
    complete += '╔═══════════════════════════════════════════════════════╗\n'
    complete += data.report_visual + '\n\n'
  }
  
  if (data.report_short) {
    complete += '\n' + (lang === 'es' ? 'ANÁLISIS RESUMEN' : 'SUMMARY ANALYSIS') + '\n'
    complete += '╔═══════════════════════════════════════════════════════╗\n'
    complete += data.report_short + '\n\n'
  }
  
  if (data.report_write) {
    complete += '\n' + (lang === 'es' ? 'ANÁLISIS COMPLETO' : 'COMPLETE ANALYSIS') + '\n'
    complete += '╔═══════════════════════════════════════════════════════╗\n'
    complete += data.report_write + '\n\n'
  }
  
  complete += '─────────────────────────────────────────────────────────\n'
  complete += (lang === 'es' ? 'Analizado con' : 'Analyzed with') + ' MasteringReady\n'
  complete += 'www.masteringready.com\n'
  complete += 'by Matías Carvajal\n'
  
  return complete
}
