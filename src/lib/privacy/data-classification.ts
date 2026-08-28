// ============================================================================
// ExamForge AI — Data Classification
// ============================================================================
// Classifies all data types in the system by sensitivity level, defines
// retention policies, and specifies access control requirements per
// classification level.
// ============================================================================

// ── Sensitivity Levels ───────────────────────────────────────────────────────

export enum SensitivityLevel {
  /** Publicly available information (e.g., school name, product info) */
  PUBLIC = 'public',

  /** Internal use only (e.g., class schedules, non-sensitive analytics) */
  INTERNAL = 'internal',

  /** Sensitive personal/business data (e.g., grades, attendance, payment info) */
  CONFIDENTIAL = 'confidential',

  /** Highly regulated data (e.g., passwords, SSNs, medical records, API keys) */
  RESTRICTED = 'restricted',
}

// ── Data Categories ──────────────────────────────────────────────────────────

export enum DataCategory {
  STUDENT = 'student',
  TEACHER = 'teacher',
  PARENT = 'parent',
  EXAM = 'exam',
  ATTENDANCE = 'attendance',
  PAYMENT = 'payment',
  AI_CONVERS = 'ai_conversation',
  ANALYTICS = 'analytics',
  SYSTEM = 'system',
  ORGANIZATION = 'organization',
}

// ── Access Control Requirements ──────────────────────────────────────────────

export interface AccessControlRequirement {
  /** Who can read this data */
  readRoles: string[];
  /** Who can write/modify this data */
  writeRoles: string[];
  /** Whether data must be encrypted at rest */
  encryptAtRest: boolean;
  /** Whether data must be encrypted in transit (TLS) */
  encryptInTransit: boolean;
  /** Whether audit logging is required for access */
  auditAccess: boolean;
  /** Whether row-level security is required */
  requiresRLS: boolean;
  /** Maximum time before session timeout for this data (minutes) */
  sessionTimeoutMinutes: number;
  /** Whether IP whitelisting is recommended */
  ipWhitelist: boolean;
}

// ── Retention Policy ─────────────────────────────────────────────────────────

export interface RetentionPolicy {
  /** How long to retain the data (months) */
  retentionMonths: number;
  /** Action to take when retention period expires */
  expiryAction: 'delete' | 'anonymize' | 'archive';
  /** Whether the user can request earlier deletion (GDPR) */
  userDeletable: boolean;
  /** Legal basis for processing */
  legalBasis: string;
  /** Whether consent is required for processing */
  consentRequired: boolean;
  /** Description of the retention rationale */
  rationale: string;
}

// ── Data Field Classification ────────────────────────────────────────────────

export interface DataFieldClassification {
  field: string;
  sensitivity: SensitivityLevel;
  /** Whether this field is personally identifiable information (PII) */
  isPII: boolean;
  /** Whether this field should be included in data exports */
  exportable: boolean;
  /** Whether this field should be masked in logs */
  maskInLogs: boolean;
  /** Whether this field should be excluded from AI prompts */
  excludeFromAI: boolean;
}

// ── Data Type Classification ────────────────────────────────────────────────

export interface DataTypeClassification {
  category: DataCategory;
  tableName: string;
  sensitivity: SensitivityLevel;
  description: string;
  fields: DataFieldClassification[];
  retention: RetentionPolicy;
  accessControl: AccessControlRequirement;
}

// ── Complete Data Classification Map ─────────────────────────────────────────

