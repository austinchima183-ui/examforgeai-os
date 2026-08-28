// ============================================================================
// ExamForge AI — Data Minimization
// ============================================================================
// Implements the principle of data minimization (GDPR Art. 5(1)(c)):
//   - Filter API responses to only return fields needed per role
//   - Never expose unnecessary PII in AI prompts
//   - Sanitize logs of sensitive data
//   - Validate minimum data collection
// ============================================================================

import {
  DataCategory,
  getClassification,
  DATA_CLASSIFICATIONS,
  type DataFieldClassification,
} from './data-classification';
import type { UserRole } from '../canonical-types';

// Re-export UserRole for backward compatibility
export type { UserRole } from '../canonical-types';

// Extended role for data minimization (includes 'system' for internal processes)
type DataMinimizationRole = UserRole | 'system';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MinimizationContext {
  role: DataMinimizationRole;
  category: DataCategory;
  purpose: 'api_response' | 'ai_prompt' | 'log' | 'export' | 'analytics';
  /** Whether the user is accessing their own data */
  isOwnData?: boolean;
  /** Additional fields to include beyond the default set */
  includeFields?: string[];
  /** Fields to explicitly exclude */
  excludeFields?: string[];
}

// ── Role-Based Field Access Maps ─────────────────────────────────────────────

/**
 * Defines which fields each role can see for each data category.
 * This is the core of data minimization — each role gets only what it needs.
 */
