'use client'

// ============================================================================
// ExamForge AI — Lead Detail Page (Admin)
// ============================================================================
// Shows lead info, activity timeline, notes, stage progression, score breakdown.
// ============================================================================

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Globe,
  Tag,
  Calendar,
  Activity,
  ChevronRight,
  Star,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { Lead, LeadActivity } from '@/lib/supabase/marketing-types'

// ── Stage progression order ──

const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'] as const

const stageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

const tierColors: Record<string, string> = {
  hot: 'text-destructive',
  warm: 'text-yellow-600 dark:text-yellow-400',
  cold: 'text-sky-600',
}

// ── Activity type icons ──

const activityTypeLabels: Record<string, string> = {
  form_submit: 'Form Submitted',
  page_view: 'Page Viewed',
  email_open: 'Email Opened',
  email_click: 'Email Clicked',
  demo_booked: 'Demo Booked',
  demo_completed: 'Demo Completed',
  demo_cancelled: 'Demo Cancelled',
  call_scheduled: 'Call Scheduled',
  note_added: 'Note Added',
  stage_changed: 'Stage Changed',
  score_updated: 'Score Updated',
  subscription: 'Subscribed',
  download: 'Downloaded',
}

// ── Main Component ──

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [leadRes, activitiesRes] = await Promise.all([
          fetch(`/api/marketing/leads/${leadId}`),
          fetch(`/api/marketing/leads/${leadId}/activities`),
        ])

        if (leadRes.ok) {
          const data = await leadRes.json()
          setLead(data.lead)
        }
        if (activitiesRes.ok) {
          const data = await activitiesRes.json()
          setActivities(data.activities || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    if (leadId) loadData()
  }, [leadId])

  const handleAdvanceStage = async () => {
    if (!lead) return
    setAdvancing(true)
    try {
      const currentIndex = stageOrder.indexOf(lead.stage as typeof stageOrder[number])
      if (currentIndex < stageOrder.length - 1) {
        const nextStage = stageOrder[currentIndex + 1]
        await fetch(`/api/marketing/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: nextStage }),
        })
        setLead({ ...lead, stage: nextStage })
      }
    } catch {
      // silently fail
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/marketing/leads')}>
          Back to Leads
        </Button>
      </div>
    )
  }

  const currentStageIndex = stageOrder.indexOf(lead.stage as typeof stageOrder[number])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/marketing/leads"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Leads
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight tracking-tight">
            {lead.first_name || lead.last_name
              ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
              : lead.email}
          </h1>
          <Badge variant={lead.stage === 'won' ? 'default' : lead.stage === 'lost' ? 'destructive' : 'secondary'}>
            {stageLabels[lead.stage] || lead.stage}
          </Badge>
          <span className={`text-sm font-semibold ${tierColors[lead.score_tier] || ''}`}>
            {lead.score_tier.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Info */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Phone} label="Phone" value={lead.phone || '—'} />
                <InfoRow icon={Building2} label="Company" value={lead.company || '—'} />
                <InfoRow icon={Globe} label="Source" value={lead.source} />
                <InfoRow icon={Tag} label="Role" value={lead.role || '—'} />
                <InfoRow icon={Calendar} label="Created" value={new Date(lead.created_at).toLocaleDateString()} />
              </div>

              {/* UTM Info */}
              {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
                <>
                  <Separator className="my-4" />
                  <p className="text-sm font-medium mb-2">UTM Parameters</p>
                  <div className="flex flex-wrap gap-2">
                    {lead.utm_source && <Badge variant="outline">source: {lead.utm_source}</Badge>}
                    {lead.utm_medium && <Badge variant="outline">medium: {lead.utm_medium}</Badge>}
                    {lead.utm_campaign && <Badge variant="outline">campaign: {lead.utm_campaign}</Badge>}
                    {lead.utm_content && <Badge variant="outline">content: {lead.utm_content}</Badge>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activities recorded.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {activities.map((activity, i) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        {i < activities.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <p className="text-sm font-medium">
                          {activityTypeLabels[activity.type] || activity.type}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6 animate-fade-in">
          {/* Score Breakdown */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Lead Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <span className="text-4xl font-bold">{lead.score}</span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 mb-2">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(lead.score, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cold (0-33)</span>
                <span>Warm (34-66)</span>
                <span>Hot (67-100)</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Score tier: <strong className={tierColors[lead.score_tier]}>{lead.score_tier.toUpperCase()}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Stage Progression */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Stage Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stageOrder.map((stage, i) => {
                  const isCurrent = lead.stage === stage
                  const isPast = i < currentStageIndex
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                        isCurrent
                          ? 'bg-primary/10 text-primary font-medium'
                          : isPast
                          ? 'text-muted-foreground'
                          : 'text-foreground/30'
                      }`}
                    >
                      {isPast && <span className="text-green-600 dark:text-green-400">✓</span>}
                      {isCurrent && <ChevronRight className="h-4 w-4" />}
                      {!isPast && !isCurrent && <span className="w-4" />}
                      {stageLabels[stage]}
                    </div>
                  )
                })}
              </div>

              {lead.stage !== 'won' && lead.stage !== 'lost' && currentStageIndex < stageOrder.length - 1 && (
                <Button
                  className="w-full mt-4"
                  onClick={handleAdvanceStage}
                  disabled={advancing}
                >
                  {advancing ? 'Advancing...' : `Advance to ${stageLabels[stageOrder[currentStageIndex + 1]]}`}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assigned to</span>
                <span>{lead.assigned_to || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Institution</span>
                <span>{lead.institution_type || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Team Size</span>
                <span>{lead.team_size || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Activity</span>
                <span>{new Date(lead.last_activity_at).toLocaleDateString()}</span>
              </div>
              {lead.converted_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Converted</span>
                  <span className="text-green-600 dark:text-green-400">{new Date(lead.converted_at).toLocaleDateString()}</span>
                </div>
              )}
              {lead.lost_reason && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lost Reason</span>
                  <span className="text-destructive">{lead.lost_reason}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Info Row Helper ──

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
