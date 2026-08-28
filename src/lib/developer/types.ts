// ============================================================================
// ExamForge AI — Developer Platform Types
// ============================================================================
// Comprehensive type definitions for the Developer Portal, including API keys,
// OAuth apps, rate limiting, webhooks, usage analytics, and API registry.
// ============================================================================

// ----------------------------------------------------------------------------
// API Scope Definitions
// ----------------------------------------------------------------------------

/** Resource types that can be scoped for API access */
export type APIResource =
  | 'profiles'
  | 'exams'
  | 'questions'
  | 'results'
  | 'analytics'
  | 'billing'
  | 'marketplace'
  | 'ai'
  | 'workflows'
  | 'organizations';

/** Permission levels for each resource */
export type APIPermission = 'read' | 'write' | 'admin';

/** A scoped permission combining resource and permission level */
export interface APIScope {
  resource: APIResource;
  permission: APIPermission;
}

/** String representation of a scope: "resource:permission" (e.g., "exams:read") */
export type APIScopeString = `${APIResource}:${APIPermission}`;

// ----------------------------------------------------------------------------
// Rate Limiting
// ----------------------------------------------------------------------------

/** Configuration for rate limiting across multiple time windows */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

/** Current rate limit status for an identifier */
export interface RateLimitStatus {
  remaining: number;
  resetAt: Date;
  currentUsage: number;
}

/** Result of a rate limit check */
export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
  limit: number;
  window: 'minute' | 'hour' | 'day';
}

