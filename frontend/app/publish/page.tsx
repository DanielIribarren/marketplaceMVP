'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BasicFields } from '@/components/publish/BasicFields'
import { AvailabilityCalendar } from '@/components/publish/AvailabilityCalendar'
import { saveDraft, publishMVP } from '@/app/actions/mvp'
import { createEmptyDraft } from '@/lib/types/mvp-publication'
import type { MVPPublication } from '@/lib/types/mvp-publication'
import { Loader2, Save, Send, CheckCircle2, Calendar } from 'lucide-react'

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasAvailability, setHasAvailability] = useState(false)

  // Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (mvpData.name || mvpData.oneLiner || mvpData.description) {
        await handleSaveDraft(true) // Silent auto-save
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [mvpData])

  const handleSaveDraft = async (silent = false) => {
    if (!silent) setIsSaving(true)
    setSaveError(null)

    try {
      const result = await saveDraft(mvpData)
      
      if (result.success) {
        setLastSaved(new Date())
        if (result.data?.id && !mvpData.id) {
          setMvpData({ ...mvpData, id: result.data.id })
        }
      } else {
        if (!silent) {
          setSaveError(result.message || 'Error al guardar')
        }
      }
    } catch (error) {
      if (!silent) {
        setSaveError('Error de conexión')
      }
    } finally {
      if (!silent) setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!mvpData.id) {
      // Save first if no ID
      const saveResult = await saveDraft(mvpData)
      if (!saveResult.success || !saveResult.data?.id) {
        setSaveError('Debes guardar el borrador primero')
        return
      }
      setMvpData({ ...mvpData, id: saveResult.data.id })
    }

    setIsPublishing(true)
    setSaveError(null)

    try {
      const result = await publishMVP(mvpData.id!)
      
      if (result.success) {
        router.push('/marketplace')
      } else {
        setSaveError(result.message || 'Error al publicar')
      }
    } catch (error) {
      setSaveError('Error de conexión')
    } finally {
      setIsPublishing(false)
    }
  }

  const canProceedToAvailability = () => {
    return mvpData.name && mvpData.oneLiner && mvpData.description && mvpData.id
  }

  const goToNextStep = async () => {
    if (currentStep === 'basics') {
      if (!mvpData.id) {
        await handleSaveDraft(false)
      }
      if (canProceedToAvailability()) {
        setCurrentStep('availability')
      } else {
        setSaveError('Por favor completa los campos básicos antes de continuar')
      }
    } else if (currentStep === 'availability') {
      if (!hasAvailability) {
        setSaveError('Debes guardar al menos un horario para continuar')
        return
      }
      setCurrentStep('review')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Publicar MVP</h1>
              {lastSaved && (
                <p className="text-sm text-gray-500 mt-1">
                  Guardado hace {Math.floor((Date.now() - lastSaved.getTime()) / 1000)}s
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => handleSaveDraft(false)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
              {currentStep === 'review' && (
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
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
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCurrent = currentStep === step.id
              const isCompleted = 
                (step.id === 'basics' && mvpData.id) ||
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

          {saveError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{saveError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'basics' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Información del MVP</h2>
            <BasicFields data={mvpData} onChange={setMvpData} />
            
            <div className="mt-6 flex justify-end">
              <Button onClick={goToNextStep} disabled={!canProceedToAvailability()}>
                Continuar a Disponibilidad
              </Button>
            </div>
          </Card>
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