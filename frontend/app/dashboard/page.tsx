import { redirect } from 'next/navigation'
import { getUser, getUserRole, logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const user = await getUser()
  const role = await getUserRole()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Marketplace MVP</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">
                {user.email}
                {role === 'admin' && (
                  <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                    Admin
                  </span>
                )}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Cerrar Sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Bienvenido al Dashboard
          </h2>
          <p className="text-gray-300">
            {role === 'admin' 
              ? 'Panel de administración del marketplace'
              : 'Gestiona tus proyectos y explora nuevas oportunidades'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Mis Proyectos</h3>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-2">0</p>
            <p className="text-gray-400 text-sm">Proyectos publicados</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Favoritos</h3>
              <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-2">0</p>
            <p className="text-gray-400 text-sm">Proyectos guardados</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Reuniones</h3>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-2">0</p>
            <p className="text-gray-400 text-sm">Reuniones agendadas</p>
          </div>
        </div>

        {role === 'admin' && (
          <div className="mt-8">
            <div className="bg-purple-500/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">Panel de Administración</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-1">Proyectos pendientes</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-1">Usuarios registrados</p>
                  <p className="text-2xl font-bold text-white">1</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
              Publicar Proyecto
            </button>
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition border border-white/20">
              Explorar Marketplace
            </button>
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition border border-white/20">
              Mi Perfil
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
