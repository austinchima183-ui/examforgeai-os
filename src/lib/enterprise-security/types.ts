// ============================================================================
// ExamForge AI — Enterprise Security Type Definitions
// ============================================================================
// Comprehensive type system for SSO, OAuth, Passkeys, Conditional Access,
// Risk-Based Auth, Device Trust, Session Management, and Audit Logging.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// SSO / OAuth Types
// ──────────────────────────────────────────────────────────────

/**
 * Supported SSO provider types.
 * Covers major IdPs and protocols (SAML, OIDC, LDAP).
 */
export type SSOProviderType =
  | 'google'
  | 'azure_ad'
  | 'okta'
  | 'auth0'
  | 'onelogin'
  | 'ping'
  | 'ldap'
  | 'saml'
  | 'oidc'

/**
 * Status of an SSO connection.
 */
export type SSOConnectionStatus = 'active' | 'inactive' | 'testing' | 'error'

/**
 * Configuration for an SSO provider.
 * Contains all fields needed for OAuth2/OIDC/SAML flows.
 */
export interface SSOProviderConfig {
  /** Unique identifier for this provider config */
  id: string
  /** Provider type (google, azure_ad, okta, etc.) */
  type: SSOProviderType
  /** Human-readable name for this provider */
  name: string
  /** OAuth2/OIDC client ID */
  clientId: string
  /** OAuth2/OIDC client secret (encrypted at rest) */
  clientSecret: string
  /** OIDC issuer URL (for discovery) */
  issuer: string | null
  /** OAuth2 authorization endpoint URL */
  authorizationUrl: string
  /** OAuth2 token endpoint URL */
  tokenUrl: string
  /** User info endpoint URL (OIDC /userinfo or equivalent) */
  userInfoUrl: string
  /** OAuth2 scopes to request */
  scopes: string[]
  /** Mapping from IdP attributes to ExamForge user fields */
  attributeMapping: SSOAttributeMapping
  /** Whether this provider is enabled */
  enabled: boolean
}

/**
 * Mapping from SSO IdP attributes to local user fields.
 */
export interface SSOAttributeMapping {
  /** IdP attribute for user email */
  email: string
  /** IdP attribute for display name */
  displayName: string
  /** IdP attribute for first name */
  firstName: string | null
  /** IdP attribute for last name */
  lastName: string | null
  /** IdP attribute for groups/roles */
  groups: string | null
  /** IdP attribute for user department */
  department: string | null
  /** IdP attribute for job title */
  jobTitle: string | null
}

/**
 * An SSO connection linking an IdP to an organization.
 */
export interface SSOConnection {
  /** Unique identifier */
  id: string
  /** The provider configuration ID */
  providerId: string
  /** The organization this connection belongs to */
  organizationId: string
  /** Full provider config */
  config: SSOProviderConfig
  /** Connection status */
  status: SSOConnectionStatus
  /** Last error message (if status is 'error') */
  lastError: string | null
  /** Timestamps */
  createdAt: string
  updatedAt: string
}

/**
 * SCIM (System for Cross-domain Identity Management) provisioning config.
 */
export interface SCIMConfig {
  /** SCIM API endpoint URL */
  endpoint: string
  /** Bearer token for SCIM API authentication */
  bearerToken: string
  /** Mapping for user unique ID from SCIM */
  userIdMapping: string
  /** Mapping for group membership from SCIM */
  groupMapping: string
  /** Whether SCIM sync is enabled */
  enabled: boolean
  /** Sync interval in seconds */
  syncIntervalSeconds: number
  /** Last successful sync timestamp */
  lastSyncAt: string | null
}

// ──────────────────────────────────────────────────────────────
// Passkey / WebAuthn Types
// ──────────────────────────────────────────────────────────────

/**
 * A registered passkey credential.
 */
export interface PasskeyRegistration {
  /** Unique identifier */
  id: string
  /** The user who owns this passkey */
  userId: string
  /** WebAuthn credential ID (base64url encoded) */
  credentialId: string
  /** Public key (COSE format, base64url encoded) */
  publicKey: string
  /** Signature counter for clone detection */
  counter: number
  /** Type of device (singleDevice, multiDevice) */
  deviceType: string
  /** Transport types supported by the authenticator */
  transports: AuthenticatorTransport[]
  /** Friendly name given by the user */
  name: string | null
  /** Timestamps */
  createdAt: string
  lastUsedAt: string | null
}

