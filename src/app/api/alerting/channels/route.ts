// ============================================================================
// ExamForge AI — Alert Channel Config API Route
// ============================================================================
// GET  /api/alerting/channels  — List configured channels
// POST /api/alerting/channels  — Test channel (send test alert)
// PUT  /api/alerting/channels  — Upsert channel config
// ============================================================================
// Persistence: Supabase `alert_channels` table (primary).
// Falls back to environment-based defaults on DB errors.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { createLogger } from '@/lib/observability/logger'
import { createClient } from '@/lib/supabase/server'
import type {
  AlertChannelConfig,
  SlackChannelConfig,
  DiscordChannelConfig,
  TeamsChannelConfig,
  EmailChannelConfig,
  SmsChannelConfig,
  WebhookChannelConfig,
} from '@/lib/alerting/types'
import { deliverAlert } from '@/lib/alerting/delivery-engine'
import type { AlertIncident } from '@/lib/alerting/types'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

const log = createLogger('api:alerting:channels')

// ──────────────────────────────────────────────────────────────
// Environment-based default channels (used as fallback / seed)
// ──────────────────────────────────────────────────────────────

function getEnvDefaultChannels(): AlertChannelConfig[] {
  const channels: AlertChannelConfig[] = []
  const now = new Date().toISOString()

  const slackWebhook = process.env.ALERT_SLACK_WEBHOOK_URL
  if (slackWebhook) {
    channels.push({
      id: 'slack',
      channel: 'slack',
      enabled: true,
      config: { webhookUrl: slackWebhook } as SlackChannelConfig,
      updatedAt: now,
    })
  }

  const discordWebhook = process.env.ALERT_DISCORD_WEBHOOK_URL
  if (discordWebhook) {
    channels.push({
      id: 'discord',
      channel: 'discord',
      enabled: true,
      config: { webhookUrl: discordWebhook } as DiscordChannelConfig,
      updatedAt: now,
    })
  }

  const teamsWebhook = process.env.ALERT_TEAMS_WEBHOOK_URL
  if (teamsWebhook) {
    channels.push({
      id: 'microsoft_teams',
      channel: 'microsoft_teams',
      enabled: true,
      config: { webhookUrl: teamsWebhook } as TeamsChannelConfig,
      updatedAt: now,
    })
  }

  const alertEmailRecipients = process.env.ALERT_EMAIL_RECIPIENTS
  if (alertEmailRecipients) {
    channels.push({
      id: 'email',
      channel: 'email',
      enabled: true,
      config: {
        recipients: alertEmailRecipients.split(',').map(s => s.trim()),
      } as EmailChannelConfig,
      updatedAt: now,
    })
  }

  const alertSmsRecipients = process.env.ALERT_SMS_RECIPIENTS
  if (alertSmsRecipients) {
    channels.push({
      id: 'sms',
      channel: 'sms',
      enabled: true,
      config: {
        recipients: alertSmsRecipients.split(',').map(s => s.trim()),
      } as SmsChannelConfig,
      updatedAt: now,
    })
  }

  return channels
}

// ──────────────────────────────────────────────────────────────
// Supabase persistence helpers
// ──────────────────────────────────────────────────────────────

/** Fetch all channel configs from Supabase. Returns null on error / missing table. */
async function fetchChannelsFromDB(): Promise<AlertChannelConfig[] | null> {
  try {
    const sb = await createClient()
    const result = await sb
      .from('alert_channels')
      .select('*')
      .order('updated_at', { ascending: false })

    if (result.error) {
      log.warn('Supabase alert_channels query failed', { message: result.error.message, code: result.error.code })
      return null
    }

    if (!result.data || result.data.length === 0) {
      return []
    }

    return result.data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      channel: row.channel as string,
      enabled: row.enabled as boolean,
      config: (row.config ?? {}) as unknown as AlertChannelConfig['config'],
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    })) as AlertChannelConfig[]
  } catch (error) {
    log.warn('Failed to connect to Supabase for alert_channels', { error: String(error) })
    return null
  }
}

