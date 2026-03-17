'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Loader2, RefreshCw, Upload, PlayCircle } from 'lucide-react'
import { MICROCOPYS, MonetizationModel, DealModality, MonetizationModelLabels, DealModalityLabels, MvpSector, MvpSectorLabels } from '@/lib/types/mvp-publication'
import type { MVPPublication } from '@/lib/types/mvp-publication'
import { createClient } from '@/lib/supabase/client'

const MAX_MEDIA = 5
const MIN_MEDIA = 2
const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv|ogv)(\?.*)?$/i.test(url)
}

interface BasicFieldsProps {
  data: Partial<MVPPublication>
  onChange: (data: Partial<MVPPublication>) => void
  previewLoading?: boolean
  previewError?: string | null
  onRetryPreview?: () => void
}

type TransferChecklistKey = 'codeAndDocs' | 'domainOrLanding' | 'integrationAccounts' | 'ownIp'

export const MAX_ONE_LINER = 120
export const MAX_DESCRIPTION_WORDS = 500
export const MAX_MINIMAL_EVIDENCE_WORDS = 300
export const APPROX_CHARS_PER_WORD = 6 // aproximación para mostrar límite en caracteres
export const MAX_DIFFERENTIAL = 1000

export function BasicFields({ data, onChange, previewLoading = false, previewError = null, onRetryPreview }: BasicFieldsProps) {
  const [uploading, setUploading] = useState(false)
  const [fileSizeError, setFileSizeError] = useState<string | null>(null)
  // Sync from props so loaded draft data is reflected
  const differentialInputs = data.competitiveDifferentials || ['', '', '']
  const setDifferentialInputs = (newDiffs: string[]) => onChange({ ...data, competitiveDifferentials: newDiffs })

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setFileSizeError(null)

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_BYTES)
    if (oversized.length > 0) {
      setFileSizeError(`${oversized.map(f => f.name).join(', ')} supera el límite de ${MAX_FILE_SIZE_MB} MB`)
      e.target.value = ''
      return
    }

    const currentCount = data.screenshots?.length || 0
    const remaining = MAX_MEDIA - currentCount
    const filesToUpload = files.slice(0, remaining)
    setUploading(true)
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id || 'anonymous'
    const newUrls: string[] = []
    const uploadErrors: string[] = []
    for (const file of filesToUpload) {
      const safeName = file.name.replace(/\s+/g, '_')
      const path = `mvp-media/${userId}/${Date.now()}_${safeName}`
      const { error: uploadErr } = await supabase.storage.from('mvp-media').upload(path, file, { upsert: true })
      if (uploadErr) {
        uploadErrors.push(`${file.name}: ${uploadErr.message}`)
      } else {
        const { data: publicData } = supabase.storage.from('mvp-media').getPublicUrl(path)
        if (publicData?.publicUrl) newUrls.push(publicData.publicUrl)
      }
    }
    if (uploadErrors.length > 0) {
      setFileSizeError(`Error al subir: ${uploadErrors.join(' | ')}`)
    }
    if (newUrls.length > 0) {
      onChange({ ...data, screenshots: [...(data.screenshots || []), ...newUrls] })
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleScreenshotRemove = (index: number) => {
    onChange({
      ...data,
      screenshots: data.screenshots?.filter((_, i) => i !== index)
    })
  }

  const handleDifferentialChange = (index: number, value: string) => {
    const newDifferentials = [...differentialInputs]
    newDifferentials[index] = value
    setDifferentialInputs(newDifferentials)
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Campo 1: Nombre del MVP */}
      <div>
        <Label htmlFor="name">{MICROCOPYS.name.label}</Label>
        <Input className="mt-1.5"
          id="name"
          placeholder={MICROCOPYS.name.placeholder}
          value={data.name || ''}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          maxLength={100}
        />
        <p className="text-sm text-muted-foreground mt-1">{MICROCOPYS.name.help}</p>
      </div>

      {/* Campo 2: One-liner */}
      <div>
        <Label htmlFor="oneLiner">{MICROCOPYS.oneLiner.label}</Label>
        <Input
          className="mt-1.5"
          id="oneLiner"
          placeholder={MICROCOPYS.oneLiner.placeholder}
          value={data.oneLiner || ''}
          onChange={(e) => onChange({ ...data, oneLiner: e.target.value })}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-muted-foreground">{MICROCOPYS.oneLiner.help}</p>
          <span className="text-xs text-ink-300">
            {((data.oneLiner || '').trim().length)}/{MAX_ONE_LINER}
          </span>
        </div>
        {data.oneLiner && (data.oneLiner || '').trim().length > MAX_ONE_LINER && (
          <p className="text-xs text-destructive mt-1">El texto es demasiado largo (máximo {MAX_ONE_LINER} caracteres)</p>
        )}
      </div>

      {/* Campo 2b: Sector */}
      <div>
        <Label htmlFor="sector">Sector del MVP</Label>
        <Select
          value={data.sector || ''}
          onValueChange={(value) => onChange({ ...data, sector: value as MvpSector })}
        >
          <SelectTrigger id="sector" className="mt-1.5">
            <SelectValue placeholder="Selecciona el sector al que pertenece tu MVP" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MvpSectorLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">Elige el sector más cercano a tu MVP</p>
      </div>

      {/* Campo 3: Descripción */}
      <div>
        <Label htmlFor="description">{MICROCOPYS.description.label}</Label>
        <Textarea
          id="description"
          placeholder={MICROCOPYS.description.placeholder}
          value={data.description || ''}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={6}
          className="mt-1.5 break-words whitespace-pre-wrap"
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-muted-foreground">{MICROCOPYS.description.help}</p>
          <span className="text-xs text-ink-300">
            {wordCount(data.description || '')}/{MAX_DESCRIPTION_WORDS} palabras • ≈{MAX_DESCRIPTION_WORDS * APPROX_CHARS_PER_WORD} caracteres
          </span>
        </div>
        {data.description && wordCount(data.description || '') > MAX_DESCRIPTION_WORDS && (
          <p className="text-xs text-destructive mt-1">La descripción excede el máximo de {MAX_DESCRIPTION_WORDS} palabras (≈{MAX_DESCRIPTION_WORDS * APPROX_CHARS_PER_WORD} caracteres)</p>
        )}
      </div>

      {/* Campo 4: Demo URL */}
      <div>
        <Label htmlFor="demoUrl">{MICROCOPYS.demoUrl.label}</Label>
        <Input
          id="demoUrl"
          type="url"
          placeholder={MICROCOPYS.demoUrl.placeholder}
          value={data.demoUrl || ''}
          onChange={(e) => {
            const value = e.target.value
            // Limitar longitud a 2048 caracteres
            if (value.length <= 2048) {
              onChange({ ...data, demoUrl: value })
            }
          }}
          className={`mt-1.5 ${
            data.demoUrl &&
            data.demoUrl.trim() &&
            (data.demoUrl.length > 2048 ||
              !/^https?:\/\/.+/.test(data.demoUrl.trim()) ||
              /javascript:|data:|vbscript:|<script/i.test(data.demoUrl))
              ? 'border-destructive focus-visible:ring-destructive'
              : ''
          }`}
        />
        {data.demoUrl && data.demoUrl.length > 2048 && (
          <p className="text-xs text-destructive mt-1">La URL es demasiado larga (máximo 2048 caracteres)</p>
        )}
        {data.demoUrl && data.demoUrl.trim() && !/^https?:\/\/.+/.test(data.demoUrl.trim()) && data.demoUrl.length <= 2048 && (
          <p className="text-xs text-destructive mt-1">La URL debe comenzar con http:// o https://</p>
        )}
        {data.demoUrl && /javascript:|data:|vbscript:|<script/i.test(data.demoUrl) && (
          <p className="text-xs text-destructive mt-1">La URL contiene contenido no permitido</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{MICROCOPYS.demoUrl.help}</p>

        {previewLoading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando portada automática desde el enlace...
          </div>
        )}

        {data.coverImageUrl && (
          <div className="mt-3 overflow-hidden rounded-lg border border-border/80 bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.coverImageUrl}
              alt="Preview de portada del MVP"
              className="h-36 w-full object-cover"
            />
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Portada detectada automáticamente desde el enlace.
              </p>
            </div>
          </div>
        )}

        {previewError && !previewLoading && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">{previewError}</p>
            {onRetryPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onRetryPreview}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Reintentar preview
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Campo 5: Imágenes y videos */}
      <div>
        <Label>Imágenes y videos del MVP</Label>
        <div className="space-y-3 mt-2">
          {(data.screenshots?.length || 0) < MAX_MEDIA && (
            <label className="cursor-pointer block">
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Subiendo archivos...' : 'Seleccionar imágenes o videos'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleMediaUpload}
                disabled={uploading}
              />
            </label>
          )}

          {data.screenshots && data.screenshots.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {data.screenshots.map((url, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  {isVideo(url) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                      <PlayCircle className="h-8 w-8 text-white" />
                      <span className="text-xs text-white/70 mt-1">Video</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleScreenshotRemove(index)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-black/50 rounded text-xs text-white px-1">
                    {index + 1}
                  </span>
                </div>
              ))}
              {uploading && (
                <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          {fileSizeError && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-md text-xs">
              {fileSizeError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Imágenes y videos • mín. {MIN_MEDIA}, máx. {MAX_MEDIA} archivos
            </p>
            <span className={`text-xs font-medium ${(data.screenshots?.length || 0) < MIN_MEDIA ? 'text-amber-600' : 'text-emerald-600'}`}>
              {data.screenshots?.length || 0}/{MAX_MEDIA}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Nota: Las imágenes o videos no deben sobrepasar {MAX_FILE_SIZE_MB} MB por archivo
          </p>
          {(data.screenshots?.length || 0) > 0 && (data.screenshots?.length || 0) < MIN_MEDIA && (
            <p className="text-xs text-amber-600">
              Agrega {MIN_MEDIA - (data.screenshots?.length || 0)} archivo(s) más para cumplir el mínimo
            </p>
          )}
        </div>
      </div>

      {/* Campo 6: Modelo de monetización */}
      <div>
        <Label htmlFor="monetizationModel">{MICROCOPYS.monetizationModel.label}</Label>
        <Select
          value={data.monetizationModel}
          onValueChange={(value) => onChange({ ...data, monetizationModel: value as MonetizationModel })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Selecciona un modelo" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MonetizationModelLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">{MICROCOPYS.monetizationModel.help}</p>
      </div>

      {/* Campo 7: Evidencia mínima */}
      <div>
        <Label htmlFor="minimalEvidence">{MICROCOPYS.minimalEvidence.label}</Label>
        <Textarea
          id="minimalEvidence"
          placeholder={MICROCOPYS.minimalEvidence.placeholder}
          value={data.minimalEvidence || ''}
          onChange={(e) => onChange({ ...data, minimalEvidence: e.target.value })}
          rows={4}
            className="mt-1.5 break-words whitespace-pre-wrap"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-sm text-muted-foreground">{MICROCOPYS.minimalEvidence.help}</p>
            <span className="text-xs text-ink-300">
              {wordCount(data.minimalEvidence || '')}/{MAX_MINIMAL_EVIDENCE_WORDS} palabras • ≈{MAX_MINIMAL_EVIDENCE_WORDS * APPROX_CHARS_PER_WORD} caracteres
            </span>
          </div>
          {data.minimalEvidence && wordCount(data.minimalEvidence || '') > MAX_MINIMAL_EVIDENCE_WORDS && (
            <p className="text-xs text-destructive mt-1">La evidencia mínima excede el máximo de {MAX_MINIMAL_EVIDENCE_WORDS} palabras (≈{MAX_MINIMAL_EVIDENCE_WORDS * APPROX_CHARS_PER_WORD} caracteres)</p>
          )}
      </div>

      {/* Campo 8: Diferencial competitivo */}
      <div>
        <Label>{MICROCOPYS.competitiveDifferentials.label}</Label>
        <div className="space-y-2 mt-1.5">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <Input
                placeholder={`Diferencial ${index + 1}: ${MICROCOPYS.competitiveDifferentials.placeholder}`}
                value={differentialInputs[index] || ''}
                onChange={(e) => handleDifferentialChange(index, e.target.value)}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-ink-300">{(differentialInputs[index]?.length || 0)}/{MAX_DIFFERENTIAL} caracteres</span>
              </div>
              {differentialInputs[index] && differentialInputs[index].length > MAX_DIFFERENTIAL && (
                <p className="text-xs text-destructive mt-1">El diferencial excede el máximo de {MAX_DIFFERENTIAL} caracteres</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{MICROCOPYS.competitiveDifferentials.help}</p>
      </div>

      {/* Campo 9: Deal y Precio */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="dealModality">{MICROCOPYS.dealModality.label}</Label>
          <Select
            value={data.dealModality}
            onValueChange={(value) => onChange({ ...data, dealModality: value as DealModality })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecciona modalidad" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DealModalityLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">{MICROCOPYS.dealModality.help}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minPrice">Precio mínimo (USD)</Label>
            <Input
              id="minPrice"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 2000"
              value={data.minPrice ? data.minPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, '')
                if (value === '' || /^\d+$/.test(value)) {
                  onChange({ ...data, minPrice: value === '' ? undefined : Number(value) })
                }
              }}
              className={`mt-1.5 ${
                data.minPrice && data.maxPrice && data.minPrice >= data.maxPrice
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
            />
            {data.minPrice && data.maxPrice && data.minPrice >= data.maxPrice && (
              <p className="text-xs text-destructive mt-1">Debe ser menor que el precio máximo</p>
            )}
          </div>

          <div>
            <Label htmlFor="maxPrice">Precio máximo (USD)</Label>
            <Input
              id="maxPrice"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 5000"
              value={data.maxPrice ? data.maxPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, '')
                if (value === '' || /^\d+$/.test(value)) {
                  onChange({ ...data, maxPrice: value === '' ? undefined : Number(value) })
                }
              }}
              className={`mt-1.5 ${
                (data.minPrice && data.maxPrice && (
                  data.maxPrice <= data.minPrice ||
                  (data.maxPrice - data.minPrice) < 100
                ))
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
            />
            {data.minPrice && data.maxPrice && data.maxPrice <= data.minPrice && (
              <p className="text-xs text-destructive mt-1">Debe ser mayor que el precio mínimo</p>
            )}
            {data.minPrice && data.maxPrice && data.maxPrice > data.minPrice && (data.maxPrice - data.minPrice) < 100 && (
              <p className="text-xs text-destructive mt-1">Debe haber al menos $100 de diferencia</p>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Ingresa solo números. El formato se agregará automáticamente.</p>
      </div>

      {/* Campo 10: Checklist de transferencia */}
      <div>
        <Label>{MICROCOPYS.transferChecklist.label}</Label>
        <div className="space-y-3 mt-3">
          {(Object.entries(MICROCOPYS.transferChecklist.items) as [TransferChecklistKey, string][]).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={data.transferChecklist?.[key] || false}
                onCheckedChange={(checked) => onChange({
                  ...data,
                  transferChecklist: {
                    ...data.transferChecklist,
                    codeAndDocs: data.transferChecklist?.codeAndDocs || false,
                    domainOrLanding: data.transferChecklist?.domainOrLanding || false,
                    integrationAccounts: data.transferChecklist?.integrationAccounts || false,
                    ownIp: data.transferChecklist?.ownIp || false,
                    [key]: checked === true
                  }
                })}
              />
              <label
                htmlFor={key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{MICROCOPYS.transferChecklist.help}</p>
      </div>
    </div>
  )
}
