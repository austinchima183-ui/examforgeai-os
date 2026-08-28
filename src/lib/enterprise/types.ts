// ============================================================================
// ExamForge AI — Enterprise Multi-Tenancy Type Definitions
// ============================================================================
// Comprehensive type system for the organizational hierarchy that extends
// the existing school-level isolation to support:
// Organizations > Districts > Regions > Countries > Campuses > Branches >
// Departments > Faculties > Schools
// ============================================================================

import type { UserRole } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Organization Type Enum
// ──────────────────────────────────────────────────────────────

/**
 * All supported organization types in the enterprise hierarchy.
 * Each type represents a distinct node in the organizational tree.
 */
export type OrganizationType =
  | 'school'
  | 'school_group'
  | 'district'
  | 'ministry'
  | 'region'
  | 'country'
  | 'campus'
  | 'branch'
  | 'department'
  | 'faculty'
  | 'university'
  | 'college'
  | 'examination_council'
  | 'ngo'
  | 'corporate_training'
  | 'international_network'

// ──────────────────────────────────────────────────────────────
// Organization Hierarchy Level Map
// ──────────────────────────────────────────────────────────────

/**
 * Default hierarchy levels for each organization type.
 * Higher level = higher in the tree (root is level 0).
 * Used for validating parent-child relationships.
 */
export const ORGANIZATION_HIERARCHY_LEVELS: Record<OrganizationType, number> = {
  international_network: 0,
  country: 1,
  ministry: 2,
  region: 3,
  district: 4,
  school_group: 5,
  campus: 6,
  university: 6,
  college: 6,
  branch: 7,
  department: 8,
  faculty: 8,
  school: 9,
  examination_council: 3,
  ngo: 3,
  corporate_training: 4,
}

/**
 * Valid parent types for each organization type.
 * Prevents invalid hierarchy relationships.
 */
export const VALID_PARENT_TYPES: Record<OrganizationType, OrganizationType[]> = {
  international_network: [],
  country: ['international_network'],
  ministry: ['country', 'international_network'],
  region: ['country', 'ministry', 'international_network'],
  district: ['region', 'country', 'ministry'],
  school_group: ['district', 'region'],
  campus: ['school_group', 'district', 'university'],
  university: ['district', 'region', 'country'],
  college: ['district', 'region', 'university'],
  branch: ['campus', 'university', 'college'],
  department: ['branch', 'campus', 'faculty', 'school'],
  faculty: ['branch', 'campus', 'university', 'college'],
  school: ['campus', 'branch', 'department', 'faculty', 'district', 'school_group'],
  examination_council: ['country', 'region', 'international_network'],
  ngo: ['country', 'region', 'international_network'],
  corporate_training: ['country', 'region', 'district'],
}

// ──────────────────────────────────────────────────────────────
// Core Interfaces
// ──────────────────────────────────────────────────────────────

/**
 * Represents a single node in the organizational hierarchy.
 * Uses materialized path pattern for efficient tree queries.
 */
export interface OrganizationNode {
  /** Unique identifier (UUID) */
  id: string
  /** Parent organization ID (null for root nodes) */
  parentId: string | null
  /** Type of organization */
  type: OrganizationType
  /** Human-readable name */
  name: string
  /** Unique code/slug for the organization (e.g., "LAG-DIST-01") */
  code: string
  /**
   * Materialized path for efficient ancestry queries.
   * Format: /rootId/childId/grandchildId
   * Root orgs have path: /rootId
   */
  path: string
  /** Depth level in the hierarchy (0 = root) */
  level: number
  /** Additional metadata (JSONB) */
  metadata: OrganizationMetadata
  /** Organization-specific settings */
  settings: OrganizationSettings
  /** Branding configuration */
  branding: OrganizationBranding
  /** Whether the organization is currently active */
  is_active: boolean
  /** Timestamps */
  createdAt: string
  updatedAt: string
}

/**
 * Additional metadata for an organization node.
 * Stored as JSONB for flexibility.
 */
