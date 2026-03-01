import { sendNotificationEmail } from '../../services/email.js'

await sendNotificationEmail('fabiana.obelmejias@correo.unimet.edu.ve', {
  type: 'meeting_confirmed',
  title: 'Reunión confirmada',
  message: 'El emprendedor confirmó la reunión de "Mi MVP de prueba".',
  data: { href: '/calendar' }
})

console.log('Email enviado!')
