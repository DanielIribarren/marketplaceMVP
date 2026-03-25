export type InvestorMeetingStatus =
  | 'pending'
  | 'confirmed'
  | 'counterproposal_entrepreneur'
  | 'counterproposal_investor'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export interface InvestorMeetingStatusMeta {
  label: string
  description: string
  isActive: boolean
  badgeClassName: string
}

export function getInvestorMeetingStatusMeta(status: string): InvestorMeetingStatusMeta {
  switch (status as InvestorMeetingStatus) {
    case 'pending':
      return {
        label: 'Solicitud enviada',
        description: 'El emprendedor aún no responde tu solicitud.',
        isActive: true,
        badgeClassName: 'bg-orange-100 text-orange-800 border-orange-300'
      }
    case 'confirmed':
      return {
        label: 'Reunión confirmada',
        description: 'Tu reunión está confirmada. Revisa fecha y detalles.',
        isActive: true,
        badgeClassName: 'bg-green-100 text-green-900 border-green-400'
      }
    case 'counterproposal_entrepreneur':
      return {
        label: 'Contrapropuesta recibida',
        description: 'El emprendedor propuso otra fecha y espera tu respuesta.',
        isActive: true,
        badgeClassName: 'bg-yellow-100 text-yellow-900 border-yellow-400'
      }
    case 'counterproposal_investor':
      return {
        label: 'Esperando respuesta',
        description: 'Tu contrapropuesta fue enviada. Espera confirmación.',
        isActive: true,
        badgeClassName: 'bg-yellow-100 text-yellow-900 border-yellow-400'
      }
    case 'completed':
      return {
        label: 'Reunión completada',
        description: 'La reunión ya ocurrió. Puedes agendar seguimiento.',
        isActive: false,
        badgeClassName: 'bg-gray-200 text-gray-800 border-gray-400'
      }
    case 'rejected':
      return {
        label: 'Reunión rechazada',
        description: 'La solicitud fue rechazada. Puedes intentar nuevamente.',
        isActive: false,
        badgeClassName: 'bg-red-200 text-red-900 border-red-500'
      }
    case 'cancelled':
      return {
        label: 'Reunión cancelada',
        description: 'La solicitud fue cancelada. Puedes crear una nueva.',
        isActive: false,
        badgeClassName: 'bg-gray-100 text-gray-700 border-gray-200'
      }
    default:
      return {
        label: 'Sin estado',
        description: 'No hay estado de reunión disponible.',
        isActive: false,
        badgeClassName: 'bg-gray-100 text-gray-700 border-gray-200'
      }
  }
}

export function pickLatestMeetingByMvp<T extends {
  mvp_id: string
  updated_at: string
  user_role?: 'entrepreneur' | 'investor'
}>(meetings: T[]): Record<string, T> {
  const byMvp: Record<string, T> = {}

  for (const meeting of meetings) {
    if (meeting.user_role && meeting.user_role !== 'investor') continue
    if (!meeting.mvp_id) continue

    const current = byMvp[meeting.mvp_id]
    if (!current) {
      byMvp[meeting.mvp_id] = meeting
      continue
    }

    const currentTs = new Date(current.updated_at).getTime()
    const nextTs = new Date(meeting.updated_at).getTime()
    if (nextTs > currentTs) {
      byMvp[meeting.mvp_id] = meeting
    }
  }

  return byMvp
}
