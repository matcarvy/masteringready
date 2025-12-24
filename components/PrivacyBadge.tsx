'use client'

import { ShieldCheck } from 'lucide-react'

export default function PrivacyBadge() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-green-900">
          🔒 Privacy-First Analyzer
        </span>
      </div>
      <p className="text-sm text-green-800">
        Tu audio se analiza <strong>solo en memoria</strong> y se{' '}
        <strong>elimina inmediatamente</strong>. No guardamos archivos 
        sin tu consentimiento explícito.
      </p>
    </div>
  )
}
