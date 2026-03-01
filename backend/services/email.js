import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_SERVER || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  })
}

const TYPE_CONFIG = {
  meeting_confirmed: {
    icon: '✅',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    label: 'Reunión confirmada'
  },
  meeting_rejected: {
    icon: '❌',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    label: 'Reunión rechazada'
  },
  meeting_counterproposal: {
    icon: '🔄',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    label: 'Nueva contrapropuesta'
  },
  meeting_cancelled: {
    icon: '🚫',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#e5e7eb',
    label: 'Reunión cancelada'
  },
  meeting_requested: {
    icon: '📅',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    label: 'Nueva solicitud de reunión'
  },
  offer_pending_review: {
    icon: '💰',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    label: 'Oferta pendiente de revisión'
  },
  mvp_favorited: {
    icon: '❤️',
    color: '#db2777',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    label: 'Tu MVP recibió un favorito'
  },
  mvp_approved: {
    icon: '🎉',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    label: 'MVP aprobado'
  },
  mvp_rejected: {
    icon: '⚠️',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    label: 'MVP rechazado'
  }
}

function buildEmailHtml(notification) {
  const cfg = TYPE_CONFIG[notification.type] || {
    icon: '🔔',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    label: notification.title
  }

  const defaultHref = notification.type?.startsWith('mvp_') ? '/publish' : '/calendar'
  const ctaHref = notification.data?.href
    ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}${notification.data.href}`
    : `${process.env.FRONTEND_URL || 'http://localhost:3000'}${defaultHref}`

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${notification.title}</title>
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background:#111827;padding:24px 32px;text-align:center;">
                  <div style="display:inline-block;width:40px;height:40px;background:#2563eb;border-radius:8px;text-align:center;line-height:40px;">
                    <span style="color:#fff;font-weight:bold;font-size:20px;">M</span>
                  </div>
                  <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;letter-spacing:0.5px;">MVP Marketplace</p>
                </td>
              </tr>

              <!-- Badge de tipo -->
              <tr>
                <td style="padding:28px 32px 0;text-align:center;">
                  <div style="display:inline-block;background:${cfg.bgColor};border:1px solid ${cfg.borderColor};border-radius:999px;padding:6px 16px;">
                    <span style="color:${cfg.color};font-size:13px;font-weight:600;">${cfg.icon}&nbsp;&nbsp;${cfg.label}</span>
                  </div>
                </td>
              </tr>

              <!-- Título y mensaje -->
              <tr>
                <td style="padding:20px 32px 0;">
                  <h2 style="margin:0 0 12px;color:#111827;font-size:20px;text-align:center;">${notification.title}</h2>
                  <div style="background:${cfg.bgColor};border-left:4px solid ${cfg.color};border-radius:0 8px 8px 0;padding:16px 20px;margin:0;">
                    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">${notification.message}</p>
                  </div>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding:28px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${ctaHref}"
                           style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                          ${notification.type?.startsWith('mvp_') ? 'Ver mis MVPs' : 'Ver en el calendario'}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    Recibiste este correo porque tienes una cuenta en MVP Marketplace.<br />
                    Si no esperabas esta notificación, puedes ignorar este mensaje.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

/**
 * Envía un correo de notificación al usuario.
 * Falla silenciosamente si las variables de entorno no están configuradas.
 */
export async function sendNotificationEmail(email, notification) {
  if (!process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
    console.warn('[EMAIL] Variables MAIL_USERNAME/MAIL_PASSWORD no configuradas. Omitiendo envío.')
    return
  }

  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"MVP Marketplace" <${process.env.MAIL_USERNAME}>`,
    to: email,
    subject: notification.title,
    html: buildEmailHtml(notification)
  })

  console.log(`[EMAIL] Notificación "${notification.type}" enviada a ${email}`)
}