const ROLE_FIELD_ACCESS: Record<DataMinimizationRole, Record<DataCategory, string[]>> = {
  super_admin: {
    [DataCategory.STUDENT]: ['id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'admission_number', 'class_id', 'guardian_id', 'photo_url'],
    [DataCategory.TEACHER]: ['id', 'first_name', 'last_name', 'email', 'phone', 'qualification', 'specialization', 'salary'],
    [DataCategory.PARENT]: ['id', 'first_name', 'last_name', 'email', 'phone', 'occupation'],
    [DataCategory.EXAM]: ['id', 'title', 'subject_id', 'questions', 'answer_key', 'results'],
    [DataCategory.ATTENDANCE]: ['id', 'student_id', 'date', 'status', 'notes'],
    [DataCategory.PAYMENT]: ['id', 'user_id', 'amount', 'currency', 'status', 'card_last_four', 'flutterwave_ref'],
    [DataCategory.AI_CONVERS]: ['id', 'user_id', 'prompt', 'response', 'model', 'tokens_used'],
    [DataCategory.ANALYTICS]: ['id', 'event_type', 'user_id', 'properties', 'timestamp'],
    [DataCategory.ORGANIZATION]: ['id', 'name', 'address', 'subscription_tier', 'settings'],
    [DataCategory.SYSTEM]: ['id'],
  },
  school_admin: {
    [DataCategory.STUDENT]: ['id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'admission_number', 'class_id', 'guardian_id'],
    [DataCategory.TEACHER]: ['id', 'first_name', 'last_name', 'email', 'phone', 'qualification', 'specialization'],
    [DataCategory.PARENT]: ['id', 'first_name', 'last_name', 'email', 'phone', 'occupation'],
    [DataCategory.EXAM]: ['id', 'title', 'subject_id', 'questions', 'answer_key', 'results'],
    [DataCategory.ATTENDANCE]: ['id', 'student_id', 'date', 'status', 'notes'],
    [DataCategory.PAYMENT]: ['id', 'user_id', 'amount', 'currency', 'status', 'flutterwave_ref'],
    [DataCategory.AI_CONVERS]: ['id', 'user_id', 'prompt', 'response', 'model', 'tokens_used'],
    [DataCategory.ANALYTICS]: ['id', 'event_type', 'properties', 'timestamp'],
    [DataCategory.ORGANIZATION]: ['id', 'name', 'address', 'subscription_tier', 'settings'],
    [DataCategory.SYSTEM]: ['id'],
  },
  teacher: {
    [DataCategory.STUDENT]: ['id', 'first_name', 'last_name', 'gender', 'admission_number', 'class_id'],
    [DataCategory.TEACHER]: ['id', 'first_name', 'last_name', 'qualification', 'specialization'],
    [DataCategory.PARENT]: ['id', 'first_name', 'last_name', 'phone'],
    [DataCategory.EXAM]: ['id', 'title', 'subject_id', 'questions', 'answer_key', 'results'],
    [DataCategory.ATTENDANCE]: ['id', 'student_id', 'date', 'status'],
    [DataCategory.PAYMENT]: [],
    [DataCategory.AI_CONVERS]: ['id', 'user_id', 'prompt', 'response'],
    [DataCategory.ANALYTICS]: ['id', 'event_type', 'properties', 'timestamp'],
    [DataCategory.ORGANIZATION]: ['id', 'name'],
    [DataCategory.SYSTEM]: ['id'],
  },
  student: {
    [DataCategory.STUDENT]: ['id', 'first_name', 'last_name', 'gender', 'class_id'],
    [DataCategory.TEACHER]: ['id', 'first_name', 'last_name', 'specialization'],
    [DataCategory.PARENT]: ['id', 'first_name', 'last_name'],
    [DataCategory.EXAM]: ['id', 'title', 'subject_id', 'questions', 'results'],
    [DataCategory.ATTENDANCE]: ['id', 'date', 'status'],
    [DataCategory.PAYMENT]: ['id', 'amount', 'currency', 'status'],
    [DataCategory.AI_CONVERS]: ['id', 'prompt', 'response'],
    [DataCategory.ANALYTICS]: [],
    [DataCategory.ORGANIZATION]: ['id', 'name'],
    [DataCategory.SYSTEM]: ['id'],
  },
  parent: {
    [DataCategory.STUDENT]: ['id', 'first_name', 'last_name', 'gender', 'class_id'],
    [DataCategory.TEACHER]: ['id', 'first_name', 'last_name', 'specialization'],
    [DataCategory.PARENT]: ['id', 'first_name', 'last_name', 'email', 'phone'],
    [DataCategory.EXAM]: ['id', 'title', 'subject_id', 'results'],
    [DataCategory.ATTENDANCE]: ['id', 'date', 'status'],
    [DataCategory.PAYMENT]: ['id', 'amount', 'currency', 'status', 'flutterwave_ref'],
    [DataCategory.AI_CONVERS]: [],
    [DataCategory.ANALYTICS]: [],
    [DataCategory.ORGANIZATION]: ['id', 'name'],
    [DataCategory.SYSTEM]: ['id'],
  },
  system: {
    [DataCategory.STUDENT]: ['id', 'first_name', 'last_name', 'email', 'class_id', 'guardian_id'],
    [DataCategory.TEACHER]: ['id', 'first_name', 'last_name', 'email'],
    [DataCategory.PARENT]: ['id', 'first_name', 'last_name', 'email', 'phone'],
    [DataCategory.EXAM]: ['id', 'title', 'subject_id', 'questions', 'answer_key', 'results'],
    [DataCategory.ATTENDANCE]: ['id', 'student_id', 'date', 'status'],
    [DataCategory.PAYMENT]: ['id', 'user_id', 'amount', 'currency', 'status', 'card_token', 'flutterwave_ref'],
    [DataCategory.AI_CONVERS]: ['id', 'user_id', 'prompt', 'response', 'model', 'tokens_used'],
    [DataCategory.ANALYTICS]: ['id', 'event_type', 'user_id', 'properties', 'timestamp'],
    [DataCategory.ORGANIZATION]: ['id', 'name', 'subscription_tier'],
    [DataCategory.SYSTEM]: ['id'],
  },
};

// ── API Response Minimization ────────────────────────────────────────────────

/**
 * Filter an API response object to only include fields the role is allowed to see.
 * This is the core data minimization function for API responses.
 */
export function minimizeApiResponse<T extends Record<string, unknown>>(
  data: T,
  context: MinimizationContext
): Partial<T> {
  const classification = getClassification(context.category);
  if (!classification) {
    // If no classification found, return only non-sensitive fields
    return sanitizeObject(data) as Partial<T>;
  }

  // Get allowed fields for this role and category
  let allowedFields = ROLE_FIELD_ACCESS[context.role]?.[context.category] || [];

  // If accessing own data, allow additional self-access fields
  if (context.isOwnData) {
    const selfAccessFields = getSelfAccessFields(context.category, context.role);
    allowedFields = [...new Set([...allowedFields, ...selfAccessFields])];
  }

  // Apply include/exclude overrides
  if (context.includeFields) {
    allowedFields = [...new Set([...allowedFields, ...context.includeFields])];
  }
  if (context.excludeFields) {
    allowedFields = allowedFields.filter((f) => !context.excludeFields!.includes(f));
  }

  // Filter the data object
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in data) {
      // Check if this field should be masked for this purpose
      const fieldClassification = classification.fields.find((f) => f.field === field);
      result[field] = shouldMaskField(fieldClassification, context.purpose)
        ? maskValue(data[field])
        : data[field];
    }
  }

  return result as Partial<T>;
}