export interface OrganizationMetadata {
  /** Display name in local language */
  localName?: string | null
  /** Physical address */
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
    coordinates?: { lat: number; lng: number }
  } | null
  /** Contact information */
  contact?: {
    phone?: string
    email?: string
    website?: string
    fax?: string
  } | null
  /** External identifiers (e.g., government registration number) */
  externalIds?: Record<string, string> | null
  /** Maximum number of child organizations allowed */
  maxChildren?: number | null
  /** Maximum number of users allowed */
  maxUsers?: number | null
  /** Total enrolled student count (denormalized for performance) */
  studentCount?: number | null
  /** Total staff count (denormalized for performance) */
  staffCount?: number | null
  /** Custom key-value pairs for extensibility */
  custom?: Record<string, unknown> | null
}

/**
 * Complete tenant context for a user within an organization.
 * This is the primary object used to scope all data access.
 */
export interface TenantContext {
  /** The currently active organization ID */
  organizationId: string
  /** The type of the active organization */
  organizationType: OrganizationType
  /** Materialized path of the organization in the hierarchy */
  path: string
  /** Effective permissions within this tenant */
  permissions: EffectivePermissions
  /** Roles delegated to this user at this organization level */
  delegatedRoles: DelegatedAdmin[]
  /** All organization IDs in the ancestry path (from root to current) */
  ancestorIds: string[]
  /** All organization IDs that are direct or nested children */
  descendantIds: string[]
  /** Timestamp when this context was resolved (for cache invalidation) */
  resolvedAt: string
}

/**
 * Computed effective permissions combining direct, delegated, and inherited.
 */
export interface EffectivePermissions {
  /** Roles the user has in this organization context */
  roles: UserRole[]
  /** Specific permission strings (e.g., "exams.create", "students.export") */
  permissions: string[]
  /** Whether the user has super admin access in this context */
  isSuperAdmin: boolean
  /** Whether the user has any admin-level access */
  isAdmin: boolean
  /** Resources the user can access across campuses */
  crossCampusAccess: string[]
}

/**
 * Delegated administration record.
 * Allows granting admin rights at a specific organization level
 * without changing the user's primary role.
 */
export interface DelegatedAdmin {
  /** Unique identifier */
  id: string
  /** The user who receives delegated admin rights */
  userId: string
  /** The organization where the delegation applies */
  organizationId: string
  /** Roles granted through delegation */
  roles: UserRole[]
  /** Scope of delegation: own org only or including descendants */
  scope: DelegationScope
  /** User who granted the delegation */
  grantedBy: string
  /** When the delegation was granted */
  grantedAt: string
  /** When the delegation expires (null = never) */
  expiresAt: string | null
  /** Whether the delegation is currently active */
  isActive: boolean
}

/**
 * Scope of a delegated admin role.
 */
export type DelegationScope = 'own' | 'descendants' | 'own_and_descendants'

/**
 * Branding and white-label configuration for an organization.
 */
export interface OrganizationBranding {
  /** Primary brand color (hex) */
  primaryColor: string
  /** Secondary brand color (hex) */
  secondaryColor: string
  /** Accent color (hex) */
  accentColor: string
  /** URL to the organization logo */
  logoUrl: string | null
  /** URL to the organization favicon */
  faviconUrl: string | null
  /** Custom domain configuration */
  customDomain: CustomDomain | null
  /** White-label specific configuration */
  whiteLabelConfig: WhiteLabelConfig | null
  /** Custom email templates */
  emailTemplates: Record<string, BrandedEmailTemplate> | null
  /** Custom report templates */
  reportTemplates: Record<string, BrandedReportTemplate> | null
}

/**
 * White-label configuration for full brand customization.
 */
export interface WhiteLabelConfig {
  /** Whether white-labeling is enabled */
  enabled: boolean
  /** Custom application name (replaces "ExamForge AI") */
  appName: string | null
  /** Custom login page headline */
  loginHeadline: string | null
  /** Custom login page subtext */
  loginSubtext: string | null
  /** Whether to hide the "Powered by ExamForge" footer */
  hideBranding: boolean
  /** Custom CSS overrides URL */
  customCssUrl: string | null
  /** Custom favicon URL */
  customFaviconUrl: string | null
  /** Whether to show ExamForge marketplace */
  showMarketplace: boolean
  /** Whether to show ExamForge AI features */
  showAIFeatures: boolean
  /** Custom support URL */
  supportUrl: string | null
  /** Custom documentation URL */
  docsUrl: string | null
}

