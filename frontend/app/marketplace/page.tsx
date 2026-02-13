import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getPublicMvps } from '@/app/actions/mvp'
import { Navbar } from '@/components/navbar'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MarketplaceClient } from './MarketplaceClient'

interface MarketplacePageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

function getSearchParam(
  searchParams: MarketplacePageProps['searchParams'],
  key: string
) {
  const value = searchParams?.[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const searchParamsResolved = await searchParams

  const q = getSearchParam(searchParamsResolved, 'q')
  const dealModality = getSearchParam(searchParamsResolved, 'deal_modality')
  const sort = getSearchParam(searchParamsResolved, 'sort')
  const priceMinRaw = getSearchParam(searchParamsResolved, 'price_min')
  const priceMaxRaw = getSearchParam(searchParamsResolved, 'price_max')
  const publishedFrom = getSearchParam(searchParamsResolved, 'published_from')
  const publishedTo = getSearchParam(searchParamsResolved, 'published_to')
  const pageRaw = getSearchParam(searchParamsResolved, 'page')

  const priceMin = priceMinRaw ? Number(priceMinRaw) : undefined
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : undefined
  const page = pageRaw ? Number(pageRaw) : 1

  const { data: mvps = [] } = await getPublicMvps({
    status: 'approved',
    q: q || undefined,
    dealModality: dealModality || undefined,
    sort: (sort as 'recent' | 'oldest' | 'price_low' | 'price_high') || 'recent',
    priceMin: Number.isNaN(priceMin as number) ? undefined : priceMin,
    priceMax: Number.isNaN(priceMax as number) ? undefined : priceMax,
    publishedFrom: publishedFrom || undefined,
    publishedTo: publishedTo || undefined,
    limit: 24,
    offset: page > 1 ? (page - 1) * 24 : undefined
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

        <MarketplaceClient
          initialMvps={mvps}
          initialFilters={{
            q: q || '',
            dealModality: dealModality || '',
            sort: (sort as 'recent' | 'oldest' | 'price_low' | 'price_high') || 'recent',
            priceMin: priceMinRaw || '',
            priceMax: priceMaxRaw || '',
            publishedFrom: publishedFrom || '',
            publishedTo: publishedTo || '',
            page: page,
            limit: 24
          }}
        />
      </div>
    </div>
  )
}
