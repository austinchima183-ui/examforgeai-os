// ============================================================================
// ExamForge AI — Enterprise Security Module
// ============================================================================
// Central export point for all enterprise security services.
// Provides SSO, OAuth, Passkeys, Conditional Access, Risk-Based Auth,
// Device Trust, Session Management, and Audit Logging.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────

export type {
  // SSO / OAuth
  SSOProviderType,
  SSOConnectionStatus,
  SSOProviderConfig,
  SSOAttributeMapping,
  SSOConnection,
  SCIMConfig,
  SSOCallbackResult,
  SSOTestResult,

  // Passkey / WebAuthn
  PasskeyRegistration,
  AuthenticatorTransport,
  WebAuthnConfig,
  AttestationConveyanceType,
  UserVerificationRequirement,
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
  PublicKeyCredentialParameters,
  PublicKeyCredentialDescriptor,
  AuthenticatorSelection,
  WebAuthnRegistrationResponse,
  WebAuthnAuthenticationResponse,

  // Conditional Access
  RiskLevel,
  ConditionalAccessConditions,
  TimeRangeCondition,
  GrantControls,
  ConditionalAccessPolicy,
  AccessEvaluationResult,
  AccessEvaluationContext,

  // Risk Engine
  RiskScore,
  RiskFactors,
  RiskAction,
  RiskAssessmentContext,
  RiskHistoryEntry,

  // Device Trust
  DeviceTrustLevel,
  DeviceType,
  DeviceInfo,
  DeviceLocation,
  DeviceCompliancePolicy,
  ComplianceAssessmentResult,

  // Session Management
  SessionInfo,
  SessionActivityEntry,
  SessionActivityType,

  // MFA
  MFAMethod,
  MFAConfig,

  // Audit Log
  AuditLogEntry,
  AuditResult,
  AuditLogFilters,
  AuditStats,
  AuditAnomaly,
  AnomalyType,
} from './types'

// ──────────────────────────────────────────────────────────────
// SSO Service
// ──────────────────────────────────────────────────────────────

export {
  configureSSOProvider,
  getSSOProvider,
  listSSOProviders,
  initiateSSOLogin,
  handleSSOCallback,
  deleteSSOProvider,
  testSSOConnection,
  configureSCIM,
  syncSCIMUsers,
  getProviderDefaults,
} from './sso-service'

// ──────────────────────────────────────────────────────────────
// Passkey Service
// ──────────────────────────────────────────────────────────────

export {
  generateRegistrationOptions,
  verifyRegistration,
  generateAuthenticationOptions,
  verifyAuthentication,
  listPasskeys,
  deletePasskey,
  updatePasskeyCounter,
  getWebAuthnConfig,
} from './passkey-service'

// ──────────────────────────────────────────────────────────────
// Conditional Access
// ──────────────────────────────────────────────────────────────

export {
  createPolicy,
  updatePolicy,
  deletePolicy,
  listPolicies,
  evaluateAccess,
  evaluateConditions,
  applyGrantControls,
  sortPoliciesByPriority,
} from './conditional-access'

// ──────────────────────────────────────────────────────────────
// Risk Engine
// ──────────────────────────────────────────────────────────────

export {
  calculateRiskScore,
  assessFailedLogins,
  assessUnusualLocation,
  assessNewDevice,
  assessImpossibleTravel,
  assessSuspiciousActivity,
  getRiskHistory,
  triggerRiskAction,
  recordFailedLogin,
  clearFailedLogins,
} from './risk-engine'

// ──────────────────────────────────────────────────────────────
// Device Trust
// ──────────────────────────────────────────────────────────────

export {
  registerDevice,
  getDeviceInfo,
  updateDeviceTrust,
  assessDeviceCompliance,
  listUserDevices,
  revokeDevice,
  isDeviceRecognized,
  updateDeviceLastSeen,
  computeDeviceFingerprint,
  getDefaultCompliancePolicy,
} from './device-trust'

// ──────────────────────────────────────────────────────────────
// Session Management
// ──────────────────────────────────────────────────────────────

export {
  createSession,
  getSession,
  validateSession,
  terminateSession,
  terminateAllUserSessions,
  getActiveSessions,
  extendSession,
  enforceConcurrentSessionLimit,
  getSessionActivityLog,
  markSessionMfaVerified,
} from './session-management'

// ──────────────────────────────────────────────────────────────
// Audit Log
// ──────────────────────────────────────────────────────────────

export {
  logAuditEvent,
  getAuditLogs,
  getAuditStats,
  exportAuditLogs,
  getAuditTimeline,
  detectAnomalies,
  logAuthEvent,
  AUDIT_ACTIONS,
} from './audit-log'
