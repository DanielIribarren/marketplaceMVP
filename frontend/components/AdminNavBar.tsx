import Link from 'next/link'
import { logout } from '@/app/actions/auth'

export function AdminNavbar() {
  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-brand-400 via-brand-500 to-brand-700 text-primary-foreground flex items-center justify-center shadow-sm shadow-brand-500/35">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="font-bold text-xl tracking-tight">
              MVP<span className="text-primary">Market</span>
            </span>
          </Link>
          <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
            Panel de Administración
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Marketplace
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}