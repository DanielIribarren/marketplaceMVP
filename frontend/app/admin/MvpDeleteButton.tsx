"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type Props = { mvpId: string; mvpTitle: string }

export function MvpDeleteButton({ mvpId, mvpTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/admin/delete-mvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mvpId })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al eliminar')
      setOpen(false); router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally { setLoading(false) }
  }

  return (
    <>
      <button type="button" onClick={() => { setError(null); setOpen(true) }}
        className="flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-600 hover:border-rose-700 hover:text-white transition-all hover:scale-105">
        <Trash2 className="w-3.5 h-3.5" /> Eliminar MVP
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5" /> Eliminar MVP aprobado
          </DialogTitle>
          <DialogDescription className="text-sm">
            Estás a punto de eliminar <strong>&ldquo;{mvpTitle}&rdquo;</strong> de la plataforma.
          </DialogDescription>
          <div className="mt-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 space-y-1">
            <p>⚠️ Esta acción es <strong>irreversible</strong>.</p>
            <p>• Se eliminará del marketplace y de los MVPs del creador.</p>
            <p>• Las reuniones y ofertas asociadas también se perderán.</p>
          </div>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={loading}>
              {loading ? 'Eliminando...' : 'Sí, eliminar MVP'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
