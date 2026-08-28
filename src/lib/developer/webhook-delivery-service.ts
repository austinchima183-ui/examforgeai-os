// ============================================================================
// ExamForge AI — Webhook Delivery Service
// ============================================================================
// Manages webhook deliveries with automatic retry using exponential backoff
// (1s, 2s, 4s, 8s, 16s). Records delivery attempts and statistics in Supabase.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import type {
  WebhookDelivery,
  WebhookDeliveryFilters,
  WebhookDeliveryResult,
  WebhookDeliveryStats,
} from './types';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const MAX_RETRY_ATTEMPTS = 5;
const WEBHOOK_TIMEOUT_MS = 10_000; // 10 second timeout per delivery
const BACKOFF_BASE_MS = 1000; // 1 second base for exponential backoff

const DB_DELIVERIES_TABLE = 'webhook_deliveries';
const DB_WEBHOOKS_TABLE = 'webhooks';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Generate a unique ID using cryptographically secure randomness */
function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate the next retry time using exponential backoff.
 * Backoff sequence: 1s, 2s, 4s, 8s, 16s (capped at 16s).
 */
export function calculateNextRetry(attempt: number): Date {
  const delayMs = Math.min(
    BACKOFF_BASE_MS * Math.pow(2, attempt),
    16_000 // Cap at 16 seconds
  );
  return new Date(Date.now() + delayMs);
}

// ----------------------------------------------------------------------------
// Webhook Delivery
// ----------------------------------------------------------------------------

/**
 * Deliver a webhook event with automatic retry on failure.
 * Uses exponential backoff for retries (1s, 2s, 4s, 8s, 16s).
 */
export async function deliverWebhook(
  webhookId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<WebhookDeliveryResult> {
  const supabase = await createClient();

  // Fetch webhook configuration
  const { data: webhook, error: webhookError } = await supabase
    .from(DB_WEBHOOKS_TABLE)
    .select('url, secret, active')
    .eq('id', webhookId)
    .single();

  if (webhookError || !webhook) {
    const delivery = createFailedDelivery(webhookId, event, payload, 0, 'Webhook not found');
    return { delivered: false, delivery, error: 'Webhook not found' };
  }

  if (!webhook.active) {
    const delivery = createFailedDelivery(webhookId, event, payload, 0, 'Webhook is inactive');
    return { delivered: false, delivery, error: 'Webhook is inactive' };
  }

  // Attempt delivery
  const deliveryId = generateId();
  const startTime = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': deliveryId,
        'X-Webhook-Signature': await generateSignature(
          JSON.stringify(payload),
          webhook.secret
        ),
      },
      body: JSON.stringify({
        id: deliveryId,
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const durationMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');
    const succeeded = response.status >= 200 && response.status < 300;

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId,
      event,
      payload,
      statusCode: response.status,
      response: responseBody.slice(0, 1000), // Truncate large responses
      durationMs,
      nextRetryAt: succeeded ? null : calculateNextRetry(1),
      attempts: 1,
      succeeded,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Persist delivery record
    await persistDelivery(supabase, delivery);

    return { delivered: succeeded, delivery };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId,
      event,
      payload,
      statusCode: null,
      response: errorMessage,
      durationMs,
      nextRetryAt: calculateNextRetry(1),
      attempts: 1,
      succeeded: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await persistDelivery(supabase, delivery);

    return { delivered: false, delivery, error: errorMessage };
  }
}

/**
 * Create a failed delivery record without making an HTTP request.
 */
function createFailedDelivery(
  webhookId: string,
  event: string,
  payload: Record<string, unknown>,
  attempts: number,
  reason: string
): WebhookDelivery {
  return {
    id: generateId(),
    webhookId,
    event,
    payload,
    statusCode: null,
    response: reason,
    durationMs: null,
    nextRetryAt: null,
    attempts,
    succeeded: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Generate an HMAC-SHA256 signature for the webhook payload.
 */
async function generateSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  return `sha256=${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Persist a delivery record to Supabase.
 */
async function persistDelivery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  delivery: WebhookDelivery
): Promise<void> {
  const { error } = await supabase.from(DB_DELIVERIES_TABLE).insert({
    id: delivery.id,
    webhook_id: delivery.webhookId,
    event: delivery.event,
    payload: delivery.payload,
    status_code: delivery.statusCode,
    response: delivery.response,
    duration_ms: delivery.durationMs,
    next_retry_at: delivery.nextRetryAt?.toISOString() ?? null,
    attempts: delivery.attempts,
    succeeded: delivery.succeeded,
    created_at: delivery.createdAt.toISOString(),
    updated_at: delivery.updatedAt.toISOString(),
  });

  if (error) {
    console.error('Failed to persist webhook delivery:', error.message);
  }
}

// ----------------------------------------------------------------------------
// Delivery Queries
// ----------------------------------------------------------------------------

/**
 * Get a specific webhook delivery by ID.
 */
export async function getWebhookDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(DB_DELIVERIES_TABLE)
    .select('*')
    .eq('id', deliveryId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDeliveryRow(data);
}

/**
 * List webhook deliveries for a webhook with optional filters and pagination.
 */
export async function listWebhookDeliveries(
  webhookId: string,
  filters: WebhookDeliveryFilters = {}
): Promise<WebhookDelivery[]> {
  const supabase = await createClient();

  let query = supabase
    .from(DB_DELIVERIES_TABLE)
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false });

  if (filters.event) {
    query = query.eq('event', filters.event);
  }
  if (filters.succeeded !== undefined) {
    query = query.eq('succeeded', filters.succeeded);
  }
  if (filters.fromCreatedAt) {
    query = query.gte('created_at', filters.fromCreatedAt.toISOString());
  }
  if (filters.toCreatedAt) {
    query = query.lte('created_at', filters.toCreatedAt.toISOString());
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list webhook deliveries: ${error.message}`);
  }

  return (data ?? []).map(mapDeliveryRow);
}

