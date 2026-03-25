"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function UnbanButton({ email }: { email: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUnban() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/admin/unban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al restaurar')
      setOpen(false); router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally { setLoading(false) }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-green-600 bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-600 hover:border-green-700 hover:text-white transition-all hover:scale-105">
        <RotateCcw className="w-3.5 h-3.5" /> Restaurar correo
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <RotateCcw className="w-5 h-5" /> Restaurar correo
          </DialogTitle>
          <DialogDescription className="text-sm">
            El correo <strong>{email}</strong> volverá a estar disponible para registro.
          </DialogDescription>
          <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
            <p className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <strong>La cuenta original no se recupera.</strong></p>
            <p>• Solo se elimina el correo de la lista negra.</p>
            <p>• El usuario podrá crear una cuenta nueva con este correo.</p>
            <p>• Los MVPs eliminados no se restauran.</p>
          </div>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleUnban} disabled={loading}>
              {loading ? 'Restaurando...' : 'Sí, restaurar correo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
