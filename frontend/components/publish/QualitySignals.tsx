'use client'

import React from 'react'

interface QualitySignalsProps {
  signals: {
    hasValidOneLiner: boolean
    hasConcreteUseCase: boolean
    hasDemoOrScreenshot: boolean
    hasMinimalEvidence: boolean
    hasDealModality: boolean
  }
}

export const QualitySignalsIndicator: React.FC<QualitySignalsProps> = ({ signals }) => {
  const signalList = [
    { key: 'hasValidOneLiner', label: 'One-liner completo' },
    { key: 'hasConcreteUseCase', label: 'Caso de uso concreto' },
    { key: 'hasDemoOrScreenshot', label: 'Demo o captura disponible' },
    { key: 'hasMinimalEvidence', label: 'Evidencia mínima' },
    { key: 'hasDealModality', label: 'Modalidad de deal seleccionada' },
  ]

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/65 p-4">
      <h3 className="mb-3 font-semibold text-brand-800">Señales de calidad</h3>
      <ul className="space-y-2">
        {signalList.map(signal => {
          const isValid = signals[signal.key as keyof typeof signals]
          return (
            <li key={signal.key} className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full shrink-0 border transition-all ${
                  isValid ? 'bg-green-600 border-gray-400' : 'bg-brand-50 border-gray-300'
                }`}
              />
              <span className={`${isValid ? 'text-gray-800 font-medium' : 'text-muted-foreground'}`}>
                {signal.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
