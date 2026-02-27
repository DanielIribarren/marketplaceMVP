export type UserRole = 'user' | 'admin'
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending_verification'
export type MvpStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'
export type MeetingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'counterproposal_entrepreneur'
  | 'counterproposal_investor'
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type SupportTicketType = 'bug_report' | 'technical_support' | 'suggestion' | 'other'

export interface User {
  id: string
  email: string
  password_hash: string
  role: UserRole
  status: UserStatus
  display_name: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
  email_verified_at: string | null
}

export interface UserProfile {
  user_id: string
  avatar_url: string | null
  bio: string | null
  company: string | null
  phone: string | null
  location: string | null
  website: string | null
  linkedin_url: string | null
  github_url: string | null
  birth_date: string | null
  created_at: string
  updated_at: string
}

export interface MVP {
  id: string
  owner_id: string
  title: string
  slug: string
  description: string
  short_description: string | null
  status: MvpStatus
  category: string | null
  tags: string[] | null
  price: number | null
  demo_url: string | null
  repository_url: string | null
  documentation_url: string | null
  tech_stack: string[] | null
  features: string[] | null
  cover_image_url: string | null
  images_urls: string[] | null
  video_url: string | null
  metrics: Record<string, unknown> | null
  views_count: number
  favorites_count: number
  published_at: string | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface MVPEvaluation {
  id: string
  mvp_id: string
  evaluator_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  mvp_id: string
  requester_id: string
  owner_id: string
  status: MeetingStatus
  scheduled_at: string | null
  duration_minutes: number
  meeting_url: string | null
  meeting_type: string
  timezone: string
  notes: string | null
  requester_notes: string | null
  owner_notes: string | null
  counterproposal_notes: string | null
  counterproposal_by: string | null
  created_at: string
  updated_at: string
  confirmed_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  cancellation_reason: string | null
  cancelled_by: string | null
  availability_slot_id: string | null
  offer_type: 'economic' | 'non_economic' | null
  offer_amount: number | null
  offer_equity_percent: number | null
  offer_note: string | null
  offer_status: string | null
  offer_discussed_at: string | null
}

export interface Favorite {
  id: string
  user_id: string
  mvp_id: string
  created_at: string
}

export interface SupportTicket {
  id: string
  user_id: string
  type: SupportTicketType
  status: SupportTicketStatus
  subject: string
  description: string
  priority: string
  assigned_to: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  read: boolean
  read_at: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'user_id' | 'created_at'>>
      }
      mvps: {
        Row: MVP
        Insert: Omit<MVP, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'favorites_count'>
        Update: Partial<Omit<MVP, 'id' | 'created_at'>>
      }
      mvp_evaluations: {
        Row: MVPEvaluation
        Insert: Omit<MVPEvaluation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MVPEvaluation, 'id' | 'created_at'>>
      }
      meetings: {
        Row: Meeting
        Insert: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Meeting, 'id' | 'created_at'>>
      }
      favorites: {
        Row: Favorite
        Insert: Omit<Favorite, 'id' | 'created_at'>
        Update: never
      }
      support_tickets: {
        Row: SupportTicket
        Insert: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SupportTicket, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
    }
  }
}
