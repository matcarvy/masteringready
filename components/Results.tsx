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

  // 🔍 DEBUG: Log CTA data
  console.log('🔍 CTA Check:', {
    cta_message: data.cta_message,
    cta_button: data.cta_button,
    cta_action: data.cta_action,
    hasCTA: !!(data.cta_message && data.cta_button),
    fullData: data
  })

  const handleDownload = (mode: 'visual' | 'short' | 'write' | 'complete') => {
    let content = ''
    let filename = ''
    
    if (mode === 'complete') {
      content = generateCompleteReport(data, currentLang)
      filename = `masteringready-complete-${data.filename || 'analisis'}-${Date.now()}.txt`
    } else {
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

  // Get main metrics for visual mode from metrics array
  const getMainMetrics = () => {
    if (!data.metrics || !Array.isArray(data.metrics)) return []
    
    const metricsMap: any = {}
    data.metrics.forEach((m: any) => {
      if (m && m.internal_key) {
        metricsMap[m.internal_key] = m.value
      }
    })
    
    return [
      { label: 'Headroom', value: metricsMap['Headroom'] || 'N/A' },
      { label: 'True Peak', value: metricsMap['True Peak'] || 'N/A' },
      { label: 'LUFS', value: metricsMap['LUFS (Integrated)'] || 'N/A' },
      { label: 'PLR', value: metricsMap['PLR'] || 'N/A' },
      { label: currentLang === 'es' ? 'Campo Estéreo' : 'Stereo Width', value: metricsMap['Stereo Width'] || 'N/A' },
      { label: currentLang === 'es' ? 'Balance Frecuencial' : 'Frequency Balance', value: metricsMap['Frequency Balance'] || 'N/A' }
    ]
  }

  const tabLabels = {
    visual: currentLang === 'es' ? '⚡ Rápido' : '⚡ Quick',
    short: currentLang === 'es' ? '📝 Resumen' : '📝 Summary',
    write: currentLang === 'es' ? '📄 Completo' : '📄 Complete'
  }

  return (
    <div className="mt-8 space-y-6" id="analysis-results">
      <div className="bg-white rounded-xl border shadow-xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold">
            {currentLang === 'es' ? 'Resultados del Análisis' : 'Analysis Results'}
          </h2>
          <button
            onClick={onReset}
            className="text-sm text-purple-600 hover:underline font-medium"
          >
            {currentLang === 'es' ? 'Analizar otro archivo' : 'Analyze another file'}
          </button>
        </div>

        {/* Score Card */}
        <div className={`rounded-xl border-2 p-6 mb-6 ${getScoreBg(data.score)}`}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium text-gray-700">
              {currentLang === 'es' ? 'Puntuación' : 'Score'}
            </span>
            <span className={`text-5xl font-bold ${getScoreColor(data.score)}`}>
              {data.score}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${data.score}%` }}
            ></div>
          </div>
          <p className="text-lg font-semibold flex items-center gap-2">
            {data.verdict}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-2">
            {(['visual', 'short', 'write'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition rounded-t-lg text-sm sm:text-base
                  ${activeTab === tab
                    ? 'bg-purple-50 border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Mode */}
        {activeTab === 'visual' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getMainMetrics().map((metric, i) => (
                <div
                  key={i}
                  className="p-4 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-purple-100 shadow-sm"
                >
                  <div className="text-sm font-medium text-gray-600 mb-2">{metric.label}</div>
                  <div className="text-xl font-bold text-purple-700 break-words">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Short/Write Mode */}
        {(activeTab === 'short' || activeTab === 'write') && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {activeTab === 'short' ? data.report_short : data.report_write}
            </pre>
          </div>
        )}

        {/* Download Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => handleDownload(activeTab)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 
                     rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
          >
            <Download className="w-5 h-5" />
            {currentLang === 'es' ? `Descargar ${tabLabels[activeTab].replace(/[⚡📝📄] /, '')}` : `Download ${tabLabels[activeTab].replace(/[⚡📝📄] /, '')}`}
          </button>
          
          <button
            onClick={() => handleDownload('complete')}
            className="flex items-center justify-center gap-2 bg-white text-purple-600 border-2 border-purple-600 
                     px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 hover:shadow-lg transition-all"
          >
            <FileText className="w-5 h-5" />
            {currentLang === 'es' ? 'Análisis Detallado' : 'Detailed Analysis'}
          </button>
        </div>

        {/* Privacy Note */}
        {data.privacy_note && (
          <p className="text-xs text-gray-500 mt-4">
            {data.privacy_note}
          </p>
        )}
      </div>

      {/* CTA - Beautiful gradient card */}
      {data.cta_message && data.cta_button && (
        <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white rounded-xl p-6 shadow-2xl border border-purple-400">
          <div className="flex items-start gap-4 mb-4">
            <div className="text-4xl">
              {data.cta_action === 'mastering' ? '🎧' : '🔧'}
            </div>
            <div className="flex-1">
              <div className="text-lg leading-relaxed whitespace-pre-line">
                {data.cta_message}
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              const message = encodeURIComponent(
                `Hola! Me gustaría solicitar: ${data.cta_button}\n\nArchivo: ${data.filename || 'Mi canción'}\nPuntuación: ${data.score}/100`
              )
              window.open(`https://wa.me/573155576115?text=${message}`, '_blank')
            }}
            className="w-full sm:w-auto bg-white text-purple-600 px-8 py-4 rounded-xl 
                       font-bold hover:bg-gray-100 hover:shadow-xl transition-all text-lg"
          >
            {data.cta_button}
          </button>
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
