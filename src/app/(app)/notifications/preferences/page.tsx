'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Monitor,
  FileText,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Store,
  Moon,
  Save,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { createClient, createClientOrNull } from '@/lib/supabase/client'

// ============================================================================
// ExamForge AI — Notification Preferences Page
// ============================================================================
// Multi-channel notification preferences with type toggles, quiet hours,
// and per-role defaults. Persisted to Supabase profiles.preferences.
// ============================================================================

interface ChannelPrefs {
  email: boolean
  sms: boolean
  whatsapp: boolean
  push: boolean
  in_app: boolean
}

interface TypePrefs {
  exam_assigned: boolean
  result_published: boolean
  payment_due: boolean
  system_alert: boolean
  ai_insight: boolean
  marketplace: boolean
}

interface QuietHours {
  enabled: boolean
  startTime: string
  endTime: string
}

interface Preferences {
  channels: ChannelPrefs
  types: TypePrefs
  quietHours: QuietHours
}

const CHANNEL_CONFIG = [
  { key: 'email' as const, label: 'Email', icon: Mail, description: 'Receive notifications via email' },
  { key: 'sms' as const, label: 'SMS', icon: MessageSquare, description: 'Receive text message alerts' },
  { key: 'whatsapp' as const, label: 'WhatsApp', icon: Smartphone, description: 'Receive WhatsApp messages' },
  { key: 'push' as const, label: 'Push', icon: Globe, description: 'Browser and mobile push notifications' },
  { key: 'in_app' as const, label: 'In-App', icon: Monitor, description: 'Show notifications inside the app' },
]

const TYPE_CONFIG = [
  { key: 'exam_assigned' as const, label: 'Exam Assigned', icon: FileText, description: 'When a new exam is assigned to you' },
  { key: 'result_published' as const, label: 'Result Published', icon: CheckCircle2, description: 'When exam results are published' },
  { key: 'payment_due' as const, label: 'Payment Due', icon: DollarSign, description: 'Payment reminders and due dates' },
  { key: 'system_alert' as const, label: 'System Alert', icon: AlertTriangle, description: 'Platform updates and maintenance' },
  { key: 'ai_insight' as const, label: 'AI Insight', icon: Sparkles, description: 'AI-powered recommendations and tips' },
  { key: 'marketplace' as const, label: 'Marketplace', icon: Store, description: 'New items and offers in marketplace' },
]

