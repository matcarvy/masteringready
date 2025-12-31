'use client'

import { Download, FileText, Headphones } from 'lucide-react'
import { useState } from 'react'

interface ResultsProps {
  data: any
  onReset: () => void
  lang?: 'es' | 'en'
}

export default function Results({ data, onReset, lang: parentLang }: ResultsProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'short' | 'write'>('visual')
  const currentLang = parentLang || data.lang || 'es'

  const handleDownload = (mode: 'visual' | 'short' | 'write' | 'complete') => {
    let content = ''
    let filename = ''
    
    if (mode === 'complete') {
      content = generateCompleteReport(data, currentLang)
      filename = `masteringready-complete-${data.filename || 'analisis'}-${Date.now()}.txt`
    } else {
      if (mode === 'visual') content = data.report_visual || data.reports?.visual || data.report || ''
      if (mode === 'short') content = data.report_short || data.reports?.short || data.report || ''
      if (mode === 'write') content = data.report_write || data.reports?.write || data.report || ''
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

  const getMainMetrics = () => {
    if (!data.metrics) return []
    
    // Handle metrics as array (new format from FINAL_FIXED)
    if (Array.isArray(data.metrics)) {
      const metricsMap: any = {}
      data.metrics.forEach((m: any) => {
        if (m && m.internal_key) {
          metricsMap[m.internal_key] = m.value
        }
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
          label: currentLang === 'es' ? 'Balance Estéreo' : 'Stereo Balance', 
          value: metricsMap['Stereo Width'] || 'N/A',
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
          label: currentLang === 'es' ? 'Balance Frecuencial' : 'Frequency Balance', 
          value: metricsMap['Frequency Balance'] || 'N/A',
          unit: ''
        }
      ]
    }
    
    // Handle metrics as object (old format from Results(12))
    return [
      { 
        label: 'Headroom', 
        value: data.metrics.headroom || 'N/A',
        unit: 'dBFS'
      },
      { 
        label: 'True Peak', 
        value: data.metrics.true_peak || 'N/A',
        unit: 'dBTP'
      },
      { 
        label: currentLang === 'es' ? 'Balance Estéreo' : 'Stereo Balance', 
        value: data.metrics.correlation || 'N/A',
        unit: ''
      },
      { 
        label: 'LUFS', 
        value: data.metrics.lufs || 'N/A',
        unit: 'LUFS'
      },
      { 
        label: 'PLR', 
        value: data.metrics.plr || 'N/A',
        unit: 'dB'
      },
      { 
        label: currentLang === 'es' ? 'Correlación' : 'Correlation', 
        value: data.metrics.stereo_width || 'N/A',
        unit: '%'
      }
    ]
  }

  const tabLabels = {
    visual: currentLang === 'es' ? 'Rápido' : 'Quick',
    short: currentLang === 'es' ? 'Resumen' : 'Summary',
    write: currentLang === 'es' ? 'Completo' : 'Complete'
  }

  return (
    <div className="mt-8 space-y-6" id="analysis-results">
      <div className="bg-white rounded-lg border shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">
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
        <div className={`rounded-lg border p-4 sm:p-6 mb-6 ${getScoreBg(data.score)}`}>
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            <div className="text-left">
              <span className="text-gray-700 font-medium text-base sm:text-lg">
                {currentLang === 'es' ? 'Puntuación' : 'Score'}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-4xl sm:text-5xl font-bold ${getScoreColor(data.score)}`}>
                {data.score}/100
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div 
              className="bg-gradient-purple h-3 rounded-full transition-all duration-500" 
              style={{ width: `${data.score}%` }}
            ></div>
          </div>
          <p className="text-base sm:text-lg font-semibold">{data.verdict}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex flex-wrap gap-2 sm:gap-0">
            {(['visual', 'short', 'write'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 sm:px-6 py-3 font-medium transition text-sm sm:text-base flex-1 sm:flex-initial
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

        {/* Visual Mode - Main Metrics */}
        {activeTab === 'visual' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getMainMetrics().map((metric, i) => (
                <div
                  key={i}
                  className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-700">
                    {metric.value}{metric.unit && ` ${metric.unit}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Short/Write Mode - Report Text */}
        {(activeTab === 'short' || activeTab === 'write') && (
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <pre className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed font-sans overflow-x-auto">
              {activeTab === 'short' 
                ? (data.report_short || data.reports?.short || data.report)
                : (data.report_write || data.reports?.write || data.report)
              }
            </pre>
          </div>
        )}

        {/* Download Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => handleDownload(activeTab)}
            className="flex items-center justify-center gap-2 bg-gradient-purple text-white px-4 sm:px-6 py-3 
                     rounded-lg font-medium hover:opacity-90 transition text-sm sm:text-base"
          >
            <Download className="w-4 h-4" />
            {currentLang === 'es' ? `Descargar ${tabLabels[activeTab]}` : `Download ${tabLabels[activeTab]}`}
          </button>
          
          <button
            onClick={() => handleDownload('complete')}
            className="flex items-center justify-center gap-2 bg-white text-purple-600 border-2 border-purple-600 
                     px-4 sm:px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition text-sm sm:text-base"
          >
            <FileText className="w-4 h-4" />
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

      {/* CTA for Mastering Service - COMBINED VERSION */}
      {((data.cta_message && data.cta_button) || (data.cta && data.cta.message)) && (
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold mb-3">
                {currentLang === 'es' ? '¿Te gustaría que mastericemos esta canción?' : 'Would you like us to master this song?'}
              </h3>
              <div className="text-base sm:text-lg leading-relaxed whitespace-pre-line opacity-95">
                {data.cta_message || data.cta?.message || 
                  (currentLang === 'es' 
                    ? 'Tu mezcla está en buen punto. Trabajemos juntos en el mastering.'
                    : 'Your mix is in good shape. Let\'s work together on mastering.')
                }
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              const buttonText = data.cta_button || data.cta?.button || 
                (currentLang === 'es' ? 'Solicitar Mastering' : 'Request Mastering')
              
              const message = encodeURIComponent(
                `Hola! Me gustaría solicitar: ${buttonText}\n\nArchivo: ${data.filename || 'Mi canción'}\nPuntuación: ${data.score}/100`
              )
              window.open(`https://wa.me/573155576115?text=${message}`, '_blank')
            }}
            className="w-full sm:w-auto bg-white text-purple-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl 
                       font-bold text-base sm:text-lg hover:bg-gray-100 transition-all duration-200 
                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {data.cta_button || data.cta?.button || 
              (currentLang === 'es' ? 'Solicitar Mastering' : 'Request Mastering')
            }
          </button>
        </div>
      )}
    </div>
  )
}

