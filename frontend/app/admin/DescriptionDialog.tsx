'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DescriptionDialog({ description }: { description: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <details>
        <summary className="cursor-pointer list-none" onClick={(e) => { e.preventDefault(); setOpen(true) }}>
          <p className="line-clamp-4 whitespace-pre-wrap">{description}</p>
          <span className="mt-1 inline-block text-xs text-primary hover:underline">Mostrar más</span>
        </summary>
      </details>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Descripción completa</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {description}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
