'use client'

import { Download } from 'lucide-react'

interface ResultsProps {
  data: any
  onReset: () => void
}

export default function Results({ data, onReset }: ResultsProps) {
  const handleDownload = () => {
    const blob = new Blob([data.report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analisis-${data.filename || 'mezcla'}-${Date.now()}.txt`
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

  // FIX: Get score label based on language
  const getScoreLabel = () => {
    const lang = data.lang || 'es'
    return lang === 'es' ? 'Puntuación' : 'Score'
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white rounded-lg border shadow-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">
            {data.lang === 'es' ? 'Resultados del Análisis' : 'Analysis Results'}
          </h2>
          <button
            onClick={onReset}
            className="text-sm text-purple-600 hover:underline font-medium"
          >
            {data.lang === 'es' ? 'Analizar otro archivo' : 'Analyze another file'}
          </button>
        </div>

        {/* Score Card - FIXED: gap-4 for spacing + dynamic language */}
        <div className={`rounded-lg border p-6 mb-6 ${getScoreBg(data.score)}`}>
          <div className="flex items-center justify-between mb-4 gap-4">
            <span className="text-gray-700 font-medium">{getScoreLabel()}</span>
            <span className={`text-5xl font-bold ${getScoreColor(data.score)}`}>
              {data.score}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div 
              className="bg-gradient-purple h-3 rounded-full transition-all duration-500" 
              style={{ width: `${data.score}%` }}
            ></div>
          </div>
          <p className="text-lg font-semibold">{data.verdict}</p>
        </div>

        {/* Report */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">
            {data.lang === 'es' ? 'Reporte Detallado' : 'Detailed Report'}
          </h3>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
            {data.report}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-gradient-purple text-white px-6 py-3 
                     rounded-lg font-medium hover:opacity-90 transition"
          >
            <Download className="w-4 h-4" />
            {data.lang === 'es' ? 'Descargar Reporte' : 'Download Report'}
          </button>
        </div>

        {/* Privacy Note */}
        {data.privacy_note && (
          <p className="text-xs text-gray-500 mt-4">
            {data.privacy_note}
          </p>
        )}
        
        {/* Methodology Note */}
        {data.methodology && (
          <p className="text-xs text-gray-500 italic">
            {data.methodology}
          </p>
        )}
      </div>

      {/* CTA for Mastering Service */}
      {data.score >= 60 && (
        <div className="bg-gradient-purple text-white rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3">
            {data.lang === 'es' 
              ? '🎧 ¿Te gustaría que mastericemos esta canción?'
              : '🎧 Would you like us to master this song?'}
          </h3>
          <p className="mb-4">
            {data.lang === 'es'
              ? 'Tu mezcla está en buen punto. Si quieres que trabajemos juntos en el mastering, podemos ayudarte a llevarla al siguiente nivel.'
              : 'Your mix is in good shape. If you want us to work together on mastering, we can help you take it to the next level.'}
          </p>
          <button className="bg-white text-purple-600 px-6 py-3 rounded-lg 
                           font-semibold hover:bg-gray-100 transition">
            {data.lang === 'es' ? 'Solicitar Mastering' : 'Request Mastering'}
          </button>
        </div>
      )}
    </div>
  )
}
