"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type Props = { userId: string; userEmail: string; userName: string }

export function UserDeleteButton({ userId, userEmail, userName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail, reason: 'Actividad sospechosa' })
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
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-600 hover:border-rose-700 hover:text-white transition-all hover:scale-105">
        <Trash2 className="w-3.5 h-3.5" /> Eliminar cuenta
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5" /> Eliminar cuenta de usuario
          </DialogTitle>
          <DialogDescription className="text-sm">
            Estás a punto de eliminar la cuenta de <strong>{userName}</strong> ({userEmail}).
          </DialogDescription>
          <div className="mt-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 space-y-1">
            <p>⚠️ Esta acción es <strong>irreversible</strong>.</p>
            <p>• Se eliminará la cuenta permanentemente.</p>
            <p>• El correo <strong>{userEmail}</strong> quedará en lista negra.</p>
            <p>• El usuario no podrá volver a registrarse con este correo.</p>
          </div>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={loading}>
              {loading ? 'Eliminando...' : 'Sí, eliminar cuenta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
