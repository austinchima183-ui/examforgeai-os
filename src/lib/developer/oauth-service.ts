// ============================================================================
// ExamForge AI — OAuth 2.0 Service (RFC 6749)
// ============================================================================
// Implements the Authorization Code flow with Refresh Token extension per
// RFC 6749. Client secrets are SHA-256 hashed; authorization codes and tokens
// are stored in Supabase with automatic expiration handling.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import type {
  APIScope,
  OAuthApp,
  OAuthAuthCode,
  OAuthGrantType,
  OAuthToken,
  RegisterOAuthAppInput,
  RegisterOAuthAppResult,
  ValidateOAuthTokenResult,
} from './types';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const HASH_ALGORITHM = 'SHA-256';
const AUTH_CODE_LENGTH = 32;
const CLIENT_ID_PREFIX = 'ef_oauth_';
const CLIENT_SECRET_LENGTH = 48;
const ACCESS_TOKEN_LENGTH = 32;
const REFRESH_TOKEN_LENGTH = 48;

const AUTH_CODE_EXPIRY_SECONDS = 600; // 10 minutes (RFC 6749 §4.1.2)
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY_SECONDS = 2592000; // 30 days

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

/** Serialize scopes for database storage */
function serializeScopes(scopes: APIScope[]): string {
  return JSON.stringify(scopes);
}

/** Deserialize scopes from database storage */
function deserializeScopes(json: string): APIScope[] {
  try {
    return JSON.parse(json) as APIScope[];
  } catch {
    return [];
  }
}

/** Normalize a URI for comparison (strip query string and fragment) */
function normalizeUri(uri: string): string {
  try {
    const url = new URL(uri);
    return `${url.origin}${url.pathname}`;
  } catch {
    return uri;
  }
}

// ----------------------------------------------------------------------------
// OAuth App Registration
// ----------------------------------------------------------------------------

/**
 * Register a new OAuth 2.0 application.
 * Returns the client ID and raw client secret (secret shown only once).
 */