/**
 * WebAuthn authenticator transport types.
 */
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'

/**
 * WebAuthn configuration for the relying party.
 */
export interface WebAuthnConfig {
  /** Relying Party ID (domain) */
  rpId: string
  /** Relying Party display name */
  rpName: string
  /** Challenge timeout in milliseconds */
  challengeTimeoutMs: number
  /** Preferred attestation conveyance type */
  attestationType: AttestationConveyanceType
  /** Whether to require resident keys (discoverable credentials) */
  requireResidentKey: boolean
  /** User verification requirement */
  userVerification: UserVerificationRequirement
}

/**
 * Attestation conveyance preference.
 */
export type AttestationConveyanceType = 'none' | 'indirect' | 'direct' | 'enterprise'

/**
 * User verification requirement.
 */
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged'

/**
 * WebAuthn registration options (for the browser).
 */
export interface WebAuthnRegistrationOptions {
  /** The challenge (base64url encoded) */
  challenge: string
  /** Relying party info */
  rp: { id: string; name: string }
  /** User info */
  user: { id: string; name: string; displayName: string }
  /** Required credential parameters */
  pubKeyCredParams: PublicKeyCredentialParameters[]
  /** Timeout in milliseconds */
  timeout: number
  /** Excluded credentials (already registered) */
  excludeCredentials: PublicKeyCredentialDescriptor[]
  /** Authenticator selection criteria */
  authenticatorSelection: AuthenticatorSelection
  /** Attestation conveyance preference */
  attestation: AttestationConveyanceType
}

/**
 * WebAuthn authentication options (for the browser).
 */
export interface WebAuthnAuthenticationOptions {
  /** The challenge (base64url encoded) */
  challenge: string
  /** Timeout in milliseconds */
  timeout: number
  /** Allowed credentials */
  allowCredentials: PublicKeyCredentialDescriptor[]
  /** User verification requirement */
  userVerification: UserVerificationRequirement
  /** Relying party ID */
  rpId: string
}

/**
 * Public key credential parameters for WebAuthn.
 */
export interface PublicKeyCredentialParameters {
  type: 'public-key'
  alg: number
}

/**
 * Public key credential descriptor.
 */
export interface PublicKeyCredentialDescriptor {
  type: 'public-key'
  id: string
  transports?: AuthenticatorTransport[]
}

/**
 * Authenticator selection criteria.
 */
export interface AuthenticatorSelection {
  authenticatorAttachment?: 'platform' | 'cross-platform'
  requireResidentKey: boolean
  residentKey?: 'required' | 'preferred' | 'discouraged'
  userVerification: UserVerificationRequirement
}

/**
 * WebAuthn registration response from the browser.
 */
export interface WebAuthnRegistrationResponse {
  id: string
  rawId: string
  type: 'public-key'
  response: {
    clientDataJSON: string
    attestationObject: string
  }
}

/**
 * WebAuthn authentication response from the browser.
 */
export interface WebAuthnAuthenticationResponse {
  id: string
  rawId: string
  type: 'public-key'
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle?: string
  }
}

// ──────────────────────────────────────────────────────────────
// Conditional Access Types
// ──────────────────────────────────────────────────────────────

/**
 * Risk level classification.
 */
export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

/**
 * Conditions that trigger a conditional access policy.
 */
export interface ConditionalAccessConditions {
  /** Allowed IP ranges (CIDR notation) */
  ipRange: string[]
  /** Required device trust level */
  deviceTrust: DeviceTrustLevel[]
  /** Allowed time ranges (cron-like or day/hour ranges) */
  timeRange: TimeRangeCondition | null
  /** Allowed geographic locations (country codes) */
  location: string[]
  /** Maximum risk level allowed */
  riskLevel: RiskLevel | null
  /** Required user roles */
  userRoles: string[]
  /** Required applications (app IDs) */
  applications: string[]
}

/**
 * Time range condition for conditional access.
 */
export interface TimeRangeCondition {
  /** Days of the week (0=Sunday, 6=Saturday) */
  daysOfWeek: number[]
  /** Start hour (0-23) */
  startHour: number
  /** End hour (0-23) */
  endHour: number
  /** IANA timezone */
  timezone: string
}

/**
 * Grant controls — actions to apply when conditions are met.
 */
