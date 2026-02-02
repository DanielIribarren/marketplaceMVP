/**
 * Types for Availability Calendar System
 */

export type MeetingType = 'video_call' | 'phone_call' | 'in_person'

export interface AvailabilitySlot {
  id: string
  mvp_id: string
  owner_id: string
  date: string // ISO date string (YYYY-MM-DD)
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  timezone: string
  is_booked: boolean
  booked_by?: string | null
  meeting_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CreateAvailabilitySlot {
  mvp_id: string
  date: string
  start_time: string
  end_time: string
  timezone?: string
  notes?: string
}

export interface UpdateAvailabilitySlot {
  date?: string
  start_time?: string
  end_time?: string
  timezone?: string
  notes?: string
}

export interface BookSlotRequest {
  slot_id: string
  notes?: string
  meeting_type?: MeetingType
}

export interface MeetingExtended {
  id: string
  mvp_id: string
  requester_id: string
  owner_id: string
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
  scheduled_at: string | null
  duration_minutes: number
  meeting_url?: string | null
  meeting_type: MeetingType
  timezone: string
  notes?: string | null
  requester_notes?: string | null
  owner_notes?: string | null
  availability_slot_id?: string | null
  cancelled_by?: string | null
  cancellation_reason?: string | null
  created_at: string
  updated_at: string
  confirmed_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
}

// Helper type for calendar UI
export interface CalendarDay {
  date: string // ISO date
  slots: AvailabilitySlot[]
  isToday: boolean
  isPast: boolean
  hasAvailability: boolean
}

export interface TimeSlotOption {
  value: string // HH:MM
  label: string // e.g., "9:00 AM"
  disabled?: boolean
}

// For bulk creation
export interface BulkAvailabilityCreation {
  mvp_id: string
  dates: string[] // Array of ISO dates
  time_slots: Array<{
    start_time: string
    end_time: string
  }>
  timezone?: string
  notes?: string
}
