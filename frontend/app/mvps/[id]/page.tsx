'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMvpDetails } from '@/app/actions/mvp'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ExternalLink, MessageCircle, Star, Eye, Heart, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface MVP {
id: string
title: string
slug: string
one_liner: string
description: string
short_description?: string
category?: string
deal_modality?: string
price_range?: string
price?: number
competitive_differentials?: string[]
cover_image_url?: string
images_urls?: string[]
video_url?: string
demo_url?: string
repository_url?: string
documentation_url?: string
tech_stack?: string[]
features?: string[]
metrics?: Record<string, unknown>
views_count?: number
favorites_count?: number
status?: string
published_at?: string
created_at?: string
avg_rating?: number
evaluations_count?: number
user_profiles?: {
display_name?: string
avatar_url?: string
company?: string
bio?: string
}
}

export default function MVPDetailsPage() {
const params = useParams()
const router = useRouter()
const [mvp, setMvp] = useState<MVP | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

// Función para validar URLs
const isValidUrl = (url: string): boolean => {
if (!url || url.trim() === '') return false
try {
new URL(url)
return true
} catch {
return false
}
}

const handleImageError = (imageUrl: string) => {
setImageErrors((prev) => new Set(prev).add(imageUrl))
}

useEffect(() => {
const fetchMVPDetails = async () => {
try {
setLoading(true)
const result = await getMvpDetails(params.id as string)

if (result.success && result.data) {
setMvp(result.data)
} else {
setError(result.error || 'No se pudo cargar el MVP')
}
} catch (err) {
setError((err instanceof Error ? err.message : 'Error al cargar los detalles'))
} finally {
setLoading(false)
}
}

fetchMVPDetails()
}, [params.id])

if (loading) {
return (
<div className="min-h-screen bg-background">
<Navbar isAuthenticated={true} />
<div className="flex items-center justify-center min-h-[60vh]">
<Loader2 className="w-8 h-8 animate-spin text-primary" />
</div>
</div>
)
}

if (error || !mvp) {
return (
<div className="min-h-screen bg-background">
<Navbar isAuthenticated={true} />
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
<Button
onClick={() => router.back()}
variant="outline"
className="mb-6"
>
<ArrowLeft className="w-4 h-4 mr-2" />
Volver
</Button>
<div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
<p className="text-gray-500 text-lg">
{error || 'MVP no encontrado'}
</p>
</div>
</div>
</div>
)
}

return (
<div className="min-h-screen bg-background">
<Navbar isAuthenticated={true} />

<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
{/* Header */}
<div className="flex items-start justify-between mb-8">
<div className="flex items-center gap-4">
<Button
onClick={() => router.back()}
variant="outline"
size="icon"
className="h-10 w-10"
>
<ArrowLeft className="w-5 h-5" />
</Button>
<div>
<h1 className="text-4xl font-bold mb-2">{mvp.title}</h1>
<p className="text-lg text-muted-foreground">{mvp.one_liner}</p>
</div>
</div>
{mvp.deal_modality && (
<Badge className="h-fit text-base px-4 py-2">
{mvp.deal_modality}
</Badge>
)}
</div>

<div className="grid gap-6 lg:grid-cols-3">
{/* Main Content */}
<div className="lg:col-span-2 space-y-6">
{/* Cover Image */}
{mvp.cover_image_url && isValidUrl(mvp.cover_image_url) && !imageErrors.has(mvp.cover_image_url) && (
<Card className="border-2 overflow-hidden">
<div className="relative w-full h-96 bg-gray-100">
<Image
src={mvp.cover_image_url}
alt={mvp.title}
fill
className="object-cover"
onError={() => handleImageError(mvp.cover_image_url!)}
/>
</div>
</Card>
)}
{mvp.cover_image_url && (!isValidUrl(mvp.cover_image_url) || imageErrors.has(mvp.cover_image_url)) && (
<Card className="border-2 overflow-hidden">
<div className="relative w-full h-96 bg-gray-100 flex items-center justify-center">
<p className="text-muted-foreground text-sm">URL de imagen inválida</p>
</div>
</Card>
)}

{/* Description */}
<Card className="border-2">
<CardContent className="p-6">
<h2 className="text-2xl font-semibold mb-4">Descripción</h2>
{mvp.description ? (
<p className="text-muted-foreground whitespace-pre-wrap">
{mvp.description}
</p>
) : (
<p className="text-muted-foreground italic">
No hay descripción disponible para este MVP
</p>
)}
</CardContent>
</Card>

{/* Images Gallery */}
<Card className="border-2">
<CardContent className="p-6">
<h2 className="text-2xl font-semibold mb-4">Galería</h2>
{mvp.images_urls && mvp.images_urls.length > 0 ? (
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
{mvp.images_urls.map((imageUrl, index) => {
const isValid = isValidUrl(imageUrl)
const hasError = imageErrors.has(imageUrl)

return (
<div
key={index}
className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
>
{isValid && !hasError ? (
<Image
src={imageUrl}
alt={`${mvp.title} - ${index + 1}`}
fill
className="object-cover hover:scale-105 transition-transform"
onError={() => handleImageError(imageUrl)}
/>
) : (
<p className="text-muted-foreground text-xs text-center px-2">
URL de imagen inválida
</p>
)}
</div>
)
})}
</div>
) : (
<p className="text-muted-foreground italic">
No hay imágenes disponibles para este MVP
</p>
)}
</CardContent>
</Card>

{/* Competitive Differentials */}
<Card className="border-2">
<CardContent className="p-6">
<h2 className="text-2xl font-semibold mb-4">
Diferenciales Competitivos
</h2>
{mvp.competitive_differentials && mvp.competitive_differentials.length > 0 && mvp.competitive_differentials.some(diff => diff && diff.trim() !== '') ? (
<div className="flex flex-wrap gap-3">
{mvp.competitive_differentials
.filter((diff) => diff && diff.trim() !== '')
.map((diff, index) => (
<Badge
key={`${diff}-${index}`}
variant="outline"
className="px-4 py-2 text-sm"
>
{diff}
</Badge>
))}
</div>
) : (
<p className="text-muted-foreground italic">
No se han definido diferenciales competitivos para este MVP
</p>
)}
</CardContent>
</Card>

{/* Tech Stack */}
{mvp.tech_stack && mvp.tech_stack.length > 0 && (
<Card className="border-2">
<CardContent className="p-6">
<h2 className="text-2xl font-semibold mb-4">Tecnologías</h2>
<div className="flex flex-wrap gap-2">
{mvp.tech_stack.map((tech, index) => (
<Badge key={index} variant="secondary" className="px-3 py-1">
{tech}
</Badge>
))}
</div>
</CardContent>
</Card>
)}

{/* Features */}
{mvp.features && mvp.features.length > 0 && (
<Card className="border-2">
<CardContent className="p-6">
<h2 className="text-2xl font-semibold mb-4">Características Principales</h2>
<ul className="space-y-2">
{mvp.features.map((feature, index) => (
<li key={index} className="flex items-start gap-2">
<div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
<span className="text-muted-foreground">{feature}</span>
</li>
))}
</ul>
</CardContent>
</Card>
)}

{/* Metrics */}
{mvp.metrics && typeof mvp.metrics === 'object' && Object.keys(mvp.metrics).length > 0 && (
<Card className="border-2">
<CardContent className="p-6">
<h2 className="text-2xl font-semibold mb-4">Métricas</h2>
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
{Object.entries(mvp.metrics as Record<string, unknown>).map(([key, value]) => (
<div key={key} className="text-center">
<p className="text-2xl font-bold text-primary">{String(value)}</p>
<p className="text-sm text-muted-foreground capitalize">
{key.replace(/_/g, ' ')}
</p>
</div>
))}
</div>
</CardContent>
</Card>
)}
</div>

{/* Sidebar */}
<div className="space-y-6">
  {/* Ratings and Stats */}
  {(mvp.avg_rating || mvp.views_count || mvp.favorites_count) && (
    <Card className="border-2">
      <CardContent className="p-6 space-y-4">
        {mvp.avg_rating && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{mvp.avg_rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({mvp.evaluations_count || 0} reseñas)
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{mvp.views_count || 0} vistas</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{mvp.favorites_count || 0} favoritos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )}

  {/* Deal Information */}
  <Card className="border-2">
    <CardContent className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Información del Deal</h3>

      {mvp.deal_modality && (
        <div>
          <p className="text-sm text-muted-foreground">Modalidad</p>
          <Badge className="mt-1">{mvp.deal_modality}</Badge>
        </div>
      )}

      {mvp.price_range && (
        <div>
          <p className="text-sm text-muted-foreground">Rango de Precio</p>
          <p className="font-semibold text-lg text-primary">{mvp.price_range}</p>
        </div>
      )}

      {mvp.published_at && (
        <div>
          <p className="text-sm text-muted-foreground">Publicado</p>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              {new Date(mvp.published_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>

  {/* Contact Button */}
  <Card className="border-2">
    <CardContent className="p-6">
      <Button className="w-full" size="lg">
        <MessageCircle className="w-4 h-4 mr-2" />
        Contactar Vendedor
      </Button>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Inicia una conversación sobre este MVP
      </p>
    </CardContent>
  </Card>

{/* Links Card */}
{mvp.demo_url && (
<Card className="border-2">
<CardContent className="p-6 space-y-3">
<Link href={mvp.demo_url} target="_blank" rel="noopener noreferrer">
<Button className="w-full" size="lg">
Ver Demo
<ExternalLink className="w-4 h-4 ml-2" />
</Button>
</Link>
</CardContent>
</Card>
)}

{/* Creator Info */}
{mvp.user_profiles && (mvp.user_profiles.display_name || mvp.user_profiles.company || mvp.user_profiles.bio) && (
<Card className="border-2">
<CardContent className="p-6 space-y-3">
<h3 className="text-lg font-semibold">Creador</h3>
<div className="space-y-2">
{mvp.user_profiles.display_name && (
<p className="font-semibold">
{mvp.user_profiles.display_name}
</p>
)}
{mvp.user_profiles.company && (
<p className="text-sm text-muted-foreground">
{mvp.user_profiles.company}
</p>
)}
{mvp.user_profiles.bio && (
<p className="text-sm text-muted-foreground">
{mvp.user_profiles.bio}
</p>
)}
</div>
</CardContent>
</Card>
)}
</div>
</div>
</div>
</div>
)
}