/** Upsert a channel config to Supabase. Returns true on success. */
async function upsertChannelToDB(config: AlertChannelConfig): Promise<boolean> {
  try {
    const sb = await createClient()
    const result = await sb
      .from('alert_channels')
      .upsert({
        id: config.id,
        channel: config.channel,
        enabled: config.enabled,
        config: config.config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single()

    if (result.error) {
      log.warn('Supabase alert_channels upsert failed', { message: result.error.message, code: result.error.code })
      return false
    }
    return !!result.data
  } catch (error) {
    log.warn('Failed to upsert alert_channel to Supabase', { error: String(error) })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Internal accessor (for bridge.ts)
// ──────────────────────────────────────────────────────────────

/**
 * Get all configured channel configs (for internal use by bridge.ts).
 * Queries Supabase first, falls back to env defaults.
 */
export async function getConfiguredChannels(): Promise<AlertChannelConfig[]> {
  const dbChannels = await fetchChannelsFromDB()
  if (dbChannels !== null && dbChannels.length > 0) {
    return dbChannels
  }
  // Fallback: if DB returned empty or errored, use env defaults
  return getEnvDefaultChannels()
}

// ──────────────────────────────────────────────────────────────
// GET — List Configured Channels
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const channels = await getConfiguredChannels()

    const mapped = channels.map(config => ({
      id: config.id,
      channel: config.channel,
      enabled: config.enabled,
      updatedAt: config.updatedAt,
      // Redact sensitive config details
      configSummary: getChannelConfigSummary(config),
    }))

    return NextResponse.json({ channels: mapped, error: null })
  } catch (error) {
    log.error('Failed to list channels', error)
    return NextResponse.json(
      { channels: [], error: 'Failed to list channels' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// POST — Test Channel
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const body = await request.json()
    const channelId = body.channelId as string | undefined

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId is required' },
        { status: 400 }
      )
    }

    // Look up channel from Supabase (primary) or env defaults (fallback)
    const allChannels = await getConfiguredChannels()
    const config = allChannels.find(c => c.id === channelId)

    if (!config) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    // Create a test alert incident
    const testAlert: AlertIncident = {
      id: `test_${Date.now()}`,
      title: 'Test Alert',
      description: 'This is a test alert to verify channel connectivity.',
      severity: 'info',
      category: 'api_failure',
      status: 'firing',
      firedAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      acknowledgedBy: null,
      assigneeId: null,
      metadata: { test: true },
      notificationAttempts: 0,
    }

    // Deliver the test alert
    const result = await deliverAlert(testAlert, [config])

    return NextResponse.json({
      result: {
        channelId,
        channel: config.channel,
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
      },
      error: null,
    })
  } catch (error) {
    log.error('Failed to test channel', error)
    return NextResponse.json(
      { error: 'Failed to test channel' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// PUT — Upsert Channel Config
// ──────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const body = await request.json()
    const { id, channel, enabled, config: channelConfig } = body as {
      id?: string
      channel?: string
      enabled?: boolean
      config?: Record<string, unknown>
    }

    if (!id || !channel) {
      return NextResponse.json(
        { error: 'id and channel are required' },
        { status: 400 }
      )
    }

    const newConfig: AlertChannelConfig = {
      id,
      channel: channel as AlertChannelConfig['channel'],
      enabled: enabled ?? true,
      config: (channelConfig ?? {}) as unknown as AlertChannelConfig['config'],
      updatedAt: new Date().toISOString(),
    }

    const persisted = await upsertChannelToDB(newConfig)

    if (!persisted) {
      log.warn('Channel upsert did not persist to DB — returning local copy')
    }

    return NextResponse.json({
      channel: {
        id: newConfig.id,
        channel: newConfig.channel,
        enabled: newConfig.enabled,
        updatedAt: newConfig.updatedAt,
        configSummary: getChannelConfigSummary(newConfig),
      },
      persisted,
      error: null,
    })
  } catch (error) {
    log.error('Failed to upsert channel', error)
    return NextResponse.json(
      { error: 'Failed to upsert channel' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Get a safe summary of channel config (redacting secrets).
 */
function getChannelConfigSummary(config: AlertChannelConfig): Record<string, unknown> {
  switch (config.channel) {
    case 'slack': {
      const c = config.config as SlackChannelConfig
      return { webhookUrl: redactUrl(c.webhookUrl), channel: c.channel }
    }
    case 'discord': {
      const c = config.config as DiscordChannelConfig
      return { webhookUrl: redactUrl(c.webhookUrl) }
    }
    case 'microsoft_teams': {
      const c = config.config as TeamsChannelConfig
      return { webhookUrl: redactUrl(c.webhookUrl) }
    }
    case 'email': {
      const c = config.config as EmailChannelConfig
      return { recipientCount: c.recipients.length, from: c.from }
    }
    case 'sms': {
      const c = config.config as SmsChannelConfig
      return { recipientCount: c.recipients.length }
    }
    case 'webhook': {
      const c = config.config as WebhookChannelConfig
      return { url: redactUrl(c.url), hasSecret: !!c.secret }
    }
    default:
      return {}
  }
}

/**
 * Redact a URL for safe display (show host and path, hide tokens).
 */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Redact path components that look like tokens
    const pathParts = parsed.pathname.split('/')
    const redactedPath = pathParts.map(part =>
      part.length > 20 ? '***' : part
    ).join('/')
    return `${parsed.protocol}//${parsed.host}${redactedPath}`
  } catch {
    return '***'
  }
}
