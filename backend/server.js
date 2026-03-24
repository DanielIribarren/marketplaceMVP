import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { verifyAuth } from './middleware/auth.js'
import { saveDraft } from './api/mvps/draft.js'
import { publishMVP, getMVP, getMyDrafts, deleteMVP } from './api/mvps/publish.js'
import { getPublicMvps } from './api/mvps/public.js'
import { getMvpDetails } from './api/mvps/details.js'
import { getUrlPreview } from './api/mvps/preview.js'
import { recordMvpView } from './api/mvps/views.js'
import availabilityRoutes from './api/availability.routes.js'
import { validateField, getQualitySignals } from './api/mvps/validate.js'
import { forgotPassword, verifyCode, resetPassword } from './api/auth.js'
import {
  getMyMeetings,
  confirmMeeting,
  rejectMeeting,
  counterproposeMeeting,
  cancelMeeting,
  initializeOldOffers
} from './api/meetings.js'
import { getProfile, updateProfile } from './api/profile.js'
import { getMyFavorites, toggleFavorite } from './api/favorites.js'
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyMvpDecision,
  notifyMvpDeleted,
  notifyAccountBanned,
  notifyAccountRestored
} from './api/notifications.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MVP Marketplace Backend API'
  })
})

// ============================================================================
// RUTAS DE AUTENTICACIÓN (públicas)
// ============================================================================

app.post('/api/auth/forgot-password', forgotPassword)
app.post('/api/auth/verify-code', verifyCode)
app.post('/api/auth/reset-password', resetPassword)

// ============================================================================
// RUTAS DE REUNIONES (requieren autenticación)
// ============================================================================

app.get('/api/meetings/my-meetings', verifyAuth, getMyMeetings)
app.post('/api/meetings/:id/confirm', verifyAuth, confirmMeeting)
app.post('/api/meetings/:id/reject', verifyAuth, rejectMeeting)
app.post('/api/meetings/:id/counterproposal', verifyAuth, counterproposeMeeting)
app.post('/api/meetings/:id/cancel', verifyAuth, cancelMeeting)
app.post('/api/meetings/initialize-old-offers', verifyAuth, initializeOldOffers)

// Favoritos
app.get('/api/favorites/my', verifyAuth, getMyFavorites)
app.post('/api/favorites/:mvpId/toggle', verifyAuth, toggleFavorite)

// Notificaciones
app.get('/api/notifications', verifyAuth, getMyNotifications)
app.post('/api/notifications/:id/read', verifyAuth, markNotificationAsRead)
app.post('/api/notifications/read-all', verifyAuth, markAllNotificationsAsRead)
app.post('/api/admin/mvp/:id/notify-decision', verifyAuth, notifyMvpDecision)
app.post('/api/admin/notify-mvp-deleted', verifyAuth, notifyMvpDeleted)
app.post('/api/admin/notify-account-banned', verifyAuth, notifyAccountBanned)
app.post('/api/admin/notify-account-restored', verifyAuth, notifyAccountRestored)

// Profile
app.get('/api/profile', verifyAuth, getProfile)
app.post('/api/profile', verifyAuth, updateProfile)

// ============================================================================
// RUTAS DE MVPs (requieren autenticación)
// ============================================================================

// Listado público de MVPs (no requiere auth)
app.get('/api/mvps/public', getPublicMvps)

//Detalles de un MVP especifico (público, no requiere auth)
app.get('/api/mvps/public/:id', getMvpDetails)

// Registrar vista única de un MVP (requiere auth)
app.post('/api/mvps/:id/view', verifyAuth, recordMvpView)

// Rutas de disponibilidad
app.use('/api', availabilityRoutes)

// Guardar borrador
app.post('/api/mvps/draft', verifyAuth, saveDraft)

// Obtener preview de una URL
app.post('/api/mvps/preview-from-url', verifyAuth, getUrlPreview)

// Obtener mis borradores (debe ir ANTES de /api/mvps/:id)
app.get('/api/mvps/my-drafts', verifyAuth, getMyDrafts)

// Publicar MVP
app.post('/api/mvps/:id/publish', verifyAuth, publishMVP)

// Obtener MVP por ID
app.get('/api/mvps/:id', verifyAuth, getMVP)

// Eliminar borrador de MVP
app.delete('/api/mvps/:id', verifyAuth, deleteMVP)

// Validación en tiempo real de un campo
app.post('/api/mvps/validate', verifyAuth, validateField)

// Calcular señales de calidad para un MVP
app.post('/api/mvps/quality-signals', verifyAuth, getQualitySignals)

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: 'No encontrado',
    message: `Ruta ${req.method} ${req.path} no existe`
  })
})

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err)
  res.status(500).json({
    error: 'Error del servidor',
    message: 'Ocurrió un error inesperado',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 MVP Marketplace Backend API                          ║
║                                                            ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                      ║
║   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}       ║
║                                                            ║
║   Endpoints disponibles:                                   ║
║   - POST   /api/auth/forgot-password                      ║
║   - POST   /api/auth/verify-code                          ║
║   - POST   /api/auth/reset-password                       ║
║   - POST   /api/mvps/draft                                ║
║   - POST   /api/mvps/:id/publish                          ║
║   - GET    /api/mvps/:id                                  ║
║   - GET    /api/mvps/my-drafts                            ║
║   - GET    /api/meetings/my-meetings                      ║
║   - POST   /api/meetings/:id/confirm                      ║
║   - POST   /api/meetings/:id/reject                       ║
║   - POST   /api/meetings/:id/counterproposal              ║
║   - POST   /api/meetings/:id/cancel                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `)
})

export default app
