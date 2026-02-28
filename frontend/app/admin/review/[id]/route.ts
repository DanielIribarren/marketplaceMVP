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

    return NextResponse.json({ ok: true, status: "rejected" })
  }

  return NextResponse.json({ error: "Decisión inválida. Usa 'approve' o 'reject'." }, { status: 400 })
}