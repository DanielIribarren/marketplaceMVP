"use client"

import {
  Heart,
  CheckCircle2,
  XCircle,
  CalendarClock,
  CircleCheckBig,
  CircleX,
  Repeat,
  Ban,
  HandCoins,
  ExternalLink,
  Trash2,
  ShieldOff
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface NotificationDetailsProps {
  notification: {
    id: string
    type: string
    title: string
    message: string
    created_at: string
    data: Record<string, unknown> | null
  }
}

function formatFullDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function NotificationDetails({ notification }: NotificationDetailsProps) {
  const renderIcon = () => {
    const iconClass = 'h-12 w-12'

    switch (notification.type) {
      case 'mvp_favorited':
        return <Heart className={`${iconClass} text-red-500 fill-red-500`} />
      case 'mvp_approved':
        return <CheckCircle2 className={`${iconClass} text-green-500`} />
      case 'mvp_rejected':
        return <XCircle className={`${iconClass} text-red-500`} />
      case 'meeting_requested':
        return <CalendarClock className={`${iconClass} text-blue-500`} />
      case 'meeting_confirmed':
        return <CircleCheckBig className={`${iconClass} text-green-500`} />
      case 'meeting_rejected':
        return <CircleX className={`${iconClass} text-red-500`} />
      case 'meeting_counterproposal':
        return <Repeat className={`${iconClass} text-orange-500`} />
      case 'meeting_cancelled':
        return <Ban className={`${iconClass} text-gray-500`} />
      case 'offer_pending_review':
        return <HandCoins className={`${iconClass} text-yellow-600`} />
      case 'mvp_deleted':
        return <Trash2 className={`${iconClass} text-red-500`} />
      case 'account_banned':
        return <ShieldOff className={`${iconClass} text-gray-500`} />
      default:
        return null
    }
  }

  const renderContent = () => {
    switch (notification.type) {
      case 'mvp_favorited': {
        // Intentar extraer información del mensaje o de data
        // El mensaje tiene formato: "Nombre del Usuario agregó 'Título del MVP' a favoritos"
        let userName = notification.data?.user_name as string | undefined
        let mvpTitle = notification.data?.mvp_title as string | undefined

        // Si no están en data, intentar extraer del mensaje
        if (!userName || !mvpTitle) {
          const messageMatch = notification.message?.match(/^(.+?)\s+agregó\s+"([^"]+)"\s+a\s+favoritos/)
          if (messageMatch) {
            if (!userName) userName = messageMatch[1]
            if (!mvpTitle) mvpTitle = messageMatch[2]
          }
        }

        // Valores por defecto si aún no se encontraron
        userName = userName || 'Un usuario'
        mvpTitle = mvpTitle || 'Tu MVP'

        const mvpId = notification.data?.mvp_id as string | undefined

        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Usuario que marcó favorito</p>
                <p className="font-semibold text-base">
                  {userName}
                </p>
              </div>
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">MVP marcado como favorito</p>
                <p className="font-semibold text-base text-primary">
                  {mvpTitle}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha y hora</p>
              <p className="font-medium">{formatFullDate(notification.created_at)}</p>
            </div>
            {mvpId && (
              <Link href={`/mvps/${mvpId}`} className="block">
                <Button variant="outline" size="sm" className="w-full hover:bg-primary hover:text-primary-foreground transition-colors">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver MVP
                </Button>
              </Link>
            )}
          </div>
        )
      }

      case 'mvp_approved': {
        const mvpTitle = (notification.data?.mvp_title as string) || notification.message?.match(/"([^"]+)"/)?.[1] || 'Tu MVP'
        const mvpId = notification.data?.mvp_id as string | undefined

        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-800 font-medium">
                ¡Felicidades! Tu MVP ha sido aprobado y ahora es visible en el marketplace.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">MVP aprobado</p>
              <p className="font-semibold text-base text-green-700">
                {mvpTitle}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de aprobación</p>
              <p className="font-medium">{formatFullDate(notification.created_at)}</p>
            </div>
            {mvpId && (
              <Link href={`/mvps/${mvpId}`} className="block">
                <Button variant="default" size="sm" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver en Marketplace
                </Button>
              </Link>
            )}
          </div>
        )
      }

      case 'mvp_rejected': {
        const mvpTitle = (notification.data?.mvp_title as string) || notification.message?.match(/"([^"]+)"/)?.[1] || 'Tu MVP'
        const rejectionReason = notification.data?.rejection_reason as string | undefined
        const rejectedMvpId = notification.data?.mvp_id as string | undefined

        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800 font-medium">
                Lo sentimos, tu MVP no fue aprobado.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">MVP rechazado</p>
              <p className="font-semibold text-base text-red-700">
                {mvpTitle}
              </p>
            </div>
            {rejectionReason && (
              <div className="rounded-lg bg-red-50/50 border border-red-200 p-3">
                <p className="text-xs text-muted-foreground mb-1">Razón del rechazo</p>
                <p className="text-sm font-medium text-red-900">{rejectionReason}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Fecha de rechazo</p>
              <p className="font-medium">{formatFullDate(notification.created_at)}</p>
            </div>
            <Link href={rejectedMvpId ? `/publish?draft=${rejectedMvpId}&from=my-mvps` : '/publish'} className="block">
              <Button variant="outline" size="sm" className="w-full hover:bg-primary hover:text-primary-foreground transition-colors">
                Editar y volver a enviar
              </Button>
            </Link>
          </div>
        )
      }

      case 'meeting_requested': {
        const requesterName = notification.data?.requester_name as string | undefined
        const mvpTitle = notification.data?.mvp_title as string | undefined
        const scheduledDate = notification.data?.scheduled_at as string | undefined
        const offerType = notification.data?.offer_type as string | undefined
        const offerAmount = notification.data?.offer_amount as number | undefined
        const offerEquity = notification.data?.offer_equity_percent as number | undefined

        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-800 font-medium">
                ¡Tienes una nueva solicitud de reunión!
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Inversor interesado</p>
                <p className="font-semibold text-base">{requesterName || 'Un inversor'}</p>
              </div>

              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">MVP de interés</p>
                <p className="font-semibold text-base text-primary">{mvpTitle || 'Tu MVP'}</p>
              </div>

              {scheduledDate && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">Fecha propuesta para la reunión</p>
                  <p className="font-semibold text-base">{formatFullDate(scheduledDate)}</p>
                </div>
              )}

              {offerType && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">Tipo de oferta</p>
                  <p className="font-semibold text-base capitalize">
                    {offerType === 'economic' ? 'Oferta Económica' :
                     offerType === 'meeting_only' ? 'Solo Reunión' : offerType}
                  </p>
                </div>
              )}

              {offerType === 'economic' && (offerAmount !== undefined || offerEquity !== undefined) && (
                <div className="border-t pt-2 bg-green-50 p-2 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Oferta inicial</p>
                  {offerAmount !== undefined && offerAmount > 0 && (
                    <p className="font-bold text-green-700">${offerAmount.toLocaleString()} USD</p>
                  )}
                  {offerEquity !== undefined && offerEquity > 0 && (
                    <p className="font-bold text-green-700">{offerEquity}% equity</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Recibida el</p>
              <p className="font-medium">{formatFullDate(notification.created_at)}</p>
            </div>

            {(() => {
              const href = notification.data?.href as string | undefined
              return href ? (
                <Link href={href} className="block">
                  <Button variant="default" size="sm" className="w-full">
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Ver en Calendario
                  </Button>
                </Link>
              ) : null
            })()}
          </div>
        )
      }

      case 'meeting_confirmed':
      case 'meeting_rejected':
      case 'meeting_counterproposal':
      case 'meeting_cancelled': {
        const href = notification.data?.href as string | undefined

        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Detalles</p>
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha y hora de notificación</p>
              <p className="font-medium">{formatFullDate(notification.created_at)}</p>
            </div>
            {href && (
              <Link href={href} className="block">
                <Button variant="outline" size="sm" className="w-full hover:bg-primary hover:text-primary-foreground transition-colors">
                  Ver en Calendario
                </Button>
              </Link>
            )}
          </div>
        )
      }

      case 'offer_pending_review': {
        const href = notification.data?.href as string | undefined

        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs text-muted-foreground mb-1">Detalles de la oferta</p>
              <p className="text-sm font-medium text-yellow-900">{notification.message}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha y hora</p>
              <p className="font-medium">{formatFullDate(notification.created_at)}</p>
            </div>
            {href && (
              <Link href={href} className="block">
                <Button variant="default" size="sm" className="w-full">
                  Revisar Oferta en Calendario
                </Button>
              </Link>
            )}
          </div>
        )
      }

      default:
        return (
          <div className="space-y-3">
            <p className="text-sm">{notification.message}</p>
            <div>
              <p className="text-sm text-muted-foreground">Fecha y hora</p>
              <p className="font-medium">{formatFullDate(notification.created_at)}</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {renderIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{notification.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()}</h3>
        </div>
      </div>

      <div className="border-t pt-4">
        {renderContent()}
      </div>
    </div>
  )
}
