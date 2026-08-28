// ============================================================================
// ExamForge AI — Developer Platform — Central Exports
// ============================================================================
// Re-exports all types, services, and utilities from the developer platform.
// ============================================================================

// ---- Types ----
export type {
  APIResource,
  APIPermission,
  APIScope,
  APIScopeString,
  RateLimitConfig,
  RateLimitStatus,
  RateLimitCheckResult,
  RateLimitOverride,
  APIKey,
  CreateAPIKeyInput,
  CreateAPIKeyResult,
  ValidateAPIKeyResult,
  OAuthGrantType,
  OAuthApp,
  RegisterOAuthAppInput,
  RegisterOAuthAppResult,
  OAuthAuthCode,
  OAuthToken,
  ValidateOAuthTokenResult,
  HTTPMethod,
  APIEndpoint,
  APIParameter,
  APIRequestBody,
  APIResponse,
  GraphQLSchema,
  GraphQLType,
  GraphQLOperation,
  GraphQLField,
  GraphQLArgument,
  WebhookDelivery,
  WebhookDeliveryFilters,
  WebhookDeliveryStats,
  WebhookDeliveryResult,
  SDKInfo,
  APIUsageAnalytics,
  EndpointAnalytics,
  ErrorAnalytics,
  ErrorDetail,
  LatencyAnalytics,
  TopAPIUser,
  AnalyticsPeriod,
  ExportFormat,
  APIRequestRecord,
  APIVersionStatus,
  APIVersion,
  DeveloperPortalConfig,
  OpenAPISpec,
  PostmanCollection,
  PostmanItem,
  PostmanVariable,
} from './types';

// ---- API Key Service ----
export {
  createAPIKey,
  validateAPIKey,
  revokeAPIKey,
  listAPIKeys,
  rotateAPIKey,
  checkAPIKeyScopes,
  updateAPIKeyRateLimit,
} from './api-key-service';

// ---- OAuth Service ----
export {
  registerOAuthApp,
  getOAuthApp,
  updateOAuthApp,
  deleteOAuthApp,
  validateRedirectUri,
  generateAuthCode,
  exchangeAuthCode,
  refreshOAuthToken,
  validateOAuthToken,
  revokeOAuthToken,
} from './oauth-service';

// ---- Rate Limiter ----
export {
  checkRateLimit,
  getRateLimitStatus,
  setRateLimitOverride,
} from './rate-limiter';

// ---- API Registry ----
export {
  getAPIEndpoints,
  getEndpoint,
  generateOpenAPISpec,
  generatePostmanCollection,
  getGraphQLSchema,
  getAPIVersions,
  deprecateEndpoint,
  getAPIDocumentation,
} from './api-registry';

// ---- Webhook Delivery Service ----
export {
  deliverWebhook,
  getWebhookDelivery,
  listWebhookDeliveries,
  retryWebhookDelivery,
  getWebhookDeliveryStats,
  calculateNextRetry,
} from './webhook-delivery-service';

// ---- Usage Analytics Service ----
export {
  recordAPIRequest,
  getAPIUsageAnalytics,
  getEndpointAnalytics,
  getErrorAnalytics,
  getLatencyAnalytics,
  getTopAPIUsers,
  exportUsageReport,
} from './usage-analytics-service';
