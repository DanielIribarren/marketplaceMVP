'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BasicFields } from '@/components/publish/BasicFields'
import { AvailabilityCalendar } from '@/components/publish/AvailabilityCalendar'
import { saveDraft, publishMVP, calculateQualitySignals } from '@/app/actions/mvp'
import { createEmptyDraft } from '@/lib/types/mvp-publication'
import type { MVPPublication, QualitySignals } from '@/lib/types/mvp-publication'
import { Loader2, Send, CheckCircle2, Calendar } from 'lucide-react'
import { QualitySignalsIndicator } from '@/components/publish/QualitySignals'

type Step = 'basics' | 'availability' | 'review'

const STEPS = [
  { id: 'basics', label: 'Información Básica', icon: CheckCircle2 },
  { id: 'availability', label: 'Disponibilidad', icon: Calendar },
  { id: 'review', label: 'Revisar y Publicar', icon: Send }
]

export default function PublishPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('basics')
  const [mvpData, setMvpData] = useState<Partial<MVPPublication> & { id?: string }>(() => createEmptyDraft(''))
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [signals, setSignals] = useState<QualitySignals>({
    hasValidOneLiner: false,
    hasConcreteUseCase: false,
    hasDemoOrScreenshot: false,
    hasMinimalEvidence: false,
    hasDealModality: false
  })

  const [hasAvailability, setHasAvailability] = useState(false)

  // Recalculate quality signals when data changes
  React.useEffect(() => {
    const calculateSignals = async () => {
      try {
        const result = await calculateQualitySignals(mvpData)
        if (result.success && result.signals) {
          setSignals(result.signals)
        }
      } catch (e) {
        // ignore
      }
    }
    calculateSignals()
  }, [mvpData])

  const canProceedToAvailability = () => {
    return !!(mvpData.name && mvpData.oneLiner && mvpData.description)
  }

  const goToNextStep = async () => {
    setError(null)

    if (currentStep === 'basics') {
      if (!canProceedToAvailability()) {
        setError('Por favor completa los campos básicos antes de continuar')
        return
      }

      // Create the MVP record now (only once)
      if (!mvpData.id) {
        setIsSaving(true)
        try {
          const result = await saveDraft(mvpData)
          if (!result.success || !result.data?.id) {
            setError(result.message || 'Error al guardar el MVP')
            return
          }
          setMvpData(prev => ({ ...prev, id: result.data.id }))
        } catch (e) {
          setError('Error de conexión al guardar')
          return
        } finally {
          setIsSaving(false)
        }
      }

      setCurrentStep('availability')
    } else if (currentStep === 'availability') {
      if (!hasAvailability) {
        setError('Debes guardar al menos un horario para continuar')
        return
      }
      setCurrentStep('review')
    }
  }

  const handlePublish = async () => {
    if (!mvpData.id) {
      setError('No hay un MVP guardado. Vuelve al paso anterior.')
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      const result = await publishMVP(mvpData.id)
      if (result.success) {
        router.push('/marketplace')
      } else {
        setError(result.message || 'Error al publicar')
      }
    } catch (e) {
      setError('Error de conexión')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Publicar MVP</h1>
            {currentStep === 'review' && (
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publicar MVP
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCurrent = currentStep === step.id
              const isCompleted =
                (step.id === 'basics' && (currentStep === 'availability' || currentStep === 'review')) ||
                (step.id === 'availability' && currentStep === 'review')

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isCurrent ? 'border-primary bg-primary text-white' : ''}
                      ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                      ${!isCurrent && !isCompleted ? 'border-gray-300 bg-white text-gray-400' : ''}
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? 'font-semibold' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 w-16 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'basics' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Información del MVP</h2>
                <BasicFields data={mvpData} onChange={setMvpData} />
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={goToNextStep}
                    disabled={!canProceedToAvailability() || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Continuar a Disponibilidad'
                    )}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-1 sticky top-24">
              <QualitySignalsIndicator signals={signals} />
              {!Object.values(signals).every(Boolean) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    Completa los campos requeridos
                  </p>
                  <p className="text-xs text-yellow-700">
                    Completa las 5 señales de calidad para poder publicar.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'availability' && mvpData.id && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Configura tu Disponibilidad</h2>
                <p className="text-gray-600">
                  Define cuándo estás disponible para reuniones con inversionistas interesados en tu MVP
                </p>
              </div>
              <Badge variant="secondary" className="mb-4">
                Requerido para continuar
              </Badge>
            </Card>

            <AvailabilityCalendar mvpId={mvpData.id} onHasAvailabilityChange={setHasAvailability} />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('basics')}>
                Volver
              </Button>
              <Button onClick={goToNextStep} disabled={!hasAvailability}>
                Continuar a Revisión
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Revisa tu Publicación</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{mvpData.name}</h3>
                  <p className="text-gray-600 italic">{mvpData.oneLiner}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{mvpData.description}</p>
                </div>

                {mvpData.demoUrl && (
                  <div>
                    <h4 className="font-medium mb-2">Demo</h4>
                    <a
                      href={mvpData.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {mvpData.demoUrl}
                    </a>
                  </div>
                )}

                {mvpData.monetizationModel && (
                  <div>
                    <h4 className="font-medium mb-2">Monetización</h4>
                    <Badge>{mvpData.monetizationModel}</Badge>
                  </div>
                )}

                {mvpData.dealModality && mvpData.priceRange && (
                  <div>
                    <h4 className="font-medium mb-2">Deal</h4>
                    <p className="text-gray-700">
                      {mvpData.dealModality} - {mvpData.priceRange}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Tu MVP será enviado a revisión. El equipo de Dame Dos lo evaluará y te notificará cuando sea aprobado.
                </p>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('availability')}>
                Volver
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? 'Publicando...' : 'Publicar MVP'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}