export const DATA_CLASSIFICATIONS: DataTypeClassification[] = [

  // ── Student Data ──
  {
    category: DataCategory.STUDENT,
    tableName: 'students',
    sensitivity: SensitivityLevel.CONFIDENTIAL,
    description: 'Student personal and academic records',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'first_name', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'last_name', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'email', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: true },
      { field: 'phone', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: true },
      { field: 'date_of_birth', sensitivity: SensitivityLevel.RESTRICTED, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: true },
      { field: 'gender', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'admission_number', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'class_id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'guardian_id', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'photo_url', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: false, maskInLogs: false, excludeFromAI: true },
    ],
    retention: {
      retentionMonths: 84, // 7 years (educational records retention)
      expiryAction: 'anonymize',
      userDeletable: true,
      legalBasis: 'Legitimate interest (educational provision)',
      consentRequired: true,
      rationale: 'Educational records must be retained per national education regulations (minimum 7 years)',
    },
    accessControl: {
      readRoles: ['teacher', 'school_admin', 'parent', 'student:self'],
      writeRoles: ['school_admin', 'teacher'],
      encryptAtRest: true,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 30,
      ipWhitelist: false,
    },
  },

  // ── Teacher Data ──
  {
    category: DataCategory.TEACHER,
    tableName: 'teachers',
    sensitivity: SensitivityLevel.CONFIDENTIAL,
    description: 'Teacher personal and professional records',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'first_name', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'last_name', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'email', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: true },
      { field: 'phone', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: true },
      { field: 'qualification', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'specialization', sensitivity: SensitivityLevel.PUBLIC, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'salary', sensitivity: SensitivityLevel.RESTRICTED, isPII: false, exportable: false, maskInLogs: true, excludeFromAI: true },
    ],
    retention: {
      retentionMonths: 84, // 7 years
      expiryAction: 'anonymize',
      userDeletable: true,
      legalBasis: 'Employment contract & legitimate interest',
      consentRequired: true,
      rationale: 'Employment records retention per labor law requirements',
    },
    accessControl: {
      readRoles: ['school_admin', 'teacher:self'],
      writeRoles: ['school_admin'],
      encryptAtRest: true,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 30,
      ipWhitelist: false,
    },
  },

  // ── Parent Data ──
  {
    category: DataCategory.PARENT,
    tableName: 'parents',
    sensitivity: SensitivityLevel.CONFIDENTIAL,
    description: 'Parent/guardian personal records',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'first_name', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'last_name', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'email', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: true },
      { field: 'phone', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: true, exportable: true, maskInLogs: true, excludeFromAI: true },
      { field: 'occupation', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
    ],
    retention: {
      retentionMonths: 36, // 3 years after last child graduates
      expiryAction: 'delete',
      userDeletable: true,
      legalBasis: 'Consent & legitimate interest (child welfare)',
      consentRequired: true,
      rationale: 'Parent data retained while children are enrolled; deleted after 3 years post-enrollment',
    },
    accessControl: {
      readRoles: ['school_admin', 'teacher', 'parent:self'],
      writeRoles: ['school_admin', 'parent:self'],
      encryptAtRest: true,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 30,
      ipWhitelist: false,
    },
  },

  // ── Exam Data ──
  {
    category: DataCategory.EXAM,
    tableName: 'exams',
    sensitivity: SensitivityLevel.CONFIDENTIAL,
    description: 'Exam definitions, questions, and results',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'title', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'subject_id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'questions', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'answer_key', sensitivity: SensitivityLevel.RESTRICTED, isPII: false, exportable: false, maskInLogs: true, excludeFromAI: true },
      { field: 'results', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
    ],
    retention: {
      retentionMonths: 60, // 5 years
      expiryAction: 'archive',
      userDeletable: false,
      legalBasis: 'Legitimate interest (academic record integrity)',
      consentRequired: false,
      rationale: 'Exam records retained for academic verification and accreditation',
    },
    accessControl: {
      readRoles: ['teacher', 'school_admin', 'student:enrolled'],
      writeRoles: ['teacher', 'school_admin'],
      encryptAtRest: true,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 15,
      ipWhitelist: false,
    },
  },

  // ── Attendance Data ──
  {
    category: DataCategory.ATTENDANCE,
    tableName: 'attendance',
    sensitivity: SensitivityLevel.INTERNAL,
    description: 'Student attendance records',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'student_id', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'date', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'status', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'notes', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: false, maskInLogs: false, excludeFromAI: true },
    ],
    retention: {
      retentionMonths: 60, // 5 years
      expiryAction: 'anonymize',
      userDeletable: false,
      legalBasis: 'Legal obligation (education regulation)',
      consentRequired: false,
      rationale: 'Attendance records required by education regulators for 5 years',
    },
    accessControl: {
      readRoles: ['teacher', 'school_admin', 'parent', 'student:self'],
      writeRoles: ['teacher', 'school_admin'],
      encryptAtRest: false,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 30,
      ipWhitelist: false,
    },
  },

  // ── Payment Data ──
  {
    category: DataCategory.PAYMENT,
    tableName: 'payments',
    sensitivity: SensitivityLevel.RESTRICTED,
    description: 'Payment transactions and billing information',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'user_id', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'amount', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'currency', sensitivity: SensitivityLevel.PUBLIC, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'status', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'card_last_four', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: false, maskInLogs: true, excludeFromAI: true },
      { field: 'card_token', sensitivity: SensitivityLevel.RESTRICTED, isPII: false, exportable: false, maskInLogs: true, excludeFromAI: true },
      { field: 'flutterwave_ref', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: true, excludeFromAI: true },
    ],
    retention: {
      retentionMonths: 84, // 7 years (financial record retention)
      expiryAction: 'archive',
      userDeletable: false,
      legalBasis: 'Legal obligation (financial regulation & tax law)',
      consentRequired: false,
      rationale: 'Financial records must be retained per tax and financial regulations (7 years)',
    },
    accessControl: {
      readRoles: ['school_admin', 'parent:self', 'super_admin'],
      writeRoles: ['school_admin', 'system'],
      encryptAtRest: true,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 15,
      ipWhitelist: true,
    },
  },

  // ── AI Conversation Data ──
  {
    category: DataCategory.AI_CONVERS,
    tableName: 'ai_conversations',
    sensitivity: SensitivityLevel.CONFIDENTIAL,
    description: 'AI tutoring conversations and generated content',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'user_id', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: true, excludeFromAI: false },
      { field: 'prompt', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'response', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'model', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: false, maskInLogs: false, excludeFromAI: false },
      { field: 'tokens_used', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: false, maskInLogs: false, excludeFromAI: false },
    ],
    retention: {
      retentionMonths: 12, // 1 year
      expiryAction: 'delete',
      userDeletable: true,
      legalBasis: 'Consent',
      consentRequired: true,
      rationale: 'AI conversations retained for learning continuity; deleted after 1 year or on user request',
    },
    accessControl: {
      readRoles: ['student:self', 'teacher', 'school_admin'],
      writeRoles: ['system'],
      encryptAtRest: true,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 30,
      ipWhitelist: false,
    },
  },

  // ── Analytics Data ──
  {
    category: DataCategory.ANALYTICS,
    tableName: 'analytics_events',
    sensitivity: SensitivityLevel.INTERNAL,
    description: 'Aggregated analytics and usage metrics',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'event_type', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'user_id', sensitivity: SensitivityLevel.CONFIDENTIAL, isPII: false, exportable: false, maskInLogs: true, excludeFromAI: true },
      { field: 'properties', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'timestamp', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
    ],
    retention: {
      retentionMonths: 24, // 2 years
      expiryAction: 'anonymize',
      userDeletable: false,
      legalBasis: 'Legitimate interest (product improvement)',
      consentRequired: false,
      rationale: 'Analytics data retained for product improvement; anonymized after 2 years',
    },
    accessControl: {
      readRoles: ['school_admin', 'super_admin'],
      writeRoles: ['system'],
      encryptAtRest: false,
      encryptInTransit: true,
      auditAccess: false,
      requiresRLS: true,
      sessionTimeoutMinutes: 60,
      ipWhitelist: false,
    },
  },

  // ── Organization Data ──
  {
    category: DataCategory.ORGANIZATION,
    tableName: 'organizations',
    sensitivity: SensitivityLevel.INTERNAL,
    description: 'Organization/school institutional data',
    fields: [
      { field: 'id', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'name', sensitivity: SensitivityLevel.PUBLIC, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'address', sensitivity: SensitivityLevel.PUBLIC, isPII: false, exportable: true, maskInLogs: false, excludeFromAI: false },
      { field: 'subscription_tier', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: false, maskInLogs: false, excludeFromAI: false },
      { field: 'settings', sensitivity: SensitivityLevel.INTERNAL, isPII: false, exportable: false, maskInLogs: false, excludeFromAI: false },
    ],
    retention: {
      retentionMonths: 0, // Indefinite while active
      expiryAction: 'archive',
      userDeletable: true,
      legalBasis: 'Contractual necessity',
      consentRequired: false,
      rationale: 'Organization data retained while subscription is active; archived on termination',
    },
    accessControl: {
      readRoles: ['school_admin', 'super_admin'],
      writeRoles: ['super_admin'],
      encryptAtRest: false,
      encryptInTransit: true,
      auditAccess: true,
      requiresRLS: true,
      sessionTimeoutMinutes: 30,
      ipWhitelist: false,
    },
  },
];

// ── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get the classification for a specific data category
 */
export function getClassification(category: DataCategory): DataTypeClassification | undefined {
  return DATA_CLASSIFICATIONS.find((c) => c.category === category);
}

/**
 * Get the classification for a specific table
 */
export function getClassificationByTable(tableName: string): DataTypeClassification | undefined {
  return DATA_CLASSIFICATIONS.find((c) => c.tableName === tableName);
}

/**
 * Get all fields classified as PII for a category
 */
export function getPIIFields(category: DataCategory): DataFieldClassification[] {
  const classification = getClassification(category);
  if (!classification) return [];
  return classification.fields.filter((f) => f.isPII);
}

/**
 * Get all fields that should be excluded from AI prompts
 */
export function getAIExcludedFields(category: DataCategory): DataFieldClassification[] {
  const classification = getClassification(category);
  if (!classification) return [];
  return classification.fields.filter((f) => f.excludeFromAI);
}

/**
 * Get all fields that should be masked in logs
 */
export function getLogMaskedFields(category: DataCategory): DataFieldClassification[] {
  const classification = getClassification(category);
  if (!classification) return [];
  return classification.fields.filter((f) => f.maskInLogs);
}

/**
 * Check if a user role has access to a data category
 */
export function hasAccess(
  category: DataCategory,
  role: string,
  accessType: 'read' | 'write'
): boolean {
  const classification = getClassification(category);
  if (!classification) return false;

  const roles = accessType === 'read'
    ? classification.accessControl.readRoles
    : classification.accessControl.writeRoles;

  // Direct role match
  if (roles.includes(role)) return true;

  // Self-access patterns (e.g., 'student:self' matches if role is 'student' with self context)
  const selfPattern = `${role}:self`;
  if (roles.includes(selfPattern)) return true;

  // Hierarchical access: super_admin can read everything
  if (accessType === 'read' && role === 'super_admin') return true;

  return false;
}

/**
 * Get all classifications at or above a sensitivity level
 */
export function getClassificationsBySensitivity(
  minLevel: SensitivityLevel
): DataTypeClassification[] {
  const levelOrder = {
    [SensitivityLevel.PUBLIC]: 0,
    [SensitivityLevel.INTERNAL]: 1,
    [SensitivityLevel.CONFIDENTIAL]: 2,
    [SensitivityLevel.RESTRICTED]: 3,
  };

  return DATA_CLASSIFICATIONS.filter(
    (c) => levelOrder[c.sensitivity] >= levelOrder[minLevel]
  );
}
