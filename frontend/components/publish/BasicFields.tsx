'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus } from 'lucide-react'
import { MICROCOPYS, MonetizationModel, DealModality, MonetizationModelLabels, DealModalityLabels } from '@/lib/types/mvp-publication'
import type { MVPPublication } from '@/lib/types/mvp-publication'

interface BasicFieldsProps {
  data: Partial<MVPPublication>
  onChange: (data: Partial<MVPPublication>) => void
}

type TransferChecklistKey = 'codeAndDocs' | 'domainOrLanding' | 'integrationAccounts' | 'ownIp'

export function BasicFields({ data, onChange }: BasicFieldsProps) {
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
        <p className="text-sm text-gray-500 mt-1">{MICROCOPYS.name.help}</p>
      </div>

      {/* Campo 2: One-liner */}
      <div>
        <Label htmlFor="oneLiner">{MICROCOPYS.oneLiner.label}</Label>
        <Input
          id="oneLiner"
          placeholder={MICROCOPYS.oneLiner.placeholder}
          value={data.oneLiner || ''}
          onChange={(e) => onChange({ ...data, oneLiner: e.target.value })}
          maxLength={120}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-gray-500">{MICROCOPYS.oneLiner.help}</p>
          <span className="text-xs text-gray-400">
            {data.oneLiner?.length || 0}/120
          </span>
        </div>
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
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-gray-500">{MICROCOPYS.description.help}</p>
          <span className="text-xs text-gray-400">
            {wordCount(data.description || '')} palabras
          </span>
        </div>
      </div>

      {/* Campo 4: Demo URL */}
      <div>
        <Label htmlFor="demoUrl">{MICROCOPYS.demoUrl.label}</Label>
        <Input
          id="demoUrl"
          type="url"
          placeholder={MICROCOPYS.demoUrl.placeholder}
          value={data.demoUrl || ''}
          onChange={(e) => onChange({ ...data, demoUrl: e.target.value })}
        />
        <p className="text-sm text-gray-500 mt-1">{MICROCOPYS.demoUrl.help}</p>
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
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
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
        <p className="text-sm text-gray-500 mt-1">
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
        <p className="text-sm text-gray-500 mt-1">{MICROCOPYS.monetizationModel.help}</p>
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
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-gray-500">{MICROCOPYS.minimalEvidence.help}</p>
          <span className="text-xs text-gray-400">
            {wordCount(data.minimalEvidence || '')} palabras
          </span>
        </div>
      </div>

      {/* Campo 8: Diferencial competitivo */}
      <div>
        <Label>{MICROCOPYS.competitiveDifferentials.label}</Label>
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Input
              key={index}
              placeholder={`Diferencial ${index + 1}: ${MICROCOPYS.competitiveDifferentials.placeholder}`}
              value={differentialInputs[index] || ''}
              onChange={(e) => handleDifferentialChange(index, e.target.value)}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-1">{MICROCOPYS.competitiveDifferentials.help}</p>
      </div>

      {/* Campo 9: Deal y Precio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <p className="text-sm text-gray-500 mt-1">{MICROCOPYS.dealModality.help}</p>
        </div>

        <div>
          <Label htmlFor="priceRange">{MICROCOPYS.priceRange.label}</Label>
          <Input
            id="priceRange"
            placeholder={MICROCOPYS.priceRange.placeholder}
            value={data.priceRange || ''}
            onChange={(e) => onChange({ ...data, priceRange: e.target.value })}
          />
          <p className="text-sm text-gray-500 mt-1">{MICROCOPYS.priceRange.help}</p>
        </div>
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
        <p className="text-sm text-gray-500 mt-2">{MICROCOPYS.transferChecklist.help}</p>
      </div>
    </div>
  )
}