/**
 * Filter an array of objects for API response
 */
export function minimizeApiResponseArray<T extends Record<string, unknown>>(
  data: T[],
  context: MinimizationContext
): Partial<T>[] {
  return data.map((item) => minimizeApiResponse(item, context));
}

// ── AI Prompt Minimization ───────────────────────────────────────────────────

/**
 * Prepare data for use in AI prompts.
 * CRITICAL: Never include PII or fields marked as excludeFromAI.
 */
export function minimizeForAIPrompt<T extends Record<string, unknown>>(
  data: T,
  category: DataCategory
): Partial<T> {
  const classification = getClassification(category);
  if (!classification) {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const fieldClassification of classification.fields) {
    const { field, excludeFromAI, isPII } = fieldClassification;

    // Never include fields explicitly excluded from AI
    if (excludeFromAI) continue;

    // Never include PII in AI prompts
    if (isPII) continue;

    if (field in data) {
      result[field] = data[field];
    }
  }

  return result as Partial<T>;
}

/**
 * Build an AI-safe context string from multiple data sources
 */
export function buildAISafeContext(
  dataSources: Array<{ data: Record<string, unknown>; category: DataCategory }>
): string {
  const parts: string[] = [];

  for (const { data, category } of dataSources) {
    const minimized = minimizeForAIPrompt(data, category);
    if (Object.keys(minimized).length > 0) {
      parts.push(`[${category}]: ${JSON.stringify(minimized)}`);
    }
  }

  return parts.join('\n');
}

// ── Log Sanitization ────────────────────────────────────────────────────────

/**
 * Sanitize a data object for logging.
 * Replaces sensitive fields with masked values.
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  data: T,
  category?: DataCategory
): Record<string, unknown> {
  if (!category) {
    return sanitizeObject(data);
  }

  const classification = getClassification(category);
  if (!classification) {
    return sanitizeObject(data);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const fieldClassification = classification.fields.find((f) => f.field === key);
    if (fieldClassification?.maskInLogs || fieldClassification?.isPII) {
      result[key] = maskValue(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitize a log message string by replacing known sensitive patterns
 */
export function sanitizeLogMessage(message: string): string {
  // Email patterns
  message = message.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[email_redacted]'
  );

  // Phone patterns
  message = message.replace(
    /(?:\+?234|0)[7-9]\d{9}/g,
    '[phone_redacted]'
  );

  // API key patterns
  message = message.replace(
    /sk-[a-zA-Z0-9]{20,}/g,
    '[api_key_redacted]'
  );

  // JWT patterns
  message = message.replace(
    /eyJ[a-zA-Z0-9_-]{10,}/g,
    '[jwt_redacted]'
  );

  // Credit card patterns (last 4)
  message = message.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    '[card_redacted]'
  );

  return message;
}

// ── Minimum Data Collection Validation ───────────────────────────────────────

export interface CollectionValidation {
  valid: boolean;
  issues: string[];
}

/**
 * Validate that a data collection request only asks for fields that are
 * necessary for the stated purpose. Implements GDPR data minimization.
 */
