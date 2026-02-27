"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Calendar, CheckCircle2, Loader2, Send } from "lucide-react"
import { calculateQualitySignals, publishMVP, saveDraft } from "@/app/actions/mvp"
import { AvailabilityCalendar } from "@/components/publish/AvailabilityCalendar"
import { BasicFields } from "@/components/publish/BasicFields"
import { QualitySignalsIndicator } from "@/components/publish/QualitySignals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createEmptyDraft } from "@/lib/types/mvp-publication"
import type { MVPPublication, QualitySignals } from "@/lib/types/mvp-publication"

type Step = "basics" | "availability" | "review"

const STEPS = [
  { id: "basics", label: "Información Básica", icon: CheckCircle2 },
  { id: "availability", label: "Disponibilidad", icon: Calendar },
  { id: "review", label: "Revisar y Publicar", icon: Send },
] as const

const stepTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.26, ease: [0.18, 0.95, 0.3, 1] as const },
}

export default function PublishPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("basics")
  const [mvpData, setMvpData] = useState<Partial<MVPPublication> & { id?: string }>(
    () => createEmptyDraft("")
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [signals, setSignals] = useState<QualitySignals>({
    hasValidOneLiner: false,
    hasConcreteUseCase: false,
    hasDemoOrScreenshot: false,
    hasMinimalEvidence: false,
    hasDealModality: false,
  })
  const [hasAvailability, setHasAvailability] = useState(false)

  React.useEffect(() => {
    const calculateSignals = async () => {
      try {
        const result = await calculateQualitySignals(mvpData)
        if (result.success && result.signals) {
          setSignals(result.signals)
        }
      } catch {
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

    if (currentStep === "basics") {
      if (!canProceedToAvailability()) {
        setError("Por favor completa los campos básicos antes de continuar")
        return
      }

      if (!mvpData.id) {
        setIsSaving(true)
        try {
          const result = await saveDraft(mvpData)
          if (!result.success || !result.data?.id) {
            setError(result.message || "Error al guardar el MVP")
            return
          }
          setMvpData((prev) => ({ ...prev, id: result.data.id }))
        } catch {
          setError("Error de conexión al guardar")
          return
        } finally {
          setIsSaving(false)
        }
      }

      setCurrentStep("availability")
    } else if (currentStep === "availability") {
      if (!hasAvailability) {
        setError("Debes guardar al menos un horario para continuar")
        return
      }
      setCurrentStep("review")
    }
  }

  const handlePublish = async () => {
    if (!mvpData.id) {
      setError("No hay un MVP guardado. Vuelve al paso anterior.")
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      const result = await publishMVP(mvpData.id)
      if (result.success) {
        router.push("/marketplace")
      } else {
        setError(result.message || "Error al publicar")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Publicar MVP</h1>
            {currentStep === "review" && (
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publicar MVP
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCurrent = currentStep === step.id
              const isCompleted =
                (step.id === "basics" &&
                  (currentStep === "availability" || currentStep === "review")) ||
                (step.id === "availability" && currentStep === "review")

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-200",
                        isCurrent && "border-primary bg-primary text-white",
                        isCompleted && "border-brand-700 bg-brand-700 text-white",
                        !isCurrent &&
                          !isCompleted &&
                          "border-brand-200 bg-background text-muted-foreground",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`mt-1 text-xs ${
                        isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-16 ${
                        isCompleted ? "bg-brand-700" : "bg-brand-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {currentStep === "basics" && (
            <motion.div key="basics" {...stepTransition}>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card className="p-6">
                    <h2 className="mb-6 text-xl font-semibold">Información del MVP</h2>
                    <BasicFields data={mvpData} onChange={setMvpData} />
                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={goToNextStep}
                        disabled={!canProceedToAvailability() || isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          "Continuar a Disponibilidad"
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>

                <div className="sticky top-24 lg:col-span-1">
                  <QualitySignalsIndicator signals={signals} />
                  {!Object.values(signals).every(Boolean) && (
                    <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
                      <p className="mb-2 text-sm font-medium text-brand-800">
                        Completa los campos requeridos
                      </p>
                      <p className="text-xs text-brand-700">
                        Completa las 5 señales de calidad para poder publicar.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "availability" && mvpData.id && (
            <motion.div key="availability" {...stepTransition} className="space-y-4">
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="mb-2 text-xl font-semibold">
                    Configura tu Disponibilidad
                  </h2>
                  <p className="text-muted-foreground">
                    Define cuándo estás disponible para reuniones con
                    inversionistas interesados en tu MVP.
                  </p>
                </div>
                <Badge variant="secondary" className="mb-2">
                  Requerido para continuar
                </Badge>
              </Card>

              <AvailabilityCalendar
                mvpId={mvpData.id}
                onHasAvailabilityChange={setHasAvailability}
              />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("basics")}>
                  Volver
                </Button>
                <Button onClick={goToNextStep} disabled={!hasAvailability}>
                  Continuar a Revisión
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "review" && (
            <motion.div key="review" {...stepTransition} className="space-y-4">
              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">Revisa tu Publicación</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{mvpData.name}</h3>
                    <p className="italic text-muted-foreground">{mvpData.oneLiner}</p>
                  </div>

                  <div>
                    <h4 className="mb-2 font-medium">Descripción</h4>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {mvpData.description}
                    </p>
                  </div>

                  {mvpData.demoUrl && (
                    <div>
                      <h4 className="mb-2 font-medium">Demo</h4>
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
                      <h4 className="mb-2 font-medium">Monetización</h4>
                      <Badge>{mvpData.monetizationModel}</Badge>
                    </div>
                  )}

                  {mvpData.dealModality && mvpData.priceRange && (
                    <div>
                      <h4 className="mb-2 font-medium">Deal</h4>
                      <p className="text-muted-foreground">
                        {mvpData.dealModality} - {mvpData.priceRange}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-4">
                  <p className="text-sm text-brand-800">
                    Tu MVP será enviado a revisión. El equipo de Dame Dos lo
                    evaluará y te notificará cuando sea aprobado.
                  </p>
                </div>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("availability")}>
                  Volver
                </Button>
                <Button onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? "Publicando..." : "Publicar MVP"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