const ROLE_DEFAULTS: Record<string, Preferences> = {
  student: {
    channels: { email: true, sms: false, whatsapp: false, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: true, system_alert: false, ai_insight: true, marketplace: false },
    quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
  },
  teacher: {
    channels: { email: true, sms: false, whatsapp: false, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: false, system_alert: true, ai_insight: true, marketplace: false },
    quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
  },
  school_admin: {
    channels: { email: true, sms: true, whatsapp: false, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: true, system_alert: true, ai_insight: true, marketplace: true },
    quietHours: { enabled: false, startTime: '23:00', endTime: '06:00' },
  },
  super_admin: {
    channels: { email: true, sms: true, whatsapp: true, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: true, system_alert: true, ai_insight: true, marketplace: true },
    quietHours: { enabled: false, startTime: '23:00', endTime: '06:00' },
  },
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  school_admin: 'School Admin',
  super_admin: 'Super Admin',
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>(ROLE_DEFAULTS.student)
  const [role, setRole] = useState<string>('student')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load preferences from Supabase
  const loadPreferences = useCallback(async () => {
    const supabase = createClientOrNull()
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Get user role from profile
    const { data: profile } = await supabase
      .from('users')
      .select('role, settings')
      .eq('id', user.id)
      .maybeSingle()

    const profileData = profile as { role?: string; settings?: Record<string, unknown> } | null
    const userRole = profileData?.role || 'student'
    setRole(userRole)

    // Load notification preferences from profile metadata
    if (profileData?.settings) {
      const prefs = profileData.settings as { notificationPreferences?: Preferences }
      if (prefs.notificationPreferences) {
        setPreferences(prefs.notificationPreferences)
      } else {
        setPreferences(ROLE_DEFAULTS[userRole] || ROLE_DEFAULTS.student)
      }
    } else {
      setPreferences(ROLE_DEFAULTS[userRole] || ROLE_DEFAULTS.student)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClientOrNull()
      if (!supabase) throw new Error('Supabase not configured')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current preferences and merge
      const { data: profile } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {}

      const { error } = await supabase
        .from('users')
        .update({
          preferences: { ...currentPrefs, notificationPreferences: preferences },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Notification preferences saved')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save preferences'
      toast.error('Save failed', { description: message })
    } finally {
      setSaving(false)
    }
  }

  const handleResetToRoleDefaults = () => {
    const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.student
    setPreferences(defaults)
    toast.info('Reset to role defaults', { description: `Applied ${ROLE_LABELS[role] || role} defaults` })
  }

  const updateChannel = (key: keyof ChannelPrefs, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      channels: { ...prev.channels, [key]: value },
    }))
  }

  const updateType = (key: keyof TypePrefs, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      types: { ...prev.types, [key]: value },
    }))
  }

  const updateQuietHours = (updates: Partial<QuietHours>) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, ...updates },
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Preferences</h1>
          <p className="text-muted-foreground mt-1">
            Configure how and when you receive notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{ROLE_LABELS[role] || role}</Badge>
          <Button variant="outline" size="sm" onClick={handleResetToRoleDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels" className="gap-2">
            <Globe className="h-4 w-4 hidden sm:block" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-2">
            <Bell className="h-4 w-4 hidden sm:block" />
            Types
          </TabsTrigger>
          <TabsTrigger value="quiet" className="gap-2">
            <Moon className="h-4 w-4 hidden sm:block" />
            Quiet Hours
          </TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose which channels you want to receive notifications on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {CHANNEL_CONFIG.map((channel, idx) => {
                const Icon = channel.icon
                return (
                  <div key={channel.key}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">{channel.label}</Label>
                          <p className="text-xs text-muted-foreground">{channel.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.channels[channel.key]}
                        onCheckedChange={(checked) => updateChannel(channel.key, checked)}
                      />
                    </div>
                    {idx < CHANNEL_CONFIG.length - 1 && <Separator />}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Select which types of notifications you want to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {TYPE_CONFIG.map((type, idx) => {
                const Icon = type.icon
                return (
                  <div key={type.key}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">{type.label}</Label>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.types[type.key]}
                        onCheckedChange={(checked) => updateType(type.key, checked)}
                      />
                    </div>
                    {idx < TYPE_CONFIG.length - 1 && <Separator />}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiet Hours Tab */}
        <TabsContent value="quiet">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Suppress non-urgent notifications during specified hours.
                Urgent notifications (like system alerts) will still come through.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Mute non-urgent notifications during set times
                  </p>
                </div>
                <Switch
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) => updateQuietHours({ enabled: checked })}
                />
              </div>

              {preferences.quietHours.enabled && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quietStart">Start Time</Label>
                      <Input
                        id="quietStart"
                        type="time"
                        value={preferences.quietHours.startTime}
                        onChange={(e) => updateQuietHours({ startTime: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Notifications will be muted from this time
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quietEnd">End Time</Label>
                      <Input
                        id="quietEnd"
                        type="time"
                        value={preferences.quietHours.endTime}
                        onChange={(e) => updateQuietHours({ endTime: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Notifications resume at this time
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Quiet Hours Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From <strong>{preferences.quietHours.startTime}</strong> to{' '}
                      <strong>{preferences.quietHours.endTime}</strong> — only urgent
                      system alerts will be delivered.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Role Defaults Reference */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Role-Based Defaults</CardTitle>
              <CardDescription>
                Default notification settings applied to each role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(ROLE_DEFAULTS).map(([roleKey, defaults]) => (
                  <div key={roleKey} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ROLE_LABELS[roleKey]}</span>
                      {roleKey === role && (
                        <Badge variant="secondary" className="text-[10px]">Current</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        Channels:{' '}
                        {Object.entries(defaults.channels)
                          .filter(([, v]) => v)
                          .map(([k]) => k.replace('_', '-'))
                          .join(', ')}
                      </div>
                      <div>
                        Types:{' '}
                        {Object.entries(defaults.types)
                          .filter(([, v]) => v)
                          .length}{' '}
                        of {Object.keys(defaults.types).length} enabled
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
