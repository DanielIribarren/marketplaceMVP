"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Calendar, CheckCircle2, Loader2, Send, ArrowLeft, X } from "lucide-react"
import Link from "next/link"
import { publishMVP, saveDraft, deleteDraft } from "@/app/actions/mvp"
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

const STORAGE_KEY = 'mvp-draft-form'

export default function PublishPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("basics")
  const [mvpData, setMvpData] = useState<Partial<MVPPublication> & { id?: string }>(createEmptyDraft(""))
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const [signals, setSignals] = useState<QualitySignals>({
    hasValidOneLiner: false,
    hasConcreteUseCase: false,
    hasDemoOrScreenshot: false,
    hasMinimalEvidence: false,
    hasDealModality: false,
  })

  // Cargar datos del localStorage al montar el componente (solo en cliente)
  React.useEffect(() => {
    // Limpiar cualquier error previo
    setError(null)

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsedData = JSON.parse(saved)
        // Si tiene un ID que no es local draft, limpiarlo para empezar fresco
        if (parsedData.id && !parsedData.id.startsWith('draft-')) {
          // ID de base de datos de una sesión anterior - no usarlo
          delete parsedData.id
        }
        setMvpData(parsedData)
      } catch {
        // Si hay error al parsear, limpiar localStorage
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoaded(true)
  }, [])

  // Guardar datos en localStorage cuando cambian (solo después de cargar)
  React.useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mvpData))
    }
  }, [mvpData, isLoaded])

  React.useEffect(() => {
    // Calcular señales localmente para respuesta instantánea
    const wordCount = (text: string) => text.trim().split(/\s+/).length

    const localSignals: QualitySignals = {
      hasValidOneLiner: !!(mvpData.oneLiner && mvpData.oneLiner.trim().length >= 20),
      hasConcreteUseCase: !!(mvpData.description && wordCount(mvpData.description) >= 15),
      hasDemoOrScreenshot: !!(mvpData.demoUrl || (mvpData.screenshots && mvpData.screenshots.length > 0)),
      hasMinimalEvidence: !!(mvpData.minimalEvidence && wordCount(mvpData.minimalEvidence) >= 10),
      hasDealModality: !!mvpData.dealModality
    }

    setSignals(localSignals)
  }, [mvpData])

  const canProceedToAvailability = () => {
    // Verificar que todas las señales de calidad estén completas
    return Object.values(signals).every(signal => signal === true)
  }

  const goToNextStep = async () => {
    setError(null)

    if (currentStep === "basics") {
      if (!canProceedToAvailability()) {
        setError("Debes completar las 5 señales de calidad antes de continuar")
        return
      }

      // Guardar borrador en la base de datos para poder gestionar disponibilidad
      // Solo si no tiene un ID de base de datos válido
      if (!mvpData.id || mvpData.id.startsWith('draft-')) {
        try {
          const result = await saveDraft(mvpData)
          if (!result.success || !result.data?.id) {
            setError(result.message || "Error al guardar el borrador")
            return
          }
          setMvpData((prev) => ({ ...prev, id: result.data.id }))
        } catch {
          setError("Error de conexión al guardar")
          return
        }
      }

      setCurrentStep("availability")
    } else if (currentStep === "availability") {
      // La disponibilidad es opcional - el usuario puede continuar sin configurarla
      setCurrentStep("review")
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    setError(null)

    try {
      let mvpId = mvpData.id

      // Si es un borrador local (no guardado en base de datos), crearlo primero
      if (!mvpId || mvpId.startsWith('draft-')) {
        const draftResult = await saveDraft(mvpData)
        if (!draftResult.success || !draftResult.data?.id) {
          setError(draftResult.message || "Error al guardar el MVP")
          return
        }
        mvpId = draftResult.data.id
      }

      // Verificar que tenemos un ID válido
      if (!mvpId) {
        setError("Error: No se pudo obtener el ID del MVP")
        return
      }

      // Publicar el MVP
      const result = await publishMVP(mvpId)
      if (result.success) {
        // Limpiar localStorage al publicar exitosamente
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem('mvp-draft-availability')
        }
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

  const handleCancel = async () => {
    // Si hay un borrador guardado en la base de datos (no local), eliminarlo
    if (mvpData.id && !mvpData.id.startsWith('draft-')) {
      try {
        await deleteDraft(mvpData.id)
      } catch {
        // Ignorar errores al eliminar, de todas formas navegamos
      }
    }
    // Limpiar localStorage al cancelar
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('mvp-draft-availability')
    }
    router.push("/marketplace")
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        {/* Botones de navegación - pegados a los bordes */}
        <div className="flex items-center justify-between px-4 pt-4 pb-6 sm:px-6 lg:px-8">
          {currentStep === "availability" && (
            <button
              onClick={() => setCurrentStep("basics")}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          )}
          {currentStep === "review" && (
            <button
              onClick={() => setCurrentStep("availability")}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          )}
          {currentStep === "basics" && (
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al marketplace
            </Link>
          )}
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center justify-between gap-4">
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
                        isCompleted && "border-green-600 bg-green-600 text-white",
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
                        isCompleted ? "bg-green-600" : "bg-brand-200"
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

                    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm text-amber-800">
                        <strong>Nota:</strong> Los datos se guardarán al pasar al siguiente paso.
                        Tu MVP no será público hasta completar todos los pasos y hacer clic en &quot;Publicar&quot;.
                      </p>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={goToNextStep}
                        disabled={!canProceedToAvailability()}
                      >
                        Continuar a Disponibilidad
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
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Opcional
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Borrador guardado - No público aún
                  </Badge>
                </div>
              </Card>

              <AvailabilityCalendar
                mvpId={mvpData.id}
              />

              <div className="flex justify-end">
                <Button onClick={goToNextStep}>
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

                <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    🎉 ¡Todo listo para publicar!
                  </p>
                  <p className="text-sm text-green-700">
                    Al hacer clic en &quot;Publicar MVP&quot;, tu proyecto será enviado a revisión
                    y se hará visible en el marketplace una vez aprobado por el equipo.
                  </p>
                </div>
              </Card>

              <div className="flex justify-end">
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
