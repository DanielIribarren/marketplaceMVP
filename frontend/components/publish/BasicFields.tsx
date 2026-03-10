'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Loader2, RefreshCw } from 'lucide-react'
import { MICROCOPYS, MonetizationModel, DealModality, MonetizationModelLabels, DealModalityLabels } from '@/lib/types/mvp-publication'
import type { MVPPublication } from '@/lib/types/mvp-publication'

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
  const [screenshotInput, setScreenshotInput] = useState('')
  const [differentialInputs, setDifferentialInputs] = useState(
    data.competitiveDifferentials || ['', '', '']
  )

  const handleScreenshotAdd = () => {
    if (screenshotInput.trim() && (!data.screenshots || data.screenshots.length < 3)) {
      onChange({
        ...data,
        screenshots: [...(data.screenshots || []), screenshotInput.trim()]
      })
      setScreenshotInput('')
    }
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
    onChange({
      ...data,
      competitiveDifferentials: newDifferentials
    })
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Campo 1: Nombre del MVP */}
      <div>
        <Label htmlFor="name">{MICROCOPYS.name.label}</Label>
        <Input
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

      {/* Campo 3: Descripción */}
      <div>
        <Label htmlFor="description">{MICROCOPYS.description.label}</Label>
        <Textarea
          id="description"
          placeholder={MICROCOPYS.description.placeholder}
          value={data.description || ''}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={6}
          className="break-words whitespace-pre-wrap"
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
          className={
            data.demoUrl &&
            data.demoUrl.trim() &&
            (data.demoUrl.length > 2048 ||
              !/^https?:\/\/.+/.test(data.demoUrl.trim()) ||
              /javascript:|data:|vbscript:|<script/i.test(data.demoUrl))
              ? 'border-destructive focus-visible:ring-destructive'
              : ''
          }
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

      {/* Campo 5: Screenshots */}
      <div>
        <Label>{MICROCOPYS.screenshots.label}</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder={MICROCOPYS.screenshots.placeholder}
              value={screenshotInput}
              onChange={(e) => setScreenshotInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleScreenshotAdd())}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleScreenshotAdd}
              disabled={!screenshotInput.trim() || (data.screenshots?.length || 0) >= 3}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {data.screenshots && data.screenshots.length > 0 && (
            <div className="space-y-2">
              {data.screenshots.map((url, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-brand-50 rounded">
                  <span className="text-sm flex-1 truncate">{url}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleScreenshotRemove(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {MICROCOPYS.screenshots.help} ({data.screenshots?.length || 0}/3)
        </p>
      </div>

      {/* Campo 6: Modelo de monetización */}
      <div>
        <Label htmlFor="monetizationModel">{MICROCOPYS.monetizationModel.label}</Label>
        <Select
          value={data.monetizationModel}
          onValueChange={(value) => onChange({ ...data, monetizationModel: value as MonetizationModel })}
        >
          <SelectTrigger>
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
            className="break-words whitespace-pre-wrap"
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
        <div className="space-y-2">
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
            <SelectTrigger>
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
              className={
                data.minPrice && data.maxPrice && data.minPrice >= data.maxPrice
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }
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
              className={
                (data.minPrice && data.maxPrice && (
                  data.maxPrice <= data.minPrice ||
                  (data.maxPrice - data.minPrice) < 100
                ))
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }
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
        <div className="space-y-3 mt-2">
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
