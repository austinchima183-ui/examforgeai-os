// ============================================================================
// ExamForge AI — API Key Management Service
// ============================================================================
// Handles API key creation, validation, rotation, revocation, and scope
// checking. Keys are SHA-256 hashed before storage; only the prefix (first 8
// characters after the key prefix) is stored for identification.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import type {
  APIKey,
  APIScope,
  CreateAPIKeyInput,
  CreateAPIKeyResult,
  RateLimitConfig,
  ValidateAPIKeyResult,
} from './types';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const KEY_PREFIX = 'ef_live_';
const KEY_PREFIX_TEST = 'ef_test_';
const KEY_LENGTH = 32; // Random bytes for the key body
const PREFIX_DISPLAY_LENGTH = 8; // Characters shown after the prefix for identification
const HASH_ALGORITHM = 'SHA-256';

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
  burstLimit: 10,
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Generate cryptographically secure random hex string */
function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash a value using SHA-256 */
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now().toString(36)}_${generateRandomHex(8)}`;
}

/** Convert scopes to a JSON-serializable format for database storage */
function serializeScopes(scopes: APIScope[]): string {
  return JSON.stringify(scopes);
}

/** Parse scopes from database storage */
function deserializeScopes(json: string): APIScope[] {
  try {
    return JSON.parse(json) as APIScope[];
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// API Key Service
// ----------------------------------------------------------------------------

/**
 * Create a new API key for an organization.
 * The raw key is returned only once; only the hash and prefix are stored.
 */
export async function createAPIKey(input: CreateAPIKeyInput): Promise<CreateAPIKeyResult> {
  const supabase = await createClient();

  // Generate raw key material
  const randomBody = generateRandomHex(KEY_LENGTH);
  const rawKey = `${KEY_PREFIX}${randomBody}`;

  // Derive hash and display prefix
  const hashedKey = await hashValue(rawKey);
  const prefix = `${KEY_PREFIX}${randomBody.slice(0, PREFIX_DISPLAY_LENGTH)}...`;

  const id = generateId();
  const rateLimit: RateLimitConfig = {
    requestsPerMinute: input.rateLimit?.requestsPerMinute ?? DEFAULT_RATE_LIMIT.requestsPerMinute,
    requestsPerHour: input.rateLimit?.requestsPerHour ?? DEFAULT_RATE_LIMIT.requestsPerHour,
    requestsPerDay: input.rateLimit?.requestsPerDay ?? DEFAULT_RATE_LIMIT.requestsPerDay,
    burstLimit: input.rateLimit?.burstLimit ?? DEFAULT_RATE_LIMIT.burstLimit,
  };

  const apiKey: APIKey = {
    id,
    orgId: input.orgId,
    name: input.name,
    key: hashedKey,
    prefix,
    scopes: input.scopes,
    rateLimit,
    expiresAt: input.expiresAt ?? null,
    lastUsedAt: null,
    createdBy: input.createdBy,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { error } = await supabase.from('api_keys').insert({
    id,
    org_id: input.orgId,
    name: input.name,
    key: hashedKey,
    prefix,
    scopes: serializeScopes(input.scopes),
    rate_limit: rateLimit,
    expires_at: input.expiresAt?.toISOString() ?? null,
    last_used_at: null,
    created_by: input.createdBy,
    revoked_at: null,
    created_at: apiKey.createdAt.toISOString(),
    updated_at: apiKey.updatedAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return { apiKey, rawKey };
}

/**
 * Validate an API key by hashing it and looking it up in the database.
 * Also checks expiration and revocation. Updates lastUsedAt on success.
 */
export async function validateAPIKey(rawKey: string): Promise<ValidateAPIKeyResult> {
  const supabase = await createClient();

  // Check key prefix format
  if (!rawKey.startsWith(KEY_PREFIX) && !rawKey.startsWith(KEY_PREFIX_TEST)) {
    return { valid: false, apiKey: null, error: 'Invalid key format' };
  }

  const hashedKey = await hashValue(rawKey);

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key', hashedKey)
    .is('revoked_at', null)
    .single();

  if (error || !data) {
    return { valid: false, apiKey: null, error: 'API key not found or revoked' };
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, apiKey: null, error: 'API key has expired' };
  }

  // Update lastUsedAt (fire-and-forget)
  const now = new Date();
  await supabase
    .from('api_keys')
    .update({ last_used_at: now.toISOString(), updated_at: now.toISOString() })
    .eq('id', data.id);

  const apiKey: APIKey = {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    key: data.key,
    prefix: data.prefix,
    scopes: deserializeScopes(data.scopes),
    rateLimit: data.rate_limit,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    lastUsedAt: now,
    createdBy: data.created_by,
    revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: now,
  };

  return { valid: true, apiKey };
}

/**
 * Revoke an API key (soft delete by setting revokedAt).
 */
export async function revokeAPIKey(keyId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: now, updated_at: now })
    .eq('id', keyId);

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }
}

/**
 * List all API keys for an organization.
 * Returns metadata only — the hashed key and secret are not exposed.
 */
export async function listAPIKeys(orgId: string): Promise<APIKey[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, org_id, name, prefix, scopes, rate_limit, expires_at, last_used_at, created_by, revoked_at, created_at, updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    key: '', // Never expose the hashed key in listings
    prefix: row.prefix,
    scopes: deserializeScopes(row.scopes),
    rateLimit: row.rate_limit,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    createdBy: row.created_by,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Rotate an API key — generates a new key and deprecates the old one.
 * The old key is revoked and a new key record is created.
 */
export async function rotateAPIKey(keyId: string): Promise<CreateAPIKeyResult> {
  const supabase = await createClient();

  // Fetch existing key
  const { data: existing, error: fetchError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', keyId)
    .single();

  if (fetchError || !existing) {
    throw new Error('API key not found');
  }

  // Revoke the old key
  await revokeAPIKey(keyId);

  // Create a replacement key with the same configuration
  const result = await createAPIKey({
    orgId: existing.org_id,
    name: `${existing.name} (rotated)`,
    scopes: deserializeScopes(existing.scopes),
    expiresAt: existing.expires_at ? new Date(existing.expires_at) : undefined,
    rateLimit: existing.rate_limit,
    createdBy: existing.created_by,
  });

  return result;
}

/**
 * Check if an API key has all the required scopes.
 * Returns true if every required scope is present on the key.
 */
export async function checkAPIKeyScopes(
  keyId: string,
  requiredScopes: APIScope[]
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('scopes')
    .eq('id', keyId)
    .is('revoked_at', null)
    .single();

  if (error || !data) {
    return false;
  }

  const keyScopes = deserializeScopes(data.scopes);

  return requiredScopes.every((required) =>
    keyScopes.some(
      (scope) =>
        scope.resource === required.resource &&
        (scope.permission === required.permission ||
          (required.permission === 'read' && scope.permission === 'write') ||
          (required.permission === 'read' && scope.permission === 'admin') ||
          (required.permission === 'write' && scope.permission === 'admin'))
    )
  );
}

/**
 * Update the rate limit configuration for an API key.
 */
export async function updateAPIKeyRateLimit(
  keyId: string,
  config: Partial<RateLimitConfig>
): Promise<RateLimitConfig> {
  const supabase = await createClient();

  // Fetch current config
  const { data: existing, error: fetchError } = await supabase
    .from('api_keys')
    .select('rate_limit')
    .eq('id', keyId)
    .single();

  if (fetchError || !existing) {
    throw new Error('API key not found');
  }

  const current: RateLimitConfig = existing.rate_limit;
  const updated: RateLimitConfig = {
    requestsPerMinute: config.requestsPerMinute ?? current.requestsPerMinute,
    requestsPerHour: config.requestsPerHour ?? current.requestsPerHour,
    requestsPerDay: config.requestsPerDay ?? current.requestsPerDay,
    burstLimit: config.burstLimit ?? current.burstLimit,
  };

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('api_keys')
    .update({ rate_limit: updated, updated_at: now })
    .eq('id', keyId);

  if (updateError) {
    throw new Error(`Failed to update rate limit: ${updateError.message}`);
  }

  return updated;
}
