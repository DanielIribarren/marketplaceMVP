"use client"

import * as React from "react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Calendar, CheckCircle2, Loader2, Send, ArrowLeft, X, AlertTriangle, Save } from "lucide-react"
import { publishMVP, saveDraft, deleteDraft, getUrlPreview } from "@/app/actions/mvp"
import { createClient } from "@/lib/supabase/client"
import { AvailabilityCalendar } from "@/components/publish/AvailabilityCalendar"
import { BasicFields, MAX_ONE_LINER, MAX_DESCRIPTION_WORDS, MAX_MINIMAL_EVIDENCE_WORDS, MAX_DIFFERENTIAL } from "@/components/publish/BasicFields"
import { QualitySignalsIndicator } from "@/components/publish/QualitySignals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
const DRAFT_STEP_KEY = (id: string) => `mvp-draft-step-${id}`

function isValidHttpUrl(value: string): boolean {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Map DB row fields to MVPPublication form format
function mapDbMvpToForm(mvp: Record<string, unknown>): Partial<MVPPublication> & { id?: string } {
  // Parse price_range "USD 1.000-5.000" (es-ES format with periods as thousands sep)
  let minPrice: number | undefined
  let maxPrice: number | undefined
  if (typeof mvp.price_range === 'string' && mvp.price_range) {
    const match = (mvp.price_range as string).match(/USD\s+([\d.,]+)[-–]([\d.,]+)/)
    if (match) {
      minPrice = parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || undefined
      maxPrice = parseFloat(match[2].replace(/\./g, '').replace(',', '.')) || undefined
    }
  }

  const checklist = (mvp.transfer_checklist as Record<string, boolean> | null) ?? {}

  return {
    id: mvp.id as string | undefined,
    name: (mvp.title as string) || '',
    oneLiner: (mvp.one_liner as string) || '',
    sector: (mvp.category as MVPPublication['sector']) || undefined,
    description: (mvp.description as string) || '',
    demoUrl: (mvp.demo_url as string) || '',
    coverImageUrl: (mvp.cover_image_url as string) || undefined,
    screenshots: (mvp.images_urls as string[]) || [],
    monetizationModel: (mvp.monetization_model as MVPPublication['monetizationModel']) || undefined,
    minimalEvidence: (mvp.minimal_evidence as string) || '',
    competitiveDifferentials: (mvp.competitive_differentials as string[]) || ['', '', ''],
    dealModality: (mvp.deal_modality as MVPPublication['dealModality']) || undefined,
    minPrice,
    maxPrice,
    transferChecklist: {
      codeAndDocs: checklist.codeAndDocs ?? false,
      domainOrLanding: checklist.domainOrLanding ?? false,
      integrationAccounts: checklist.integrationAccounts ?? false,
      ownIp: checklist.ownIp ?? false,
    },
  }
}

function PublishPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftIdParam = searchParams.get('draft')
  const fromParam = searchParams.get('from')
  const fromMyMvps = fromParam === 'my-mvps'
  const fromHome = fromParam === 'home'
  const backHref = fromMyMvps ? '/my-mvps' : fromHome ? '/' : '/marketplace'
  const backLabel = fromMyMvps ? 'Volver a tus MVPs' : fromHome ? 'Volver al inicio' : 'Volver al marketplace'

  const [currentStep, setCurrentStep] = useState<Step>("basics")
  const [mvpData, setMvpData] = useState<Partial<MVPPublication> & { id?: string }>(createEmptyDraft(""))
  const [mvpStatus, setMvpStatus] = useState<string | null>(null)
  const originalRejectedDataRef = React.useRef<string>('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [availabilityCount, setAvailabilityCount] = useState(0)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showBackDialog, setShowBackDialog] = useState(false)
  const previewRequestRef = React.useRef(0)
  const lastPreviewUrlRef = React.useRef('')
  const lastSavedDataRef = React.useRef<string>('')

  const [signals, setSignals] = useState<QualitySignals>({
    hasValidOneLiner: false,
    hasConcreteUseCase: false,
    hasDemoOrScreenshot: false,
    hasMinimalEvidence: false,
    hasDealModality: false,
    hasTransferChecklist: false,
  })

  // Load draft: from DB if ?draft=<id>, else from localStorage
  React.useEffect(() => {
    setError(null)

    if (draftIdParam) {
      // Query Supabase directly from the browser (RLS allows owner to read own MVP)
      const loadDraft = async () => {
        try {
          const supabase = createClient()
          const { data: mvp, error } = await supabase
            .from('mvps')
            .select('*')
            .eq('id', draftIdParam)
            .single()

          if (!error && mvp) {
            const mapped = mapDbMvpToForm(mvp as Record<string, unknown>)
            setMvpData(mapped)
            const status = mvp.status as string
            setMvpStatus(status)
            if (status === 'rejected') {
              originalRejectedDataRef.current = JSON.stringify(mapped)
            }
            lastSavedDataRef.current = JSON.stringify(mapped)
            // Prevent auto-preview from re-fetching on load and dirtying the form
            if (mapped.demoUrl) lastPreviewUrlRef.current = mapped.demoUrl.trim()
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
            // Restore last-saved step
            const savedStep = localStorage.getItem(DRAFT_STEP_KEY(draftIdParam)) as Step | null
            if (savedStep && (['basics', 'availability', 'review'] as string[]).includes(savedStep)) {
              setCurrentStep(savedStep)
            }
          } else {
            // Keep the ID so cancel can still delete it
            const empty = { ...createEmptyDraft(""), id: draftIdParam }
            setMvpData(empty)
            lastSavedDataRef.current = JSON.stringify(empty)
          }
        } catch {
          setMvpData({ ...createEmptyDraft(""), id: draftIdParam })
        }
        setIsLoaded(true)
      }
      void loadDraft()
      return
    }

    // No draft param: always start fresh (clean slate for a new MVP)
    localStorage.removeItem(STORAGE_KEY)
    lastSavedDataRef.current = JSON.stringify(createEmptyDraft(""))
    setIsLoaded(true)
  }, [draftIdParam])

  // Auto-save to localStorage on change
  React.useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mvpData))
    }
  }, [mvpData, isLoaded])

  React.useEffect(() => {
    const wordCount = (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return 0
      return trimmed.split(/\s+/).filter(word => word.length > 0).length
    }

    const localSignals: QualitySignals = {
      hasValidOneLiner: !!(
        mvpData.oneLiner &&
        mvpData.oneLiner.trim().length >= 20 &&
        mvpData.oneLiner.trim().length <= MAX_ONE_LINER &&
        mvpData.sector
      ),
      hasConcreteUseCase: !!(
        mvpData.description &&
        mvpData.description.trim() &&
        wordCount(mvpData.description) >= 15 &&
        wordCount(mvpData.description) <= MAX_DESCRIPTION_WORDS
      ),
      hasDemoOrScreenshot: !!(
        (mvpData.demoUrl && mvpData.demoUrl.trim()) &&
        (mvpData.screenshots && mvpData.screenshots.filter(s => s && s.trim()).length >= 2)
      ),
      hasMinimalEvidence: !!(
        mvpData.minimalEvidence &&
        mvpData.minimalEvidence.trim() &&
        wordCount(mvpData.minimalEvidence) >= 10 &&
        wordCount(mvpData.minimalEvidence) <= MAX_MINIMAL_EVIDENCE_WORDS
      ),
      hasDealModality: !!(
        mvpData.dealModality &&
        mvpData.minPrice &&
        mvpData.maxPrice &&
        mvpData.minPrice > 0 &&
        mvpData.maxPrice > mvpData.minPrice &&
        (mvpData.maxPrice - mvpData.minPrice) >= 100
      ),
      hasTransferChecklist: !!(
        mvpData.transferChecklist &&
        Object.values(mvpData.transferChecklist).some(checked => checked === true)
      )
    }

    setSignals(localSignals)
  }, [mvpData])

  const requestLinkPreview = React.useCallback(async (url: string, force = false) => {
    const normalized = url.trim()
    if (!isValidHttpUrl(normalized)) return
    if (!force && lastPreviewUrlRef.current === normalized) return

    lastPreviewUrlRef.current = normalized
    const requestId = ++previewRequestRef.current
    setPreviewLoading(true)
    setPreviewError(null)

    const result = await getUrlPreview(normalized)

    if (requestId !== previewRequestRef.current) return

    if (result.success && result.previewUrl) {
      setMvpData((prevData) => {
        if ((prevData.demoUrl || '').trim() !== normalized) return prevData
        if (prevData.coverImageUrl === result.previewUrl) return prevData
        return { ...prevData, coverImageUrl: result.previewUrl || undefined }
      })
      setPreviewError(null)
    } else {
      setPreviewError(result.error || 'No encontramos una portada automática para este enlace')
      setMvpData((prevData) => {
        if ((prevData.demoUrl || '').trim() !== normalized) return prevData
        if (!prevData.coverImageUrl) return prevData
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { coverImageUrl, ...rest } = prevData
        return rest
      })
    }

    setPreviewLoading(false)
  }, [])

  const demoUrl = (mvpData.demoUrl || '').trim()

  React.useEffect(() => {
    if (!isLoaded) return

    if (!demoUrl) {
      previewRequestRef.current += 1
      lastPreviewUrlRef.current = ''
      setPreviewLoading(false)
      setPreviewError(null)
      setMvpData((prev) => {
        if (!prev.coverImageUrl) return prev
        return { ...prev, coverImageUrl: undefined }
      })
      return
    }

    if (!isValidHttpUrl(demoUrl)) {
      previewRequestRef.current += 1
      lastPreviewUrlRef.current = ''
      setPreviewLoading(false)
      setPreviewError(null)
      setMvpData((prev) => {
        if (!prev.coverImageUrl) return prev
        return { ...prev, coverImageUrl: undefined }
      })
      return
    }

    const timeoutId = window.setTimeout(() => {
      void requestLinkPreview(demoUrl)
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [demoUrl, isLoaded, requestLinkPreview])

  const handleRetryPreview = React.useCallback(() => {
    if (!isValidHttpUrl(demoUrl)) return
    void requestLinkPreview(demoUrl, true)
  }, [demoUrl, requestLinkPreview])

  const canProceedToAvailability = () => {
    const signalsOk = Object.values(signals).every(signal => signal === true)
    const oneLinerLen = (mvpData.oneLiner || '').length
    const descriptionWords = (mvpData.description && mvpData.description.trim()) ? mvpData.description.trim().split(/\s+/).filter(Boolean).length : 0
    const minimalEvidenceWords = (mvpData.minimalEvidence && mvpData.minimalEvidence.trim()) ? mvpData.minimalEvidence.trim().split(/\s+/).filter(Boolean).length : 0
    const differentials = (mvpData.competitiveDifferentials || []) as string[]
    const differentialsOk = differentials.every(d => (d || '').length <= MAX_DIFFERENTIAL)
    const lengthsOk = oneLinerLen <= MAX_ONE_LINER && descriptionWords <= MAX_DESCRIPTION_WORDS && minimalEvidenceWords <= MAX_MINIMAL_EVIDENCE_WORDS && differentialsOk
    return signalsOk && lengthsOk
  }

  const effectiveDraftId = (mvpData.id && !mvpData.id.startsWith('draft-')) ? mvpData.id : draftIdParam ?? undefined
  const hasSavedDraft = !!effectiveDraftId
  const hasUnsavedChanges = JSON.stringify(mvpData) !== lastSavedDataRef.current

  // Save draft manually (called by button)
  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    setSaveError(null)
    setDraftSavedAt(null)

    const result = await saveDraft(mvpData)
    if (result.success && result.data?.id) {
      const savedId = result.data.id
      const updatedData = { ...mvpData, id: savedId }
      setMvpData(prev => ({ ...prev, id: savedId }))
      lastSavedDataRef.current = JSON.stringify(updatedData)
      // Persist the current step so "Continuar editando" restores it
      localStorage.setItem(DRAFT_STEP_KEY(savedId), currentStep)
      setDraftSavedAt(new Date())
      // Clear "saved" badge after 3s
      setTimeout(() => setDraftSavedAt(null), 3000)
    } else {
      setSaveError(result.message || 'Error al guardar el borrador')
      setTimeout(() => setSaveError(null), 4000)
    }
    setIsSavingDraft(false)
  }

  const goToNextStep = async () => {
    setError(null)

    if (currentStep === "basics") {
      if (!canProceedToAvailability()) {
        setError("Debes completar las 6 señales de calidad antes de continuar")
        return
      }

      // Ensure draft is saved in DB before moving to availability (need an ID for the calendar)
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
      } else {
        // Update existing draft with latest data
        await saveDraft(mvpData)
      }

      setCurrentStep("availability")
    } else if (currentStep === "availability") {
      if (availabilityCount < 2) {
        setError("Debes guardar al menos 2 espacios de disponibilidad antes de continuar")
        return
      }
      setCurrentStep("review")
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    setError(null)

    // Si el MVP fue rechazado y no se hizo ningún cambio, advertir
    if (mvpStatus === 'rejected' && originalRejectedDataRef.current) {
      const currentData = JSON.stringify(mvpData)
      if (currentData === originalRejectedDataRef.current) {
        setError('Este MVP ya fue rechazado anteriormente. Edita los campos antes de volver a enviarlo para aumentar las posibilidades de aprobación.')
        setIsPublishing(false)
        return
      }
    }

    try {
      let mvpId = mvpData.id

      if (!mvpId || mvpId.startsWith('draft-')) {
        const draftResult = await saveDraft(mvpData)
        if (!draftResult.success || !draftResult.data?.id) {
          setError(draftResult.message || "Error al guardar el MVP")
          return
        }
        mvpId = draftResult.data.id
      }

      if (!mvpId) {
        setError("Error: No se pudo obtener el ID del MVP")
        return
      }

      const result = await publishMVP(mvpId)
      if (result.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem('mvp-draft-availability')
          if (mvpId) localStorage.removeItem(DRAFT_STEP_KEY(mvpId))
        }
        router.push("/my-mvps")
      } else {
        setError(result.message || "Error al publicar")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setIsPublishing(false)
    }
  }

  const confirmBack = () => {
    // Keep draft in DB (if saved), just clear local state and navigate
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('mvp-draft-availability')
    if (effectiveDraftId) localStorage.removeItem(DRAFT_STEP_KEY(effectiveDraftId))
    setShowBackDialog(false)
    router.push(backHref)
  }

  const handleCancel = () => setShowCancelDialog(true)

  const confirmCancel = async () => {
    if (effectiveDraftId) {
      try {
        await deleteDraft(effectiveDraftId)
      } catch {
        // Ignore errors
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('mvp-draft-availability')
      if (effectiveDraftId) localStorage.removeItem(DRAFT_STEP_KEY(effectiveDraftId))
    }
    setShowCancelDialog(false)
    router.push(backHref)
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        {/* Top navigation bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 sm:px-6 lg:px-8">
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
            <button
              onClick={() => hasUnsavedChanges ? setShowBackDialog(true) : router.push(backHref)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </button>
          )}

          {/* Right side: Save Draft + Cancel */}
          <div className="flex items-center gap-2">
            {/* Save draft button (not shown in review step since publish does the save) */}
            {currentStep !== "review" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="gap-1.5"
              >
                {isSavingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : draftSavedAt ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span className={draftSavedAt ? 'text-green-600' : ''}>
                  {draftSavedAt ? 'Guardado' : 'Guardar borrador'}
                </span>
              </Button>
            )}
            {saveError && (
              <span className="text-xs text-destructive">{saveError}</span>
            )}
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
              <X className="h-4 w-4" />
            </button>
          </div>
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
                        !isCurrent && !isCompleted && "border-brand-200 bg-background text-muted-foreground",
                      ].filter(Boolean).join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`mt-1 hidden sm:block text-xs ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 w-6 sm:w-16 ${isCompleted ? "bg-green-600" : "bg-brand-200"}`} />
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
                    <h2 className="mb-3 text-xl font-semibold">Información del MVP</h2>
                    {mvpStatus === 'rejected' && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-red-800"><AlertTriangle className="h-4 w-4 text-red-600 shrink-0" /> MVP rechazado anteriormente</p>
                        <p className="text-sm text-red-700 mt-0.5">
                          Revisa y edita los campos antes de volver a enviarlo. Si lo publicas sin cambios, se te avisará.
                        </p>
                      </div>
                    )}
                    <BasicFields
                      data={mvpData}
                      onChange={setMvpData}
                      previewLoading={previewLoading}
                      previewError={previewError}
                      onRetryPreview={handleRetryPreview}
                    />

                    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm text-amber-800">
                        <strong>Nota:</strong> Tu MVP no será público hasta completar todos los pasos y hacer clic en &quot;Publicar&quot;.
                        Puedes guardar el borrador en cualquier momento y retomarlo desde &quot;Tus MVPs&quot;.
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

                <div className="hidden lg:block sticky top-24 lg:col-span-1">
                  <QualitySignalsIndicator signals={signals} />
                  {!Object.values(signals).every(Boolean) && (
                    <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
                      <p className="mb-2 text-sm font-medium text-brand-800">
                        Completa los campos requeridos
                      </p>
                      <p className="text-xs text-brand-700">
                        Completa las 6 señales de calidad para poder publicar.
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
                    Define cuándo estás disponible para reuniones con inversionistas interesados en tu MVP.
                    Debes guardar al menos 2 espacios de disponibilidad para continuar.
                  </p>
                </div>
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline" className="bg-brand-100 text-brand-800 border-brand-300">
                    Requerido: Mínimo 2 espacios
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Borrador guardado - No público aún
                  </Badge>
                </div>
              </Card>

              <AvailabilityCalendar
                mvpId={mvpData.id}
                onAvailabilityCountChange={setAvailabilityCount}
              />

              <div className="space-y-3">
                {availabilityCount < 2 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-800">
                      <strong>Requerido:</strong> Debes guardar al menos 2 espacios de disponibilidad para continuar.
                      {availabilityCount === 0 && ' No has guardado ningún espacio aún.'}
                      {availabilityCount === 1 && ' Has guardado 1 espacio, necesitas 1 más.'}
                    </p>
                  </div>
                )}
                {availabilityCount >= 2 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-800">
                      ✓ Has guardado {availabilityCount} espacios de disponibilidad. Puedes continuar a revisión.
                    </p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={goToNextStep} disabled={availabilityCount < 2}>
                    Continuar a Revisión
                  </Button>
                </div>
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
                    <p className="italic text-muted-foreground break-words">{mvpData.oneLiner}</p>
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

                  {mvpData.dealModality && mvpData.minPrice && mvpData.maxPrice && (
                    <div>
                      <h4 className="mb-2 font-medium">Deal</h4>
                      <p className="text-muted-foreground">
                        {mvpData.dealModality} - USD ${mvpData.minPrice.toLocaleString('es-ES')}-${mvpData.maxPrice.toLocaleString('es-ES')}
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

      {/* Back confirmation dialog */}
      <Dialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              ¡Asegúrate de guardar tu progreso!
            </DialogTitle>
            <DialogDescription className="pt-2">
              {hasSavedDraft
                ? "Tu borrador guardado quedará intacto y podrás retomarlo desde 'Tus MVPs'."
                : "Si no guardaste tu progreso, se perderá al salir."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBackDialog(false)}
            >
              OK
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBack}
            >
              Salir de todos modos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              ¿Estás seguro que quieres salir?
            </DialogTitle>
            <DialogDescription className="pt-2">
              {hasSavedDraft
                ? "Tu borrador guardado será eliminado permanentemente. ¿Quieres continuar?"
                : "Si cancelas ahora, perderás todo el progreso en la creación de este MVP. Los datos ingresados no se guardarán y tendrás que empezar de nuevo."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Volver a la edición
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
            >
              {hasSavedDraft ? "Sí, eliminar y salir" : "Sí, cancelar y salir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PublishPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PublishPageInner />
    </Suspense>
  )
}
