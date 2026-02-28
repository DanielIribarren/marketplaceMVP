import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNavbar } from '@/components/AdminNavBar'


const ADMIN_EMAIL = 'admin123@correo.unimet.edu.ve'

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const loggedEmail = user.email?.toLowerCase() ?? ''
  if (loggedEmail !== ADMIN_EMAIL) {
    redirect('/marketplace')
  }

  return (
    <>
      <AdminNavbar />
        <main className="mx-auto w-full max-w-7xl p-6">
        <header className="mb-6">
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="mt-1 text-sm text-muted-foreground">
            Gestiona el estado de los MVPs (pendiente, aprobado, rechazado).
            </p>
        </header>

        <section className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Moderación de MVPs</h2>
            <p className="mt-2 text-sm text-muted-foreground">
            En el siguiente commit conectaremos este panel con Supabase para listar y moderar MVPs.
            </p>
        </section>
        </main>
    </>
  )
}