// Helper function to generate complete report
function generateCompleteReport(data: any, lang: string): string {
  let complete = ''
  complete += '═══════════════════════════════════════════════════\n'
  complete += '   MASTERINGREADY - ' + (lang === 'es' ? 'Reporte Completo' : 'Complete Report') + '\n'
  complete += '═══════════════════════════════════════════════════\n\n'
  
  complete += (lang === 'es' ? 'INFORMACIÓN DEL ARCHIVO' : 'FILE INFORMATION') + '\n'
  complete += '──────────────────────────────────────────────────\n'
  complete += `${lang === 'es' ? 'Archivo' : 'File'}: ${data.filename || 'Unknown'}\n`
  complete += `${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString(lang)}\n`
  complete += `${lang === 'es' ? 'Puntuación' : 'Score'}: ${data.score}/100\n`
  complete += `${lang === 'es' ? 'Veredicto' : 'Verdict'}: ${data.verdict}\n\n`
  
  const reportVisual = data.report_visual || data.reports?.visual
  const reportShort = data.report_short || data.reports?.short
  const reportWrite = data.report_write || data.reports?.write
  
  if (reportVisual) {
    complete += '\n' + (lang === 'es' ? 'ANÁLISIS RÁPIDO' : 'QUICK ANALYSIS') + '\n'
    complete += '═══════════════════════════════════════════════════\n'
    complete += reportVisual + '\n\n'
  }
  
  if (reportShort) {
    complete += '\n' + (lang === 'es' ? 'ANÁLISIS RESUMEN' : 'SUMMARY ANALYSIS') + '\n'
    complete += '═══════════════════════════════════════════════════\n'
    complete += reportShort + '\n\n'
  }
  
  if (reportWrite) {
    complete += '\n' + (lang === 'es' ? 'ANÁLISIS COMPLETO' : 'COMPLETE ANALYSIS') + '\n'
    complete += '═══════════════════════════════════════════════════\n'
    complete += reportWrite + '\n\n'
  }
  
  complete += '──────────────────────────────────────────────────\n'
  complete += (lang === 'es' ? 'Analizado con' : 'Analyzed with') + ' MasteringReady\n'
  complete += 'www.masteringready.com\n'
  complete += 'by Matías Carvajal\n'
  
  return complete
}
