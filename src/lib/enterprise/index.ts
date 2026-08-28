// ============================================================================
// ExamForge AI — Enterprise Multi-Tenancy — Central Exports
// ============================================================================
// Single entry point for all enterprise multi-tenancy modules.
// Import from '@/lib/enterprise' to access any service or type.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type {
  OrganizationType,
  OrganizationNode,
  OrganizationTreeNode,
  OrganizationMetadata,
  TenantContext,
  EffectivePermissions,
  DelegatedAdmin,
  DelegationScope,
  OrganizationBranding,
  WhiteLabelConfig,
  BrandedEmailTemplate,
  BrandedReportTemplate,
  CrossCampusPermission,
  CrossCampusPermissionType,
  OrganizationSettings,
  AcademicYearFormat,
  GradingScale,
  GradeBoundary,
  AttendancePolicy,
  OrganizationAIConfig,
  AIFeature,
  CustomFieldDefinition,
  TenantIsolationConfig,
  SharedResource,
  DataPolicy,
  CustomDomain,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  GrantDelegatedAdminInput,
  GrantCrossCampusAccessInput,
  OrganizationSearchFilters,
} from './types'

export {
  ORGANIZATION_HIERARCHY_LEVELS,
  VALID_PARENT_TYPES,
  DEFAULT_ORGANIZATION_SETTINGS,
  DEFAULT_ORGANIZATION_BRANDING,
} from './types'

// ──────────────────────────────────────────────────────────────
// Organization Service
// ──────────────────────────────────────────────────────────────

export {
  createOrganization,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationTree,
  moveOrganization,
  getOrganizationChildren,
  getOrganizationPath,
  switchOrganization,
  getTenantContext,
  validateTenantAccess,
  searchOrganizations,
} from './organization-service'

// ──────────────────────────────────────────────────────────────
// Tenant Middleware
// ──────────────────────────────────────────────────────────────

export type {
  TenantResolution,
} from './tenant-middleware'

export {
  TENANT_COOKIE_NAME,
  TENANT_HEADER_NAME,
  TenantResolver,
  getTenantResolver,
  resolveTenant,
  setTenantCookie,
  getTenantFromDomain,
  extractSubdomain,
  clearTenantCookie,
  resolveTenantForAPI,
} from './tenant-middleware'

// ──────────────────────────────────────────────────────────────
// Delegated Admin Service
// ──────────────────────────────────────────────────────────────

export {
  grantDelegatedAdmin,
  revokeDelegatedAdmin,
  getDelegatedAdmins,
  validateDelegatedAccess,
  getEffectivePermissions,
} from './delegated-admin-service'

// ──────────────────────────────────────────────────────────────
// Cross-Campus Service
// ──────────────────────────────────────────────────────────────

export {
  grantCrossCampusAccess,
  revokeCrossCampusAccess,
  getCrossCampusPermissions,
  validateCrossCampusAccess,
  getAccessibleOrganizations,
} from './cross-campus-service'

// ──────────────────────────────────────────────────────────────
// Branding Service
// ──────────────────────────────────────────────────────────────

export {
  getOrganizationBranding,
  updateOrganizationBranding,
  applyWhiteLabel,
  getCustomDomain,
  verifyCustomDomain,
  generateBrandingCSS,
  getEmailTemplate,
  getReportTemplate,
} from './branding-service'

// ──────────────────────────────────────────────────────────────
// Organization Settings Service
// ──────────────────────────────────────────────────────────────

export {
  getOrganizationSettings,
  updateOrganizationSettings,
  getFeatureFlags,
  updateFeatureFlag,
  getAIConfig,
  getAcademicYearConfig,
} from './organization-settings-service'