export async function registerOAuthApp(
  input: RegisterOAuthAppInput
): Promise<RegisterOAuthAppResult> {
  const supabase = await createClient();

  const clientId = `${CLIENT_ID_PREFIX}${generateRandomHex(16)}`;
  const rawClientSecret = generateRandomHex(CLIENT_SECRET_LENGTH);
  const hashedSecret = await hashValue(rawClientSecret);
  const id = generateId();
  const now = new Date();

  const app: OAuthApp = {
    id,
    orgId: input.orgId,
    name: input.name,
    clientId,
    clientSecret: hashedSecret,
    redirectUris: input.redirectUris,
    scopes: input.scopes,
    grantTypes: input.grantTypes,
    logoUrl: input.logoUrl ?? null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from('oauth_apps').insert({
    id,
    org_id: input.orgId,
    name: input.name,
    client_id: clientId,
    client_secret: hashedSecret,
    redirect_uris: input.redirectUris,
    scopes: serializeScopes(input.scopes),
    grant_types: input.grantTypes,
    logo_url: input.logoUrl ?? null,
    created_by: input.createdBy,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to register OAuth app: ${error.message}`);
  }

  return { app, rawClientSecret };
}

/**
 * Get an OAuth application by ID.
 */
export async function getOAuthApp(appId: string): Promise<OAuthApp | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('oauth_apps')
    .select('*')
    .eq('id', appId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    clientId: data.client_id,
    clientSecret: data.client_secret,
    redirectUris: data.redirect_uris,
    scopes: deserializeScopes(data.scopes),
    grantTypes: data.grant_types as OAuthGrantType[],
    logoUrl: data.logo_url,
    createdBy: data.created_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Update an OAuth application.
 */
export async function updateOAuthApp(
  appId: string,
  updates: Partial<Pick<OAuthApp, 'name' | 'redirectUris' | 'scopes' | 'grantTypes' | 'logoUrl'>>
): Promise<OAuthApp> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { updated_at: now };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.redirectUris !== undefined) updateData.redirect_uris = updates.redirectUris;
  if (updates.scopes !== undefined) updateData.scopes = serializeScopes(updates.scopes);
  if (updates.grantTypes !== undefined) updateData.grant_types = updates.grantTypes;
  if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

  const { data, error } = await supabase
    .from('oauth_apps')
    .update(updateData)
    .eq('id', appId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update OAuth app: ${error?.message ?? 'Not found'}`);
  }

  return {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    clientId: data.client_id,
    clientSecret: data.client_secret,
    redirectUris: data.redirect_uris,
    scopes: deserializeScopes(data.scopes),
    grantTypes: data.grant_types as OAuthGrantType[],
    logoUrl: data.logo_url,
    createdBy: data.created_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Delete an OAuth application.
 */
export async function deleteOAuthApp(appId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('oauth_apps').delete().eq('id', appId);

  if (error) {
    throw new Error(`Failed to delete OAuth app: ${error.message}`);
  }
}

// ----------------------------------------------------------------------------
// Redirect URI Validation (RFC 6749 §3.1.2)
// ----------------------------------------------------------------------------

/**
 * Validate a redirect URI against the registered URIs for an OAuth app.
 * Performs exact match after normalization per RFC 6749 §3.1.2.
 */
export async function validateRedirectUri(
  appId: string,
  uri: string
): Promise<boolean> {
  const app = await getOAuthApp(appId);
  if (!app) return false;

  const normalizedInput = normalizeUri(uri);

  return app.redirectUris.some(
    (registeredUri) => normalizeUri(registeredUri) === normalizedInput
  );
}

// ----------------------------------------------------------------------------
// Authorization Code Flow (RFC 6749 §4.1)
// ----------------------------------------------------------------------------

/**
 * Generate an authorization code for the authorization code flow.
 * The code is stored in the database with a 10-minute TTL.
 */
export async function generateAuthCode(
  appId: string,
  userId: string,
  scopes: APIScope[],
  redirectUri: string
): Promise<string> {
  const supabase = await createClient();

  // Validate redirect URI
  const isValidUri = await validateRedirectUri(appId, redirectUri);
  if (!isValidUri) {
    throw new Error('Invalid redirect URI for this OAuth application');
  }

  // Verify the app supports authorization_code grant
  const app = await getOAuthApp(appId);
  if (!app || !app.grantTypes.includes('authorization_code')) {
    throw new Error('OAuth application does not support authorization code grant');
  }

  const code = generateRandomHex(AUTH_CODE_LENGTH);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_CODE_EXPIRY_SECONDS * 1000);

  const { error } = await supabase.from('oauth_auth_codes').insert({
    code,
    app_id: appId,
    user_id: userId,
    scopes: serializeScopes(scopes),
    redirect_uri: redirectUri,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to generate auth code: ${error.message}`);
  }

  return code;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 * Implements RFC 6749 §4.1.3 (Token Request).
 */
export async function exchangeAuthCode(code: string): Promise<OAuthToken> {
  const supabase = await createClient();

  // Look up the auth code
  const { data: codeData, error: codeError } = await supabase
    .from('oauth_auth_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (codeError || !codeData) {
    throw new Error('Invalid authorization code');
  }

  // Check expiration
  if (new Date(codeData.expires_at) < new Date()) {
    throw new Error('Authorization code has expired');
  }

  // Delete the auth code (single use per RFC 6749 §4.1.3)
  await supabase.from('oauth_auth_codes').delete().eq('code', code);

  // Generate tokens
  const accessTokenRaw = generateRandomHex(ACCESS_TOKEN_LENGTH);
  const refreshTokenRaw = generateRandomHex(REFRESH_TOKEN_LENGTH);
  const accessTokenHashed = await hashValue(accessTokenRaw);
  const refreshTokenHashed = await hashValue(refreshTokenRaw);

  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_EXPIRY_SECONDS * 1000);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  const scopes = deserializeScopes(codeData.scopes);

  const token: OAuthToken = {
    accessToken: accessTokenRaw,
    refreshToken: refreshTokenRaw,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    scopes,
    appId: codeData.app_id,
    userId: codeData.user_id,
    expiresAt: accessExpiresAt,
    createdAt: now,
  };

  // Store hashed tokens in the database
  const { error: tokenError } = await supabase.from('oauth_tokens').insert({
    id: generateId(),
    access_token_hash: accessTokenHashed,
    refresh_token_hash: refreshTokenHashed,
    app_id: codeData.app_id,
    user_id: codeData.user_id,
    scopes: serializeScopes(scopes),
    access_expires_at: accessExpiresAt.toISOString(),
    refresh_expires_at: refreshExpiresAt.toISOString(),
    created_at: now.toISOString(),
  });

  if (tokenError) {
    throw new Error(`Failed to store OAuth tokens: ${tokenError.message}`);
  }

  return token;
}

// ----------------------------------------------------------------------------
// Token Refresh (RFC 6749 §6)
// ----------------------------------------------------------------------------

/**
 * Refresh an OAuth access token using a refresh token.
 * Implements RFC 6749 §6 (Refreshing an Access Token).
 */
export async function refreshOAuthToken(refreshToken: string): Promise<OAuthToken> {
  const supabase = await createClient();
  const refreshTokenHashed = await hashValue(refreshToken);

  // Look up the refresh token
  const { data: tokenData, error: tokenError } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('refresh_token_hash', refreshTokenHashed)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('Invalid refresh token');
  }

  // Check refresh token expiration
  if (new Date(tokenData.refresh_expires_at) < new Date()) {
    // Clean up expired token
    await supabase.from('oauth_tokens').delete().eq('id', tokenData.id);
    throw new Error('Refresh token has expired');
  }

  // Verify the app still supports refresh_token grant
  const app = await getOAuthApp(tokenData.app_id);
  if (!app || !app.grantTypes.includes('refresh_token')) {
    throw new Error('OAuth application does not support refresh token grant');
  }

  // Revoke old tokens
  await supabase.from('oauth_tokens').delete().eq('id', tokenData.id);

  // Generate new tokens
  const newAccessTokenRaw = generateRandomHex(ACCESS_TOKEN_LENGTH);
  const newRefreshTokenRaw = generateRandomHex(REFRESH_TOKEN_LENGTH);
  const newAccessTokenHashed = await hashValue(newAccessTokenRaw);
  const newRefreshTokenHashed = await hashValue(newRefreshTokenRaw);

  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_EXPIRY_SECONDS * 1000);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);
  const scopes = deserializeScopes(tokenData.scopes);

  const { error: insertError } = await supabase.from('oauth_tokens').insert({
    id: generateId(),
    access_token_hash: newAccessTokenHashed,
    refresh_token_hash: newRefreshTokenHashed,
    app_id: tokenData.app_id,
    user_id: tokenData.user_id,
    scopes: serializeScopes(scopes),
    access_expires_at: accessExpiresAt.toISOString(),
    refresh_expires_at: refreshExpiresAt.toISOString(),
    created_at: now.toISOString(),
  });

  if (insertError) {
    throw new Error(`Failed to store refreshed tokens: ${insertError.message}`);
  }

  return {
    accessToken: newAccessTokenRaw,
    refreshToken: newRefreshTokenRaw,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    scopes,
    appId: tokenData.app_id,
    userId: tokenData.user_id,
    expiresAt: accessExpiresAt,
    createdAt: now,
  };
}

// ----------------------------------------------------------------------------
// Token Validation & Revocation
// ----------------------------------------------------------------------------

/**
 * Validate an OAuth access token.
 * Checks hash, expiration, and that the token has not been revoked.
 */
export async function validateOAuthToken(
  token: string
): Promise<ValidateOAuthTokenResult> {
  const supabase = await createClient();
  const tokenHashed = await hashValue(token);

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('access_token_hash', tokenHashed)
    .single();

  if (error || !data) {
    return { valid: false, token: null, error: 'Invalid access token' };
  }

  // Check expiration
  if (new Date(data.access_expires_at) < new Date()) {
    return { valid: false, token: null, error: 'Access token has expired' };
  }

  const scopes = deserializeScopes(data.scopes);

  const oauthToken: OAuthToken = {
    accessToken: token,
    refreshToken: '', // Never expose refresh token
    tokenType: 'Bearer',
    expiresIn: Math.max(
      0,
      Math.floor((new Date(data.access_expires_at).getTime() - Date.now()) / 1000)
    ),
    scopes,
    appId: data.app_id,
    userId: data.user_id,
    expiresAt: new Date(data.access_expires_at),
    createdAt: new Date(data.created_at),
  };

  return { valid: true, token: oauthToken };
}

/**
 * Revoke an OAuth token (both access and refresh).
 * Implements RFC 7009 (OAuth 2.0 Token Revocation).
 */
export async function revokeOAuthToken(token: string): Promise<void> {
  const supabase = await createClient();
  const tokenHashed = await hashValue(token);

  // Try to match as access token
  const { data: byAccess } = await supabase
    .from('oauth_tokens')
    .select('id')
    .eq('access_token_hash', tokenHashed)
    .single();

  if (byAccess) {
    await supabase.from('oauth_tokens').delete().eq('id', byAccess.id);
    return;
  }

  // Try to match as refresh token
  const { data: byRefresh } = await supabase
    .from('oauth_tokens')
    .select('id')
    .eq('refresh_token_hash', tokenHashed)
    .single();

  if (byRefresh) {
    await supabase.from('oauth_tokens').delete().eq('id', byRefresh.id);
    return;
  }

  // Token not found — silently succeed per RFC 7009 §2.1
}
