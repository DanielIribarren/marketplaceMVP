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
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3 text-green">Señales de calidad</h3>
      <ul className="space-y-2">
        {signalList.map(signal => {
          const isValid = signals[signal.key as keyof typeof signals]
          return (
            <li key={signal.key} className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full shrink-0 ${
                  isValid ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className={`${isValid ? 'text-green-700' : 'text-gray-600'}`}>
                {signal.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}