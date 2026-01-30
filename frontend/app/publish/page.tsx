'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BasicFields } from '@/components/publish/BasicFields'
import { saveDraft, publishMVP } from '@/app/actions/mvp'
import { createEmptyDraft } from '@/lib/types/mvp-publication'
import type { MVPPublication } from '@/lib/types/mvp-publication'
import { Loader2, Save, Send } from 'lucide-react'

export default function PublishPage() {
  const router = useRouter()
  const [mvpData, setMvpData] = useState<Partial<MVPPublication> & { id?: string }>(() => createEmptyDraft(''))
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Auto-guardado cada 10 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      if (mvpData.name || mvpData.oneLiner || mvpData.description) {
        await handleSaveDraft(true) // Auto-save silencioso
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
      // Guardar primero si no tiene ID
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
            </div>
          </div>

          {saveError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{saveError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-6">Información del MVP</h2>
          <BasicFields data={mvpData} onChange={setMvpData} />
        </div>
      </div>
    </div>
  )
}