export interface GrantControls {
  /** Require multi-factor authentication */
  requireMfa: boolean
  /** Require a compliant device */
  requireCompliantDevice: boolean
  /** Require an approved client application */
  requireApprovedApp: boolean
  /** Block access entirely */
  blockAccess: boolean
  /** Require passkey authentication */
  requirePasskey: boolean
  /** Custom message shown to user if blocked */
  blockMessage: string | null
}

/**
 * A conditional access policy.
 */
export interface ConditionalAccessPolicy {
  /** Unique identifier */
  id: string
  /** Human-readable policy name */
  name: string
  /** Organization this policy belongs to */
  organizationId: string
  /** Conditions that trigger this policy */
  conditions: ConditionalAccessConditions
  /** Controls applied when conditions are met */
  grantControls: GrantControls
  /** Whether the policy is enabled */
  enabled: boolean
  /** Priority (lower = evaluated first) */
  priority: number
  /** Description */
  description: string | null
  /** Timestamps */
  createdAt: string
  updatedAt: string
}

/**
 * Result of evaluating conditional access policies.
 */
export interface AccessEvaluationResult {
  /** Whether access is allowed */
  allowed: boolean
  /** Whether MFA is required */
  mfaRequired: boolean
  /** Whether a compliant device is required */
  compliantDeviceRequired: boolean
  /** Whether an approved app is required */
  approvedAppRequired: boolean
  /** Whether passkey is required */
  passkeyRequired: boolean
  /** Policies that matched and were applied */
  matchedPolicies: string[]
  /** Block reason (if access is blocked) */
  blockReason: string | null
}

/**
 * Context provided for access evaluation.
 */
export interface AccessEvaluationContext {
  /** User ID */
  userId: string
  /** User's IP address */
  ip: string
  /** Device ID */
  deviceId: string | null
  /** Device trust level */
  deviceTrustLevel: DeviceTrustLevel
  /** Current risk level */
  riskLevel: RiskLevel
  /** User roles */
  userRoles: string[]
  /** Current timestamp (ISO) */
  timestamp: string
  /** Location (country code) */
  location: string | null
  /** Application being accessed */
  applicationId: string | null
}

// ──────────────────────────────────────────────────────────────
// Risk Engine Types
// ──────────────────────────────────────────────────────────────

/**
 * A calculated risk score with contributing factors.
 */
export interface RiskScore {
  /** Numeric risk score (0-100, higher = riskier) */
  score: number
  /** Categorical risk level */
  level: RiskLevel
  /** Individual risk factors with their contributions */
  factors: RiskFactors
  /** Timestamp of this assessment */
  assessedAt: string
}

/**
 * Individual risk factors that contribute to the overall score.
 */
export interface RiskFactors {
  /** Number of recent failed login attempts */
  failedLogins: number
  /** Whether the login is from an unusual location */
  unusualLocation: boolean
  /** Whether this is a new/unknown device */
  newDevice: boolean
  /** Whether impossible travel was detected */
  impossibleTravel: boolean
  /** Whether malware was detected on the device */
  malwareDetected: boolean
  /** Whether suspicious activity patterns were detected */
  suspiciousActivity: boolean
  /** Score contribution from failed logins */
  failedLoginsScore: number
  /** Score contribution from unusual location */
  unusualLocationScore: number
  /** Score contribution from new device */
  newDeviceScore: number
  /** Score contribution from impossible travel */
  impossibleTravelScore: number
  /** Score contribution from malware */
  malwareDetectedScore: number
  /** Score contribution from suspicious activity */
  suspiciousActivityScore: number
}

/**
 * Risk-based action to take.
 */
export type RiskAction = 'allow' | 'require_mfa' | 'require_passkey' | 'block' | 'notify_admin'

/**
 * Context for risk assessment.
 */
export interface RiskAssessmentContext {
  /** User ID */
  userId: string
  /** Current IP address */
  ip: string
  /** Device ID */
  deviceId: string | null
  /** Previous IP address (for travel detection) */
  previousIp: string | null
  /** Time since last login (ms) */
  timeSinceLastLoginMs: number | null
  /** User agent string */
  userAgent: string
  /** Location (country code) */
  location: string | null
  /** Previous location */
  previousLocation: string | null
}

/**
 * Historical risk score record.
 */
export interface RiskHistoryEntry {
  /** Score */
  score: number
  /** Level */
  level: RiskLevel
  /** Action taken */
  action: RiskAction
  /** IP address */
  ip: string
  /** Timestamp */
  timestamp: string
}

