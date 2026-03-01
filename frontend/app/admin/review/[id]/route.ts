import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "admin123@correo.unimet.edu.ve"

type ReviewBody = {
  decision?: "approve" | "reject"
  reason?: string
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient()
  const { id } = await Promise.resolve(context.params)

  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 })
  }

  let body: ReviewBody
  try {
    body = (await req.json()) as ReviewBody
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 })
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  async function notifyOwner(decision: "approved" | "rejected", reason?: string) {
    if (!token) return
    try {
      await fetch(`${backendUrl}/api/admin/mvp/${id}/notify-decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision, reason }),
      })
    } catch {
      // notificación no bloquea la decisión
    }
  }

  if (body.decision === "approve") {
    const { error } = await supabase
      .from("mvps")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", id)
      .eq("status", "pending_review")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await notifyOwner("approved")
    return NextResponse.json({ ok: true, status: "approved" })
  }

  if (body.decision === "reject") {
    const reason = body.reason?.trim() ?? ""
    if (!reason) {
      return NextResponse.json({ error: "Debes indicar el motivo del rechazo." }, { status: 400 })
    }

    const { error } = await supabase
      .from("mvps")
      .update({
        status: "rejected",
        rejection_reason: reason,
        approved_by: null,
        approved_at: null,
      })
      .eq("id", id)
      .eq("status", "pending_review")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await notifyOwner("rejected", reason)
    return NextResponse.json({ ok: true, status: "rejected" })
  }

  return NextResponse.json({ error: "Decisión inválida. Usa 'approve' o 'reject'." }, { status: 400 })
}