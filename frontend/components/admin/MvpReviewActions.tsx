"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  mvpId: string
}

export function MvpReviewActions({ mvpId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [openReject, setOpenReject] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/admin/review/${mvpId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "No se pudo aprobar")

      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  async function reject() {
    try {
      const trimmed = reason.trim()
      if (!trimmed) {
        setError("Debes escribir el motivo del rechazo.")
        return
      }

      setLoading(true)
      setError(null)

      const res = await fetch(`/admin/review/${mvpId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "reject", reason: trimmed }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "No se pudo rechazar")

      setOpenReject(false)
      setReason("")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={loading}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
        >
          Aprobar
        </button>

        <button
          onClick={() => {
            setError(null)
            setOpenReject(true)
          }}
          disabled={loading}
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {openReject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-4 shadow-lg">
            <h3 className="text-sm font-semibold">Motivo del rechazo</h3>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Escribe el motivo..."
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setOpenReject(false)}
                disabled={loading}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={reject}
                disabled={loading}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs text-white hover:bg-rose-700 disabled:opacity-60"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}