// ──────────────────────────────────────────────────────────────
// Device Trust Types
// ──────────────────────────────────────────────────────────────

/**
 * Device trust levels.
 */
export type DeviceTrustLevel = 'none' | 'basic' | 'compliant' | 'highly_trusted'

/**
 * Device type classification.
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

/**
 * Information about a registered device.
 */
export interface DeviceInfo {
  /** Unique identifier */
  id: string
  /** User who owns this device */
  userId: string
  /** Type of device */
  deviceType: DeviceType
  /** Operating system */
  os: string
  /** Browser name */
  browser: string
  /** Browser version */
  browserVersion: string
  /** Last known IP address */
  ip: string
  /** User agent string */
  userAgent: string
  /** Geographic location */
  location: DeviceLocation | null
  /** Current trust level */
  trustLevel: DeviceTrustLevel
  /** Device fingerprint hash */
  fingerprint: string
  /** Timestamps */
  registeredAt: string
  lastSeenAt: string
  /** Whether the device meets compliance policies */
  isCompliant: boolean
  /** Whether the device is MDM-managed */
  isManaged: boolean
  /** Disk encryption enabled */
  diskEncrypted: boolean
  /** Screen lock enabled */
  screenLockEnabled: boolean
  /** OS version up to date */
  osUpToDate: boolean
  /** Friendly name */
  name: string | null
  /** Whether the device is revoked */
  isRevoked: boolean
}

/**
 * Device location info.
 */
export interface DeviceLocation {
  /** Country code (ISO 3166-1 alpha-2) */
  country: string
  /** City name */
  city: string | null
  /** Region/state */
  region: string | null
  /** Latitude */
  lat: number | null
  /** Longitude */
  lng: number | null
}

/**
 * Device compliance policy.
 */
export interface DeviceCompliancePolicy {
  /** Policy name */
  name: string
  /** Require disk encryption */
  requireDiskEncryption: boolean
  /** Require screen lock */
  requireScreenLock: boolean
  /** Require OS up to date */
  requireOsUpToDate: boolean
  /** Require MDM management */
  requireManaged: boolean
  /** Minimum OS versions */
  minimumOsVersions: Record<string, string>
  /** Blocked browsers */
  blockedBrowsers: string[]
}

/**
 * Result of device compliance assessment.
 */
export interface ComplianceAssessmentResult {
  /** Whether the device is compliant */
  compliant: boolean
  /** Failed policy checks */
  failures: string[]
  /** Warnings (non-critical issues) */
  warnings: string[]
}

// ──────────────────────────────────────────────────────────────
// Session Management Types
// ──────────────────────────────────────────────────────────────

/**
 * Information about an active session.
 */
export interface SessionInfo {
  /** Session unique identifier */
  id: string
  /** User who owns this session */
  userId: string
  /** Device associated with this session */
  deviceId: string | null
  /** When the session was created */
  createdAt: string
  /** Last activity timestamp */
  lastActiveAt: string
  /** When the session expires */
  expiresAt: string
  /** IP address at session creation */
  ip: string
  /** User agent string */
  userAgent: string
  /** Whether the session is still active */
  isActive: boolean
  /** Whether MFA has been verified in this session */
  mfaVerified: boolean
  /** Session token (hashed) */
  tokenHash: string
  /** Organization context for this session */
  organizationId: string | null
}

/**
 * Session activity log entry.
 */
export interface SessionActivityEntry {
  /** Entry ID */
  id: string
  /** Session ID */
  sessionId: string
  /** Activity type */
  activity: SessionActivityType
  /** IP address */
  ip: string
  /** User agent */
  userAgent: string
  /** Timestamp */
  timestamp: string
  /** Additional details */
  details: Record<string, unknown> | null
}

/**
 * Types of session activities.
 */
export type SessionActivityType =
  | 'created'
  | 'extended'
  | 'validated'
  | 'terminated'
  | 'mfa_verified'
  | 'ip_changed'
  | 'device_changed'
  | 'concurrent_limit_enforced'

// ──────────────────────────────────────────────────────────────
// MFA Types
// ──────────────────────────────────────────────────────────────

/**
 * Supported MFA methods.
 */
export type MFAMethod = 'totp' | 'sms' | 'email' | 'passkey'

/**
 * MFA configuration for a user.
 */
