import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotificationEmail } from "@/lib/email"

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
  const adminSupabase = createAdminClient()
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

  async function notifyOwner(ownerId: string, mvpTitle: string, decision: "approved" | "rejected", reason?: string) {
    const isApproved = decision === "approved"
    const notification = {
      type: isApproved ? "mvp_approved" : "mvp_rejected",
      title: isApproved ? "MVP aprobado" : "MVP rechazado",
      message: isApproved
        ? `Tu MVP "${mvpTitle}" fue aprobado y ya está visible en el marketplace.`
        : `Tu MVP "${mvpTitle}" fue rechazado. Motivo: ${reason || "Sin motivo especificado"}.`,
      data: { mvp_id: id, href: "/publish" },
    }
    try {
      await adminSupabase.from("notifications").insert({ ...notification, user_id: ownerId, read: false })
    } catch { /* silent */ }
    try {
      const { data } = await adminSupabase.auth.admin.getUserById(ownerId)
      const email = data?.user?.email
      if (email) sendNotificationEmail(email, notification).catch(() => {})
    } catch { /* silent */ }
  }

  if (body.decision === "approve") {
    const { data: mvp } = await adminSupabase.from("mvps").select("owner_id, title").eq("id", id).single()

    const { error } = await adminSupabase
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

    if (mvp) await notifyOwner(mvp.owner_id, mvp.title, "approved")
    return NextResponse.json({ ok: true, status: "approved" })
  }

  if (body.decision === "reject") {
    const reason = body.reason?.trim() ?? ""
    if (!reason) {
      return NextResponse.json({ error: "Debes indicar el motivo del rechazo." }, { status: 400 })
    }

    const { data: mvp } = await adminSupabase.from("mvps").select("owner_id, title").eq("id", id).single()

    const { error } = await adminSupabase
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

    if (mvp) await notifyOwner(mvp.owner_id, mvp.title, "rejected", reason)
    return NextResponse.json({ ok: true, status: "rejected" })
  }

  return NextResponse.json({ error: "Decisión inválida. Usa 'approve' o 'reject'." }, { status: 400 })
}
