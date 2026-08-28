// ============================================================================
// ExamForge AI — Marketing Admin Data Fetching Helpers
// ============================================================================
// Server-side data fetching utilities for the marketing admin panel.
// Gracefully handles missing Supabase configuration by returning empty data.
// ============================================================================

import { createClient, createClientOrNull } from '@/lib/supabase/server'
import type {
  Lead,
  LeadActivity,
  ContactSubmission,
  NewsletterSubscriber,
  DemoBooking,
  AnalyticsEvent,
} from '@/lib/supabase/marketing-types'

// ── Types ──

export interface MarketingKPIs {
  totalLeads: number
  newLeadsThisWeek: number
  conversionRate: number
  demoBookingsThisWeek: number
  newsletterSubscribers: number
  contactSubmissionsThisWeek: number
  pipelineDistribution: Record<string, number>
}

export interface MarketingDashboardData {
  kpis: MarketingKPIs
  recentActivities: LeadActivity[]
}

// ── Date Helpers ──

function sevenDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

// ── Safe Supabase Access ──

async function getSupabase() {
  try {
    return await createClient()
  } catch {
    return null
  }
}

// ── KPIs ──

export async function fetchMarketingKPIs(): Promise<MarketingKPIs> {
  const supabase = await getSupabase()
  if (!supabase) return emptyKPIs()

  const weekAgo = sevenDaysAgo()

  try {
    // Total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })

    // New leads this week
    const { count: newLeadsThisWeek } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)

    // Won leads (for conversion rate)
    const { count: wonLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'won')

    // Demo bookings this week
    const { count: demoBookingsThisWeek } = await supabase
      .from('demo_bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)

    // Active newsletter subscribers
    const { count: newsletterSubscribers } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Contact submissions this week
    const { count: contactSubmissionsThisWeek } = await supabase
      .from('contact_submissions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)

    // Pipeline distribution
    const { data: pipelineData } = await supabase
      .from('leads')
      .select('stage')

    const pipelineDistribution: Record<string, number> = {}
    if (pipelineData) {
      for (const row of pipelineData) {
        const stage = row.stage as string
        pipelineDistribution[stage] = (pipelineDistribution[stage] || 0) + 1
      }
    }

    const total = totalLeads || 0
    const conversionRate = total > 0 ? ((wonLeads || 0) / total) * 100 : 0

    return {
      totalLeads: total,
      newLeadsThisWeek: newLeadsThisWeek || 0,
      conversionRate: Math.round(conversionRate * 10) / 10,
      demoBookingsThisWeek: demoBookingsThisWeek || 0,
      newsletterSubscribers: newsletterSubscribers || 0,
      contactSubmissionsThisWeek: contactSubmissionsThisWeek || 0,
      pipelineDistribution,
    }
  } catch {
    return emptyKPIs()
  }
}

function emptyKPIs(): MarketingKPIs {
  return {
    totalLeads: 0,
    newLeadsThisWeek: 0,
    conversionRate: 0,
    demoBookingsThisWeek: 0,
    newsletterSubscribers: 0,
    contactSubmissionsThisWeek: 0,
    pipelineDistribution: {},
  }
}

// ── Recent Activity ──

export async function fetchRecentActivities(limit = 10): Promise<LeadActivity[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data as LeadActivity[]) || []
  } catch {
    return []
  }
}

// ── Leads ──

export async function fetchLeads(filters?: {
  stage?: string
  scoreTier?: string
  source?: string
  search?: string
}): Promise<Lead[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  try {
    let query = supabase
      .from('leads')
      .select('*')
      .order('last_activity_at', { ascending: false })

    if (filters?.stage) query = query.eq('stage', filters.stage)
    if (filters?.scoreTier) query = query.eq('score_tier', filters.scoreTier)
    if (filters?.source) query = query.eq('source', filters.source)
    if (filters?.search) {
      query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
    }

    const { data } = await query
    return (data as Lead[]) || []
  } catch {
    return []
  }
}

// ── Single Lead ──

export async function fetchLeadById(id: string): Promise<Lead | null> {
  const supabase = await getSupabase()
  if (!supabase) return null

  try {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    return data as Lead
  } catch {
    return null
  }
}

// ── Lead Activities ──

export async function fetchLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    return (data as LeadActivity[]) || []
  } catch {
    return []
  }
}

// ── Contact Submissions ──

export async function fetchContactSubmissions(): Promise<ContactSubmission[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    return (data as ContactSubmission[]) || []
  } catch {
    return []
  }
}

// ── Newsletter Subscribers ──

export async function fetchNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false })

    return (data as NewsletterSubscriber[]) || []
  } catch {
    return []
  }
}

// ── Demo Bookings ──

export async function fetchDemoBookings(): Promise<DemoBooking[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('demo_bookings')
      .select('*')
      .order('created_at', { ascending: false })

    return (data as DemoBooking[]) || []
  } catch {
    return []
  }
}

// ── Analytics Events ──

export async function fetchAnalyticsEvents(limit = 100): Promise<AnalyticsEvent[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data as AnalyticsEvent[]) || []
  } catch {
    return []
  }
}

// ── Analytics Aggregations ──

export interface AnalyticsAggregations {
  eventsByType: Record<string, number>
  topPages: Record<string, number>
  sourceDistribution: Record<string, number>
  totalEvents: number
}

export async function fetchAnalyticsAggregations(): Promise<AnalyticsAggregations> {
  const events = await fetchAnalyticsEvents(500)

  const eventsByType: Record<string, number> = {}
  const topPages: Record<string, number> = {}
  const sourceDistribution: Record<string, number> = {}

  for (const event of events) {
    // By type
    eventsByType[event.event_name] = (eventsByType[event.event_name] || 0) + 1

    // By page
    if (event.page_url) {
      try {
        const url = new URL(event.page_url)
        const path = url.pathname
        topPages[path] = (topPages[path] || 0) + 1
      } catch {
        topPages[event.page_url] = (topPages[event.page_url] || 0) + 1
      }
    }

    // By source
    if (event.utm_source) {
      sourceDistribution[event.utm_source] = (sourceDistribution[event.utm_source] || 0) + 1
    }
  }

  return {
    eventsByType,
    topPages,
    sourceDistribution,
    totalEvents: events.length,
  }
}