export interface MFAConfig {
  /** Whether MFA is enabled */
  enabled: boolean
  /** Available MFA methods */
  methods: MFAMethod[]
  /** Default MFA method */
  defaultMethod: MFAMethod
  /** Backup/recovery codes */
  backupCodes: string[]
  /** Whether backup codes have been used */
  backupCodesUsed: string[]
  /** TOTP secret (encrypted) */
  totpSecret: string | null
  /** Phone number for SMS MFA */
  phoneForSms: string | null
  /** Email for MFA codes */
  emailForMfa: string | null
}

// ──────────────────────────────────────────────────────────────
// Audit Log Types
// ──────────────────────────────────────────────────────────────

/**
 * An audit log entry.
 */
export interface AuditLogEntry {
  /** Unique identifier */
  id: string
  /** User who performed the action */
  userId: string | null
  /** Organization context */
  organizationId: string | null
  /** Action performed (e.g., 'user.login', 'policy.create') */
  action: string
  /** Resource type (e.g., 'user', 'session', 'policy') */
  resource: string
  /** Resource identifier */
  resourceId: string | null
  /** Result of the action */
  result: AuditResult
  /** IP address */
  ip: string | null
  /** User agent */
  userAgent: string | null
  /** Timestamp */
  timestamp: string
  /** Risk score at the time of the event */
  riskScore: number | null
  /** Additional details (JSONB) */
  details: Record<string, unknown> | null
}

/**
 * Audit event result.
 */
export type AuditResult = 'success' | 'failure' | 'denied' | 'error' | 'warning'

/**
 * Filters for querying audit logs.
 */
export interface AuditLogFilters {
  /** Filter by user ID */
  userId?: string | null
  /** Filter by organization ID */
  organizationId?: string | null
  /** Filter by action */
  action?: string | null
  /** Filter by resource type */
  resource?: string | null
  /** Filter by result */
  result?: AuditResult | null
  /** Filter by minimum risk score */
  minRiskScore?: number | null
  /** Start timestamp */
  fromTimestamp?: string | null
  /** End timestamp */
  toTimestamp?: string | null
  /** Pagination offset */
  offset?: number
  /** Pagination limit */
  limit?: number
}

/**
 * Audit statistics for an organization.
 */
export interface AuditStats {
  /** Total events in the period */
  totalEvents: number
  /** Events by result type */
  byResult: Record<AuditResult, number>
  /** Events by action (top 20) */
  byAction: Record<string, number>
  /** Events by resource type */
  byResource: Record<string, number>
  /** Average risk score */
  averageRiskScore: number
  /** Number of high-risk events (score >= 70) */
  highRiskEvents: number
  /** Period start */
  from: string
  /** Period end */
  to: string
}

/**
 * Detected anomaly in audit logs.
 */
export interface AuditAnomaly {
  /** Anomaly type */
  type: AnomalyType
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Description */
  description: string
  /** Related user IDs */
  affectedUsers: string[]
  /** Related event IDs */
  relatedEvents: string[]
  /** Timestamp detected */
  detectedAt: string
  /** Supporting data */
  data: Record<string, unknown>
}

/**
 * Types of audit anomalies.
 */
export type AnomalyType =
  | 'brute_force'
  | 'credential_stuffing'
  | 'impossible_travel'
  | 'privilege_escalation'
  | 'unusual_access_pattern'
  | 'mass_export'
  | 'account_takeover'
  | 'unusual_time_access'
  | 'multiple_failed_mfa'

// ──────────────────────────────────────────────────────────────
// SSO Callback Result
// ──────────────────────────────────────────────────────────────

/**
 * Result of handling an SSO callback.
 */
export interface SSOCallbackResult {
  /** Whether the authentication succeeded */
  success: boolean
  /** The user ID (local) if linked */
  userId: string | null
  /** The user email from the IdP */
  email: string | null
  /** Display name from the IdP */
  displayName: string | null
  /** IdP groups/roles */
  groups: string[]
  /** Access token from the IdP */
  accessToken: string | null
  /** Refresh token from the IdP */
  refreshToken: string | null
  /** Error message if failed */
  error: string | null
  /** Whether a new user was created */
  isNewUser: boolean
}

/**
 * Result of testing an SSO connection.
 */
export interface SSOTestResult {
  /** Whether the connection test succeeded */
  success: boolean
  /** Message describing the result */
  message: string
  /** Latency in milliseconds */
  latencyMs: number
  /** Details about the test */
  details: Record<string, unknown>
}