/** Per-identifier rate limit override stored in the database */
export interface RateLimitOverride {
  id: string;
  identifier: string;
  config: RateLimitConfig;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// API Key
// ----------------------------------------------------------------------------

/** API key record stored in the database */
export interface APIKey {
  id: string;
  orgId: string;
  name: string;
  key: string; // SHA-256 hashed key
  prefix: string; // e.g., "ef_live_" + first 8 chars for identification
  scopes: APIScope[];
  rateLimit: RateLimitConfig;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: string;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a new API key */
export interface CreateAPIKeyInput {
  orgId: string;
  name: string;
  scopes: APIScope[];
  expiresAt?: Date;
  rateLimit?: Partial<RateLimitConfig>;
  createdBy: string;
}

/** Returned when an API key is created (contains the raw key only once) */
export interface CreateAPIKeyResult {
  apiKey: APIKey;
  rawKey: string; // Only available at creation time
}

/** Result of validating an API key */
export interface ValidateAPIKeyResult {
  valid: boolean;
  apiKey: APIKey | null;
  error?: string;
}

// ----------------------------------------------------------------------------
// OAuth Application
// ----------------------------------------------------------------------------

/** OAuth 2.0 grant types supported */
export type OAuthGrantType = 'authorization_code' | 'refresh_token';

/** OAuth 2.0 application registered in the developer portal */
export interface OAuthApp {
  id: string;
  orgId: string;
  name: string;
  clientId: string;
  clientSecret: string; // SHA-256 hashed
  redirectUris: string[];
  scopes: APIScope[];
  grantTypes: OAuthGrantType[];
  logoUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for registering a new OAuth application */
export interface RegisterOAuthAppInput {
  orgId: string;
  name: string;
  redirectUris: string[];
  scopes: APIScope[];
  grantTypes: OAuthGrantType[];
  logoUrl?: string;
  createdBy: string;
}

/** Result of registering an OAuth app (contains raw secret only once) */
export interface RegisterOAuthAppResult {
  app: OAuthApp;
  rawClientSecret: string;
}

/** OAuth authorization code stored temporarily */
export interface OAuthAuthCode {
  code: string;
  appId: string;
  userId: string;
  scopes: APIScope[];
  redirectUri: string;
  expiresAt: Date;
  createdAt: Date;
}

/** OAuth access token */
export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scopes: APIScope[];
  appId: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

/** Result of validating an OAuth token */
export interface ValidateOAuthTokenResult {
  valid: boolean;
  token: OAuthToken | null;
  error?: string;
}

// ----------------------------------------------------------------------------
// API Endpoint Registry
// ----------------------------------------------------------------------------

/** HTTP methods for API endpoints */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A single API endpoint definition */
export interface APIEndpoint {
  method: HTTPMethod;
  path: string;
  description: string;
  scopes: APIScope[];
  rateLimit: RateLimitConfig;
  deprecated: boolean;
  version: string;
  tags: string[];
  parameters: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
}

/** API endpoint parameter */
export interface APIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  description: string;
  schema: Record<string, unknown>;
}

/** API request body */
export interface APIRequestBody {
  description: string;
  required: boolean;
  contentType: string;
  schema: Record<string, unknown>;
}

/** API response definition */
export interface APIResponse {
  statusCode: number;
  description: string;
  contentType?: string;
  schema?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// GraphQL Schema
// ----------------------------------------------------------------------------

/** GraphQL schema definition */
export interface GraphQLSchema {
  schema: string;
  types: GraphQLType[];
  queries: GraphQLOperation[];
  mutations: GraphQLOperation[];
  subscriptions: GraphQLOperation[];
}

/** GraphQL type definition */
export interface GraphQLType {
  name: string;
  kind: 'scalar' | 'object' | 'interface' | 'union' | 'enum' | 'input';
  description: string;
  fields: GraphQLField[];
}

/** GraphQL field */
export interface GraphQLField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  args: GraphQLArgument[];
}

/** GraphQL argument */
export interface GraphQLArgument {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

/** GraphQL operation (query, mutation, or subscription) */
export interface GraphQLOperation {
  name: string;
  description: string;
  args: GraphQLArgument[];
  returnType: string;
}

// ----------------------------------------------------------------------------
// Webhook Delivery
// ----------------------------------------------------------------------------

/** Webhook delivery attempt record */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  statusCode: number | null;
  response: string | null;
  durationMs: number | null;
  nextRetryAt: Date | null;
  attempts: number;
  succeeded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Filters for listing webhook deliveries */
export interface WebhookDeliveryFilters {
  event?: string;
  succeeded?: boolean;
  fromCreatedAt?: Date;
  toCreatedAt?: Date;
  limit?: number;
  offset?: number;
}

/** Webhook delivery statistics */
export interface WebhookDeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  avgLatencyMs: number;
  avgAttempts: number;
}

/** Result of a webhook delivery attempt */
export interface WebhookDeliveryResult {
  delivered: boolean;
  delivery: WebhookDelivery;
  error?: string;
}

// ----------------------------------------------------------------------------
// SDK Information
// ----------------------------------------------------------------------------

/** SDK information for a specific language */
export interface SDKInfo {
  language: string;
  version: string;
  downloadUrl: string;
  installCommand: string;
  repoUrl: string;
}

// ----------------------------------------------------------------------------
// API Usage Analytics
// ----------------------------------------------------------------------------

/** Aggregated API usage analytics */
export interface APIUsageAnalytics {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  byMethod: Record<HTTPMethod, number>;
  avgLatency: number;
  errorRate: number;
  byStatusCode: Record<string, number>;
}

/** Per-endpoint analytics */
export interface EndpointAnalytics {
  endpoint: string;
  method: HTTPMethod;
  totalRequests: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  byStatusCode: Record<string, number>;
}

/** Error analytics for a period */
export interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  byEndpoint: Record<string, { count: number; rate: number }>;
  byStatusCode: Record<string, number>;
  topErrors: ErrorDetail[];
}

/** Individual error detail */
export interface ErrorDetail {
  endpoint: string;
  method: HTTPMethod;
  statusCode: number;
  count: number;
  lastOccurrence: Date;
}

/** Latency analytics with percentile data */
export interface LatencyAnalytics {
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  byEndpoint: Record<string, {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
}

/** Top API user information */
export interface TopAPIUser {
  userId: string;
  apiKeyPrefix: string;
  totalRequests: number;
  errorRate: number;
  avgLatency: number;
}

/** Time period for analytics queries */
export type AnalyticsPeriod = '1h' | '24h' | '7d' | '30d' | '90d';

/** Export format for usage reports */
export type ExportFormat = 'json' | 'csv';

/** Single API request record for analytics */
export interface APIRequestRecord {
  id: string;
  endpoint: string;
  method: HTTPMethod;
  statusCode: number;
  latencyMs: number;
  apiKeyPrefix: string | null;
  userId: string | null;
  orgId: string | null;
  timestamp: Date;
}

// ----------------------------------------------------------------------------
// API Version
// ----------------------------------------------------------------------------

/** API version status */
export type APIVersionStatus = 'current' | 'deprecated' | 'sunset';

/** API version information */
export interface APIVersion {
  version: string;
  status: APIVersionStatus;
  sunsetDate: Date | null;
  changelog: string;
  releaseDate: Date;
}

// ----------------------------------------------------------------------------
// Developer Portal Configuration
// ----------------------------------------------------------------------------

/** Developer portal configuration */
export interface DeveloperPortalConfig {
  apiBaseUrl: string;
  graphqlUrl: string;
  realtimeUrl: string;
  apiVersions: APIVersion[];
  featuredSDKs: SDKInfo[];
}

// ----------------------------------------------------------------------------
// OpenAPI / Postman Types
// ----------------------------------------------------------------------------

/** OpenAPI 3.1 specification */
export interface OpenAPISpec {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description: string;
    contact: {
      name: string;
      email: string;
      url: string;
    };
    license: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
    parameters: Record<string, unknown>;
    responses: Record<string, unknown>;
  };
  security: Array<Record<string, string[]>>;
  tags: Array<{
    name: string;
    description: string;
  }>;
}

/** Postman collection */
export interface PostmanCollection {
  info: {
    name: string;
    schema: string;
    version: string;
  };
  item: PostmanItem[];
  variable: PostmanVariable[];
}

/** Postman collection item (folder or request) */
export interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: {
    method: string;
    header: Array<{ key: string; value: string }>;
    url: {
      raw: string;
      host: string[];
      path: string[];
      query: Array<{ key: string; value: string; description: string }>;
    };
    description: string;
  };
}

/** Postman collection variable */
export interface PostmanVariable {
  key: string;
  value: string;
  type: string;
}
