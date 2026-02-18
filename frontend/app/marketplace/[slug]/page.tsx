import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getMVP } from '@/app/actions/mvp'
import { recordMvpUniqueView, getMvpViewsCount } from '@/app/actions/mvpViews'
import { Navbar } from '@/components/navbar'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: {
    slug: string
  }
}

export default async function MVPDetailPage({ params }: PageProps) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const { slug } = params
  const { success, data: mvp, error } = await getMVP(slug)

  if (!success || !mvp) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isAuthenticated={true} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="text-muted-foreground">{error || 'MVP no encontrado'}</p>
            <Link href="/marketplace">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Registrar vista única (1 por usuario por MVP)
  await recordMvpUniqueView(mvp.id)

  // Obtener total de visualizaciones
  const viewsRes = await getMvpViewsCount(mvp.id)
  const viewsCount = viewsRes.ok ? viewsRes.count : 0

  const tags = Array.isArray(mvp.competitive_differentials)
    ? mvp.competitive_differentials
    : []

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/marketplace">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Marketplace
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{mvp.category || 'Sin categoría'}</p>
              <h1 className="text-3xl font-bold">{mvp.title}</h1>
              {mvp.one_liner && (
                <p className="text-lg text-muted-foreground mt-2">{mvp.one_liner}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {viewsCount} visualizaciones
              </p>
            </div>
            {mvp.deal_modality && (
              <Badge className="h-fit text-lg px-3 py-1">{mvp.deal_modality}</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del MVP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="text-sm">{mvp.description || 'Sin descripción'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Precio</p>
                  <p className="font-semibold">{mvp.price_range || (mvp.price ? `$${mvp.price}` : 'N/D')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-semibold text-green-600">{mvp.status}</p>
                </div>
              </div>

              {mvp.demo_url && (
                <div>
                  <p className="text-sm text-muted-foreground">Demo URL</p>
                  <a href={mvp.demo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {mvp.demo_url}
                  </a>
                </div>
              )}

              {tags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Diferenciales Competitivos</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mvp.minimal_evidence && (
                <div>
                  <p className="text-sm text-muted-foreground">Evidencia Mínima</p>
                  <p className="text-sm">{mvp.minimal_evidence}</p>
                </div>
              )}

              {mvp.screenshots && mvp.screenshots.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Capturas de Pantalla</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {mvp.screenshots.map((url: string, index: number) => (
                      <img key={index} src={url} alt={`Screenshot ${index + 1}`} className="w-full h-24 object-cover rounded" />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Publicado por</p>
                <p className="text-sm">{mvp.user_email || 'Usuario desconocido'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button size="lg">
            Contactar al Vendedor
          </Button>
        </div>
      </div>
    </div>
  )
}
