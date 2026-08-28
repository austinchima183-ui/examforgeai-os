// ============================================================================
// ExamForge AI — Firebase Cloud Messaging (FCM) Push Provider
// ============================================================================
// Sends push notifications via Firebase Cloud Messaging (FCM) using the
// HTTP v1 API. Includes FCM token management (register, invalidate).
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { DeliveryResult, MobilePlatform } from '../types'

const log = createLogger('notifications:push:firebase')

// ──────────────────────────────────────────────────────────────
// Environment
// ──────────────────────────────────────────────────────────────

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? ''
const FCM_BASE_URL = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** FCM push notification payload. */
export interface FcmPayload {
  /** Notification title. */
  title: string
  /** Notification body text. */
  body: string
  /** URL to open on click. */
  clickUrl?: string
  /** Icon URL. */
  icon?: string
  /** Additional data payload. */
  data?: Record<string, string>
}

/** FCM API response. */
interface FcmSendResponse {
  name: string
}

/** FCM API error. */
interface FcmErrorResponse {
  error?: {
    code: number
    message: string
    status: string
  }
}

// ──────────────────────────────────────────────────────────────
// Get Access Token
// ──────────────────────────────────────────────────────────────

/**
 * Obtain a Google OAuth2 access token for FCM.
 *
 * In production, this uses the FIREBASE_SERVICE_ACCOUNT_KEY env var
 * or the Application Default Credentials (ADC) when running on GCP.
 * For now, we read a pre-configured access token from the environment
 * or use the legacy server key approach.
 */
async function getAccessToken(): Promise<string | null> {
  // Option 1: Pre-configured FCM access token (refreshed by a sidecar)
  const fcmToken = process.env.FCM_ACCESS_TOKEN
  if (fcmToken) return fcmToken

  // Option 2: Legacy server key (not recommended for new projects)
  const serverKey = process.env.FIREBASE_SERVER_KEY
  if (serverKey) return serverKey

  log.warn('No FCM access token or server key configured')
  return null
}

// ──────────────────────────────────────────────────────────────
// Send Push Notification
// ──────────────────────────────────────────────────────────────

/**
 * Send a push notification via Firebase Cloud Messaging (FCM).
 *
 * @param token   — FCM device registration token
 * @param payload — Notification payload
 * @returns DeliveryResult with FCM message name on success
 */
export async function sendPushNotification(
  token: string,
  payload: FcmPayload
): Promise<DeliveryResult> {
  if (!FIREBASE_PROJECT_ID) {
    log.error('FIREBASE_PROJECT_ID is not configured')
    return { success: false, status: 'failed', error: 'Firebase project ID not configured' }
  }

  const accessToken = await getAccessToken()
  if (!accessToken) {
    return { success: false, status: 'failed', error: 'FCM access token not available' }
  }

  try {
    const message = {
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.icon ? { image: payload.icon } : {}),
        },
        data: {
          ...(payload.clickUrl ? { click_url: payload.clickUrl } : {}),
          ...(payload.data ?? {}),
        },
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      },
    }

    const response = await fetch(FCM_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorBody = (await response.json()) as FcmErrorResponse
      const errorMessage = errorBody.error?.message || `FCM API error: ${response.status}`

      // Check for invalid token errors
      const isInvalidToken =
        errorMessage.includes('UNREGISTERED') ||
        errorMessage.includes('invalid-registration-token') ||
        errorMessage.includes('NotRegistered')

      if (isInvalidToken) {
        log.warn('FCM token is invalid, will invalidate', { tokenPrefix: token.slice(0, 10) })
        await invalidateToken(token)
        return { success: false, status: 'bounced', error: errorMessage, metadata: { invalidToken: true } }
      }

      log.error('FCM send failed', undefined, {
        tokenPrefix: token.slice(0, 10),
        statusCode: response.status,
        fcmError: errorMessage,
      })

      return { success: false, status: 'failed', error: errorMessage }
    }

    const data = (await response.json()) as FcmSendResponse
    log.info('Push sent via FCM', { messageName: data.name, tokenPrefix: token.slice(0, 10) })

    return {
      success: true,
      status: 'sent',
      providerId: data.name,
      metadata: { provider: 'firebase', project: FIREBASE_PROJECT_ID },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown FCM error'
    log.error('FCM fetch exception', error, { tokenPrefix: token.slice(0, 10) })
    return { success: false, status: 'failed', error: message }
  }
}

// ──────────────────────────────────────────────────────────────
// Register Push Token
// ──────────────────────────────────────────────────────────────

/**
 * Register or update an FCM push token for a user.
 * Upserts into the push_tokens Supabase table.
 *
 * @param userId   — User ID
 * @param token    — FCM device registration token
 * @param platform — Device platform (android, ios, web)
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: MobilePlatform
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )

    if (error) {
      log.error('Failed to register push token', error, { userId, platform })
      return { error: error.message }
    }

    log.info('Push token registered', { userId, platform })
    return { error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error registering push token'
    log.error('Push token registration exception', error, { userId, platform })
    return { error: message }
  }
}

// ──────────────────────────────────────────────────────────────
// Invalidate Token
// ──────────────────────────────────────────────────────────────

/**
 * Mark an FCM token as invalid (inactive).
 * Called when FCM returns an UNREGISTERED or invalid-token error.
 *
 * @param token — The FCM token to invalidate
 */
export async function invalidateToken(token: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('push_tokens')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('token', token)

    if (error) {
      log.error('Failed to invalidate push token', error, { tokenPrefix: token.slice(0, 10) })
      return { error: error.message }
    }

    log.info('Push token invalidated', { tokenPrefix: token.slice(0, 10) })
    return { error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error invalidating token'
    log.error('Token invalidation exception', error, { tokenPrefix: token.slice(0, 10) })
    return { error: message }
  }
}
