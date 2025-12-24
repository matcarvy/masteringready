'use client'

interface AnalysisOptionsProps {
  lang: 'es' | 'en'
  mode: 'short' | 'write'
  strict: boolean
  onLangChange: (lang: 'es' | 'en') => void
  onModeChange: (mode: 'short' | 'write') => void
  onStrictChange: (strict: boolean) => void
}

export default function AnalysisOptions({
  lang,
  mode,
  strict,
  onLangChange,
  onModeChange,
  onStrictChange
}: AnalysisOptionsProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
      <h3 className="font-semibold text-lg mb-4">Opciones de Análisis</h3>
      
      {/* Language */}
      <div>
        <label className="block text-sm font-medium mb-2">Idioma</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onLangChange('es')}
            className={`px-4 py-2 rounded-lg transition ${
              lang === 'es'
                ? 'bg-gradient-purple text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            🇪🇸 Español
          </button>
          <button
            onClick={() => onLangChange('en')}
            className={`px-4 py-2 rounded-lg transition ${
              lang === 'en'
                ? 'bg-gradient-purple text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            🇺🇸 English
          </button>
        </div>
      </div>

      {/* Mode */}
      <div>
        <label className="block text-sm font-medium mb-2">Modo de Reporte</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange('short')}
            className={`px-4 py-2 rounded-lg transition ${
              mode === 'short'
                ? 'bg-gradient-purple text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            📱 Short
          </button>
          <button
            onClick={() => onModeChange('write')}
            className={`px-4 py-2 rounded-lg transition ${
              mode === 'write'
                ? 'bg-gradient-purple text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            📄 Write
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {mode === 'short' 
            ? 'Resumen ejecutivo (WhatsApp, quick feedback)'
            : 'Reporte completo narrativo (emails, web)'}
        </p>
      </div>

      {/* Strict Mode */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={strict}
            onChange={(e) => onStrictChange(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm font-medium">Modo Strict</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Estándares comerciales más exigentes (entrega a sellos)
        </p>
      </div>
    </div>
  )
}