export function validateMinimumCollection(
  category: DataCategory,
  requestedFields: string[],
  purpose: string
): CollectionValidation {
  const issues: string[] = [];
  const classification = getClassification(category);

  if (!classification) {
    return { valid: true, issues: [] };
  }

  // Define minimum required fields per purpose
  const purposeMinimumFields: Record<string, string[]> = {
    'authentication': ['id', 'email'],
    'enrollment': ['id', 'first_name', 'last_name', 'class_id'],
    'grading': ['id', 'first_name', 'last_name'],
    'attendance': ['id', 'first_name', 'last_name', 'class_id'],
    'billing': ['id', 'first_name', 'last_name', 'email'],
    'communication': ['id', 'first_name', 'last_name', 'email'],
    'reporting': ['id', 'first_name', 'last_name', 'class_id'],
    'ai_tutoring': ['id', 'first_name', 'last_name', 'class_id'],
    'profile_update': ['id', 'first_name', 'last_name', 'email'],
  };

  const minimumFields = purposeMinimumFields[purpose];
  if (!minimumFields) {
    // Unknown purpose — flag for review
    issues.push(`Unknown purpose "${purpose}" — data collection should be reviewed`);
    return { valid: issues.length === 0, issues };
  }

  // Check if requesting more fields than necessary
  const extraFields = requestedFields.filter(
    (f) => !minimumFields.includes(f) && !['id'].includes(f)
  );

  if (extraFields.length > 0) {
    // Check if extra fields are PII
    const extraPII = extraFields.filter((f) => {
      const fieldClass = classification.fields.find((fc) => fc.field === f);
      return fieldClass?.isPII;
    });

    if (extraPII.length > 0) {
      issues.push(
        `Collection includes unnecessary PII fields for "${purpose}": ${extraPII.join(', ')}. ` +
        `Only minimum required fields should be collected.`
      );
    }
  }

  // Check if requesting RESTRICTED fields
  const restrictedFields = requestedFields.filter((f) => {
    const fieldClass = classification.fields.find((fc) => fc.field === f);
    return fieldClass?.sensitivity === 'restricted';
  });

  if (restrictedFields.length > 0) {
    issues.push(
      `Collection includes RESTRICTED fields: ${restrictedFields.join(', ')}. ` +
      `These require explicit justification and additional safeguards.`
    );
  }

  return { valid: issues.length === 0, issues };
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function shouldMaskField(
  fieldClassification: DataFieldClassification | undefined,
  purpose: MinimizationContext['purpose']
): boolean {
  if (!fieldClassification) return false;

  // Always mask in logs
  if (purpose === 'log' && fieldClassification.maskInLogs) return true;

  // Always mask in analytics
  if (purpose === 'analytics' && fieldClassification.isPII) return true;

  return false;
}

function maskValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  const str = String(value);

  // Email masking
  if (str.includes('@')) {
    const [local, domain] = str.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }

  // Phone masking
  if (/^\+?\d{7,15}$/.test(str)) {
    return `${str.slice(0, 3)}***${str.slice(-2)}`;
  }

  // String masking
  if (str.length > 4) {
    return `${str.slice(0, 2)}${'*'.repeat(Math.min(str.length - 4, 8))}${str.slice(-2)}`;
  }

  return '***';
}

function sanitizeObject<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    // Basic sanitization: mask anything that looks like a secret
    if (/secret|password|token|key|api_key/i.test(key)) {
      result[key] = '[redacted]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

function getSelfAccessFields(category: DataCategory, role: DataMinimizationRole): string[] {
  // When users access their own data, they can see additional fields
  const selfAccessMap: Record<DataCategory, Record<string, string[]>> = {
    [DataCategory.STUDENT]: {
      student: ['email', 'phone', 'date_of_birth', 'photo_url'],
      parent: ['date_of_birth'],
    },
    [DataCategory.TEACHER]: {
      teacher: ['email', 'phone'],
    },
    [DataCategory.PARENT]: {
      parent: ['email', 'phone', 'occupation'],
    },
    [DataCategory.EXAM]: {},
    [DataCategory.ATTENDANCE]: {},
    [DataCategory.PAYMENT]: {
      student: ['amount', 'currency', 'status'],
      parent: ['amount', 'currency', 'status', 'flutterwave_ref'],
    },
    [DataCategory.AI_CONVERS]: {
      student: ['prompt', 'response'],
    },
    [DataCategory.ANALYTICS]: {},
    [DataCategory.ORGANIZATION]: {},
    [DataCategory.SYSTEM]: {},
  };

  return selfAccessMap[category]?.[role] || [];
}