/**
 * Retry a failed webhook delivery.
 * Re-delivers the webhook with the original payload, incrementing the attempt counter.
 */
export async function retryWebhookDelivery(deliveryId: string): Promise<WebhookDeliveryResult> {
  const supabase = await createClient();

  // Fetch the original delivery
  const { data: original, error: fetchError } = await supabase
    .from(DB_DELIVERIES_TABLE)
    .select('*')
    .eq('id', deliveryId)
    .single();

  if (fetchError || !original) {
    throw new Error('Webhook delivery not found');
  }

  if (original.succeeded) {
    throw new Error('Cannot retry a successful delivery');
  }

  if (original.attempts >= MAX_RETRY_ATTEMPTS) {
    throw new Error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`);
  }

  // Fetch webhook URL
  const { data: webhook, error: webhookError } = await supabase
    .from(DB_WEBHOOKS_TABLE)
    .select('url, secret, active')
    .eq('id', original.webhook_id)
    .single();

  if (webhookError || !webhook || !webhook.active) {
    throw new Error('Webhook not found or inactive');
  }

  // Attempt re-delivery
  const newDeliveryId = generateId();
  const startTime = Date.now();
  const newAttempt = original.attempts + 1;

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': original.event,
        'X-Webhook-Delivery': newDeliveryId,
        'X-Webhook-Signature': await generateSignature(
          JSON.stringify(original.payload),
          webhook.secret
        ),
      },
      body: JSON.stringify({
        id: newDeliveryId,
        event: original.event,
        timestamp: new Date().toISOString(),
        data: original.payload,
      }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const durationMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');
    const succeeded = response.status >= 200 && response.status < 300;

    const delivery: WebhookDelivery = {
      id: newDeliveryId,
      webhookId: original.webhook_id,
      event: original.event,
      payload: original.payload,
      statusCode: response.status,
      response: responseBody.slice(0, 1000),
      durationMs,
      nextRetryAt: succeeded ? null : calculateNextRetry(newAttempt),
      attempts: newAttempt,
      succeeded,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Persist new delivery and update original
    await persistDelivery(supabase, delivery);
    await supabase
      .from(DB_DELIVERIES_TABLE)
      .update({
        attempts: newAttempt,
        next_retry_at: succeeded ? null : calculateNextRetry(newAttempt).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    return { delivered: succeeded, delivery };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    const delivery: WebhookDelivery = {
      id: newDeliveryId,
      webhookId: original.webhook_id,
      event: original.event,
      payload: original.payload,
      statusCode: null,
      response: errorMessage,
      durationMs,
      nextRetryAt: calculateNextRetry(newAttempt),
      attempts: newAttempt,
      succeeded: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await persistDelivery(supabase, delivery);

    return { delivered: false, delivery, error: errorMessage };
  }
}

// ----------------------------------------------------------------------------
// Delivery Statistics
// ----------------------------------------------------------------------------

/**
 * Get aggregated delivery statistics for a webhook.
 */
export async function getWebhookDeliveryStats(
  webhookId: string
): Promise<WebhookDeliveryStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(DB_DELIVERIES_TABLE)
    .select('succeeded, duration_ms, attempts')
    .eq('webhook_id', webhookId);

  if (error) {
    throw new Error(`Failed to get webhook delivery stats: ${error.message}`);
  }

  const deliveries = data ?? [];

  if (deliveries.length === 0) {
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
      avgLatencyMs: 0,
      avgAttempts: 0,
    };
  }

  const totalDeliveries = deliveries.length;
  const successfulDeliveries = deliveries.filter((d) => d.succeeded).length;
  const failedDeliveries = totalDeliveries - successfulDeliveries;
  const successRate = successfulDeliveries / totalDeliveries;

  const latencies = deliveries
    .filter((d) => d.duration_ms !== null)
    .map((d) => d.duration_ms as number);

  const avgLatencyMs =
    latencies.length > 0
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      : 0;

  const avgAttempts =
    deliveries.reduce((sum, d) => sum + d.attempts, 0) / totalDeliveries;

  return {
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    successRate,
    avgLatencyMs: Math.round(avgLatencyMs),
    avgAttempts: Math.round(avgAttempts * 100) / 100,
  };
}

// ----------------------------------------------------------------------------
// Row Mapping
// ----------------------------------------------------------------------------

/**
 * Map a database row to a WebhookDelivery object.
 */
function mapDeliveryRow(row: Record<string, unknown>): WebhookDelivery {
  return {
    id: row.id as string,
    webhookId: row.webhook_id as string,
    event: row.event as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    statusCode: (row.status_code as number) ?? null,
    response: (row.response as string) ?? null,
    durationMs: (row.duration_ms as number) ?? null,
    nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at as string) : null,
    attempts: row.attempts as number,
    succeeded: row.succeeded as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
