import express from 'express'
import { verifyAuth } from '../middleware/auth.js'
import { 
  createAvailability, 
  getAvailabilityByMVP, 
  getMyAvailability,
  deleteAvailabilitySlot,
  bookAvailabilitySlot,
  createBulkAvailability
} from '../api/availability.api.js'

const router = express.Router()

// All routes require authentication
router.use(verifyAuth)

// Create availability slots
router.post('/availability', createAvailability)

// Create bulk availability
router.post('/availability/bulk', createBulkAvailability)

// Get availability for a specific MVP (public if MVP is approved)
router.get('/availability/mvp/:mvpId', getAvailabilityByMVP)

// Get current user's availability slots
router.get('/availability/my-slots', getMyAvailability)

// Delete an availability slot
router.delete('/availability/:slotId', deleteAvailabilitySlot)

// Book an availability slot (create meeting request)
router.post('/availability/:slotId/book', bookAvailabilitySlot)

export default router
