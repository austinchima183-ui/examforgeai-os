// ============================================================================
// ExamForge AI — Marketing Database Types
// ============================================================================
// TypeScript type definitions for all marketing-related database tables.
// These mirror the Supabase migration schema for type-safe data access.
// Uses snake_case to match Postgres column naming conventions.
// ============================================================================

// Contact submission
export interface ContactSubmission {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  school?: string | null
  institution_type?: 'primary' | 'secondary' | 'tertiary' | 'training' | 'other' | null
  subject: 'general' | 'demo' | 'pricing' | 'support' | 'partnership' | 'other'
  message: string
  priority: 'low' | 'medium' | 'high'
  attachment_url?: string | null
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  assigned_to?: string | null
  lead_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  updated_at: string
}

// Newsletter subscriber
export interface NewsletterSubscriber {
  id: string
  email: string
  source: 'footer' | 'cta' | 'popup' | 'inline' | 'demo' | 'import'
  status: 'pending' | 'active' | 'unsubscribed'
  verification_token: string
  verified_at?: string | null
  preferences?: string[] | null
  ip_address?: string | null
  unsubscribed_at?: string | null
  created_at: string
  updated_at: string
}

// Demo booking
export interface DemoBooking {
  id: string
  name: string
  email: string
  company: string
  role: string
  team_size: '1-50' | '51-200' | '201-500' | '501-1000' | '1000+'
  preferred_date: string
  preferred_time: string
  timezone: string
  notes?: string | null
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled'
  meeting_url?: string | null
  assigned_to?: string | null
  lead_id?: string | null
  source?: string | null
  calendar_event_id?: string | null
  reminder_sent_at?: string | null
  created_at: string
  updated_at: string
}

// Lead
export interface Lead {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  company?: string | null
  role?: string | null
  source: 'organic' | 'paid' | 'referral' | 'social' | 'email' | 'direct' | 'partner' | 'other'
  source_details?: string | null
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  score: number
  score_tier: 'hot' | 'warm' | 'cold'
  assigned_to?: string | null
  institution_type?: string | null
  team_size?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  last_activity_at: string
  converted_at?: string | null
  lost_reason?: string | null
  created_at: string
  updated_at: string
}

// Lead activity
export interface LeadActivity {
  id: string
  lead_id: string
  type: 'form_submit' | 'page_view' | 'email_open' | 'email_click' | 'demo_booked' | 'demo_completed' | 'demo_cancelled' | 'call_scheduled' | 'note_added' | 'stage_changed' | 'score_updated' | 'subscription' | 'download'
  description: string
  metadata?: Record<string, unknown> | null
  created_at: string
}

// Company/Institution
export interface Company {
  id: string
  name: string
  type: 'primary' | 'secondary' | 'tertiary' | 'training' | 'government' | 'other'
  website?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  student_count?: number | null
  lead_id?: string | null
  created_at: string
  updated_at: string
}

// Email log
export interface EmailLog {
  id: string
  recipient: string
  template: string
  subject: string
  status: 'sent' | 'delivered' | 'bounced' | 'failed'
  lead_id?: string | null
  metadata?: Record<string, unknown> | null
  sent_at: string
}

// Audit log
export interface AuditLog {
  id: string
  action: string
  actor?: string | null
  actor_ip?: string | null
  target_type?: string | null
  target_id?: string | null
  details?: Record<string, unknown> | null
  created_at: string
}

// Analytics event
export interface AnalyticsEvent {
  id: string
  event_name: string
  properties?: Record<string, unknown> | null
  user_id?: string | null
  session_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  page_url?: string | null
  referrer?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  created_at: string
}

// Campaign
export interface Campaign {
  id: string
  name: string
  type: 'email' | 'drip' | 'newsletter' | 'announcement'
  status: 'draft' | 'active' | 'paused' | 'completed'
  subject?: string | null
  content?: string | null
  target_audience?: string | null
  scheduled_at?: string | null
  sent_at?: string | null
  opens: number
  clicks: number
  conversions: number
  created_at: string
  updated_at: string
}