/**
 * Branded email template configuration.
 */
export interface BrandedEmailTemplate {
  /** Template identifier */
  type: string
  /** From email address */
  fromEmail: string | null
  /** From display name */
  fromName: string | null
  /** Reply-to email */
  replyTo: string | null
  /** Custom subject line template */
  subjectTemplate: string | null
  /** Custom header HTML */
  headerHtml: string | null
  /** Custom footer HTML */
  footerHtml: string | null
}

/**
 * Branded report template configuration.
 */
export interface BrandedReportTemplate {
  /** Report type identifier */
  type: string
  /** Custom header text */
  headerText: string | null
  /** Custom footer text */
  footerText: string | null
  /** Custom watermark text */
  watermark: string | null
  /** Whether to include organization logo */
  includeLogo: boolean
  /** Paper size */
  paperSize: 'A4' | 'Letter' | 'Legal'
  /** Orientation */
  orientation: 'portrait' | 'landscape'
  /** Custom margins (in mm) */
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

/**
 * Cross-campus permission record.
 * Allows a user to access resources in another organization.
 */
export interface CrossCampusPermission {
  /** Unique identifier */
  id: string
  /** The user who receives cross-campus access */
  userId: string
  /** Source organization (user's home org) */
  sourceOrgId: string
  /** Target organization (org being accessed) */
  targetOrgId: string
  /** Type of permission granted */
  permissionType: CrossCampusPermissionType
  /** User who granted the permission */
  grantedBy: string
  /** When the permission was granted */
  grantedAt: string
  /** When the permission expires (null = never) */
  expiresAt: string | null
  /** Whether the permission is currently active */
  isActive: boolean
}

/**
 * Types of cross-campus permissions.
 */
export type CrossCampusPermissionType =
  | 'read'
  | 'write'
  | 'admin'
  | 'exam_management'
  | 'student_data'
  | 'reporting'
  | 'curriculum_management'
  | 'full_access'

/**
 * Organization-wide settings with inheritance support.
 * Child organizations inherit settings from parent if not overridden.
 */
export interface OrganizationSettings {
  /** IANA timezone identifier (e.g., "Africa/Lagos") */
  timezone: string
  /** BCP-47 locale identifier (e.g., "en-NG") */
  locale: string
  /** ISO 4217 currency code (e.g., "NGN") */
  currency: string
  /** Academic year format configuration */
  academicYearFormat: AcademicYearFormat
  /** Grading scale configuration */
  gradingScale: GradingScale
  /** Attendance policy configuration */
  attendancePolicy: AttendancePolicy
  /** AI feature configuration */
  aiConfig: OrganizationAIConfig
  /** Feature flags */
  featureFlags: Record<string, boolean>
  /** Custom fields definition */
  customFields: CustomFieldDefinition[]
}

/**
 * Academic year format and configuration.
 */
export interface AcademicYearFormat {
  /** Format pattern (e.g., "YYYY-YYYY", "YYYY/YYYY") */
  format: string
  /** Starting month of academic year (1-12) */
  startMonth: number
  /** Number of terms/semesters per year */
  termsPerYear: number
  /** Term names (e.g., ["First Term", "Second Term", "Third Term"]) */
  termNames: string[]
  /** Whether terms have separate grading periods */
  termGrading: boolean
}

/**
 * Grading scale configuration.
 */
export interface GradingScale {
  /** Scale type */
  type: 'percentage' | 'points' | 'gpa' | 'letter' | 'custom'
  /** Maximum score */
  maxScore: number
  /** Minimum passing score */
  passingScore: number
  /** Grade boundaries for letter/GPA scales */
  boundaries: GradeBoundary[]
}

/**
 * A grade boundary definition.
 */
export interface GradeBoundary {
  /** Minimum score for this grade */
  minScore: number
  /** Maximum score for this grade */
  maxScore: number
  /** Letter grade label */
  label: string
  /** GPA equivalent */
  gpaEquivalent: number | null
  /** Description/remark */
  description: string | null
}

/**
 * Attendance policy configuration.
 */
export interface AttendancePolicy {
  /** Method for tracking attendance */
  method: 'daily' | 'period' | 'session'
  /** Whether late arrival is tracked separately */
  trackLateArrival: boolean
  /** Threshold percentage for attendance warnings */
  warningThreshold: number
  /** Threshold percentage for critical attendance */
  criticalThreshold: number
  /** Whether parents are notified of absences */
  notifyParentsOnAbsence: boolean
  /** Maximum allowed absences before escalation */
  maxAbsencesBeforeEscalation: number | null
}

/**
 * AI configuration for an organization.
 * Allows org-level overrides of AI model/provider/limits.
 */
export interface OrganizationAIConfig {
  /** Default AI model to use */
  model: string
  /** AI provider */
  provider: 'openai' | 'google' | 'anthropic' | 'azure' | 'custom'
  /** Monthly token budget for the organization */
  monthlyTokenBudget: number
  /** Tokens consumed this month */
  tokensConsumed: number
  /** Rate limit: max requests per minute */
  requestsPerMinute: number
  /** Whether AI features are enabled */
  enabled: boolean
  /** Custom system prompt override */
  systemPromptOverride: string | null
  /** Allowed AI features */
  enabledFeatures: AIFeature[]
  /** Custom model parameters */
  modelParameters: Record<string, unknown> | null
}

/**
 * AI features that can be toggled per organization.
 */
export type AIFeature =
  | 'question_generation'
  | 'lesson_planning'
  | 'grading_assistance'
  | 'performance_prediction'
  | 'content_summarization'
  | 'adaptive_learning'
  | 'plagiarism_detection'
  | 'sentiment_analysis'
  | 'report_generation'
  | 'oral_question_generation'

/**
 * Custom field definition for organization-specific data.
 */
export interface CustomFieldDefinition {
  /** Field key/identifier */
  key: string
  /** Display label */
  label: string
  /** Field data type */
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'json'
  /** Whether the field is required */
  required: boolean
  /** Select options (for select/multiselect types) */
  options?: string[]
  /** Default value */
  defaultValue?: unknown
  /** Validation rules */
  validation?: Record<string, unknown>
}

/**
 * Tenant isolation configuration.
 * Defines data sharing and isolation policies between organizations.
 */
export interface TenantIsolationConfig {
  /** Isolation strictness level */
  isolationLevel: 'strict' | 'moderate' | 'relaxed'
  /** Resources shared across organizations in the same tree */
  sharedResources: SharedResource[]
  /** Data policies for cross-organization access */
  dataPolicies: DataPolicy[]
}

/**
 * Shared resource definition.
 */
export interface SharedResource {
  /** Resource type */
  type: 'curriculum' | 'question_bank' | 'report_templates' | 'ai_models' | 'marketplace_content'
  /** Whether the resource is shared */
  enabled: boolean
  /** Scope of sharing */
  scope: 'siblings' | 'ancestors' | 'tree' | 'global'
  /** Direction of sharing */
  direction: 'up' | 'down' | 'both'
}

/**
 * Data policy for cross-organization data access.
 */
export interface DataPolicy {
  /** Policy name */
  name: string
  /** Data type this policy applies to */
  dataType: string
  /** Whether the data can be read across orgs */
  allowRead: boolean
  /** Whether the data can be written across orgs */
  allowWrite: boolean
  /** Whether the data can be exported */
  allowExport: boolean
  /** Additional constraints */
  constraints: Record<string, unknown> | null
}

/**
 * Custom domain configuration.
 */
export interface CustomDomain {
  /** The domain name (e.g., "exams.myschool.edu") */
  domain: string
  /** Whether domain ownership has been verified */
  verified: boolean
  /** When the domain was verified */
  verifiedAt: string | null
  /** Whether SSL is enabled */
  sslEnabled: boolean
  /** User who configured this domain */
  createdBy: string
}

// ──────────────────────────────────────────────────────────────
// Input / Request Types
// ──────────────────────────────────────────────────────────────

/**
 * Input for creating a new organization.
 */
export interface CreateOrganizationInput {
  parentId: string | null
  type: OrganizationType
  name: string
  code: string
  metadata?: Partial<OrganizationMetadata> | null
  settings?: Partial<OrganizationSettings> | null
  branding?: Partial<OrganizationBranding> | null
}

/**
 * Input for updating an existing organization.
 */
export interface UpdateOrganizationInput {
  name?: string | null
  code?: string | null
  metadata?: Partial<OrganizationMetadata> | null
  settings?: Partial<OrganizationSettings> | null
  branding?: Partial<OrganizationBranding> | null
  is_active?: boolean | null
}

/**
 * Input for granting delegated admin rights.
 */
export interface GrantDelegatedAdminInput {
  userId: string
  organizationId: string
  roles: UserRole[]
  scope: DelegationScope
  grantedBy: string
  expiresAt?: string | null
}

/**
 * Input for granting cross-campus access.
 */
export interface GrantCrossCampusAccessInput {
  userId: string
  sourceOrgId: string
  targetOrgId: string
  permissionType: CrossCampusPermissionType
  grantedBy: string
  expiresAt?: string | null
}

/**
 * Search filters for organization queries.
 */
export interface OrganizationSearchFilters {
  type?: OrganizationType | OrganizationType[]
  isActive?: boolean
  parentId?: string
  level?: number
  pathPrefix?: string
}

// ──────────────────────────────────────────────────────────────
// Result Types
// ──────────────────────────────────────────────────────────────

/**
 * Represents an organization node in a tree structure with children.
 */
export interface OrganizationTreeNode extends OrganizationNode {
  children: OrganizationTreeNode[]
}

/**
 * Default settings used when no organization-level override exists.
 */
export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  timezone: 'UTC',
  locale: 'en',
  currency: 'USD',
  academicYearFormat: {
    format: 'YYYY-YYYY',
    startMonth: 9,
    termsPerYear: 3,
    termNames: ['First Term', 'Second Term', 'Third Term'],
    termGrading: true,
  },
  gradingScale: {
    type: 'percentage',
    maxScore: 100,
    passingScore: 50,
    boundaries: [
      { minScore: 70, maxScore: 100, label: 'A', gpaEquivalent: 4.0, description: 'Excellent' },
      { minScore: 60, maxScore: 69, label: 'B', gpaEquivalent: 3.0, description: 'Good' },
      { minScore: 50, maxScore: 59, label: 'C', gpaEquivalent: 2.0, description: 'Fair' },
      { minScore: 40, maxScore: 49, label: 'D', gpaEquivalent: 1.0, description: 'Pass' },
      { minScore: 0, maxScore: 39, label: 'F', gpaEquivalent: 0.0, description: 'Fail' },
    ],
  },
  attendancePolicy: {
    method: 'daily',
    trackLateArrival: true,
    warningThreshold: 75,
    criticalThreshold: 60,
    notifyParentsOnAbsence: true,
    maxAbsencesBeforeEscalation: 15,
  },
  aiConfig: {
    model: 'gpt-4o',
    provider: 'openai',
    monthlyTokenBudget: 1000000,
    tokensConsumed: 0,
    requestsPerMinute: 60,
    enabled: true,
    systemPromptOverride: null,
    enabledFeatures: [
      'question_generation',
      'lesson_planning',
      'grading_assistance',
      'report_generation',
    ],
    modelParameters: null,
  },
  featureFlags: {},
  customFields: [],
}

/**
 * Default branding configuration.
 */
export const DEFAULT_ORGANIZATION_BRANDING: OrganizationBranding = {
  primaryColor: '#2563eb',
  secondaryColor: '#16a34a',
  accentColor: '#f59e0b',
  logoUrl: null,
  faviconUrl: null,
  customDomain: null,
  whiteLabelConfig: null,
  emailTemplates: null,
  reportTemplates: null,
}
