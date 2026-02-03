import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getPublicMvps } from '@/app/actions/mvp'
import { Navbar } from '@/components/navbar'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function MarketplacePage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: mvps = [] } = await getPublicMvps({
    status: 'approved',
    sort: 'recent',
    limit: 24
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Marketplace</h1>
            <p className="text-muted-foreground">Explora, compara y encuentra el MVP ideal.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/publish">
              <Button size="lg">Publicar MVP</Button>
            </Link>
          </div>
        </div>
        
        {mvps.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">
              Aún no hay MVPs aprobados para mostrar.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mvps.map((mvp: any) => {
              const tags = Array.isArray(mvp.competitive_differentials)
                ? mvp.competitive_differentials
                : []

              return (
                <Card key={mvp.id} className="border-2 hover:border-primary transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{mvp.category || 'Sin categoría'}</p>
                        <h3 className="text-lg font-semibold">{mvp.title}</h3>
                        {mvp.one_liner && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{mvp.one_liner}</p>
                        )}
                      </div>
                      {mvp.deal_modality && (
                        <Badge className="h-fit">{mvp.deal_modality}</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Precio</p>
                        <p className="font-semibold">{mvp.price_range || (mvp.price ? `$${mvp.price}` : 'N/D')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estado</p>
                        <p className="font-semibold text-green-600">{mvp.status}</p>
                      </div>
                    </div>

                    <Link href={`/mvps/${mvp.id}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        Ver detalles
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
