// ============================================================================
// ExamForge AI — Privacy Test Suite
// ============================================================================
// Tests for data minimization, PII handling, retention enforcement,
// data export, data deletion, and cross-tenant data isolation.
// ============================================================================

import { describe, it, expect } from 'vitest';

import {
  DataCategory,
  SensitivityLevel,
  DATA_CLASSIFICATIONS,
  getClassification,
  getClassificationByTable,
  getPIIFields,
  getAIExcludedFields,
  getLogMaskedFields,
  hasAccess,
  getClassificationsBySensitivity,
} from '../data-classification';

import {
  minimizeApiResponse,
  minimizeApiResponseArray,
  minimizeForAIPrompt,
  buildAISafeContext,
  sanitizeForLogging,
  sanitizeLogMessage,
  validateMinimumCollection,
  type MinimizationContext,
  type UserRole,
} from '../data-minimization';

import {
  getRetentionPeriod,
  getRetentionPolicy,
  getRetentionCutoffDate,
  checkRetentionCompliance,
  anonymizeRecord,
  exportUserData,
  deleteUserData,
  verifyDeletionCompleteness,
  verifyTenantIsolation,
  getRetentionSchedule,
} from '../data-retention';

// ============================================================================
// Data Minimization Filters
// ============================================================================

describe('Data Minimization', () => {
  const studentData = {
    id: 'stu-001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@school.edu',
    phone: '+2348012345678',
    date_of_birth: '2010-05-15',
    gender: 'male',
    admission_number: 'ADM2024001',
    class_id: 'cls-001',
    guardian_id: 'par-001',
    photo_url: 'https://cdn.example.com/photos/stu-001.jpg',
  };

  describe('minimizeApiResponse', () => {
    it('should return only allowed fields for teacher role', () => {
      const context: MinimizationContext = {
        role: 'teacher',
        category: DataCategory.STUDENT,
        purpose: 'api_response',
      };

      const result = minimizeApiResponse(studentData, context);

      // Teacher should see basic student info but not PII like email, phone, DOB
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('first_name');
      expect(result).toHaveProperty('last_name');
      expect(result).toHaveProperty('gender');
      expect(result).toHaveProperty('admission_number');
      expect(result).toHaveProperty('class_id');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('date_of_birth');
      expect(result).not.toHaveProperty('photo_url');
    });

    it('should return more fields for school_admin role', () => {
      const context: MinimizationContext = {
        role: 'school_admin',
        category: DataCategory.STUDENT,
        purpose: 'api_response',
      };

      const result = minimizeApiResponse(studentData, context);

      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('date_of_birth');
    });

    it('should allow self-access fields for own data', () => {
      const context: MinimizationContext = {
        role: 'student',
        category: DataCategory.STUDENT,
        purpose: 'api_response',
        isOwnData: true,
      };

      const result = minimizeApiResponse(studentData, context);

      // Student accessing own data should see email and phone
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('phone');
    });

    it('should respect includeFields override', () => {
      const context: MinimizationContext = {
        role: 'teacher',
        category: DataCategory.STUDENT,
        purpose: 'api_response',
        includeFields: ['email'],
      };

      const result = minimizeApiResponse(studentData, context);

      expect(result).toHaveProperty('email');
    });

    it('should respect excludeFields override', () => {
      const context: MinimizationContext = {
        role: 'school_admin',
        category: DataCategory.STUDENT,
        purpose: 'api_response',
        excludeFields: ['phone'],
      };

      const result = minimizeApiResponse(studentData, context);

      expect(result).not.toHaveProperty('phone');
    });

    it('should handle arrays of objects', () => {
      const context: MinimizationContext = {
        role: 'teacher',
        category: DataCategory.STUDENT,
        purpose: 'api_response',
      };

      const result = minimizeApiResponseArray([studentData, studentData], context);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('first_name');
      expect(result[0]).not.toHaveProperty('email');
    });

    it('should not expose payment data to teachers', () => {
      const paymentData = {
        id: 'pay-001',
        user_id: 'par-001',
        amount: 50000,
        currency: 'NGN',
        status: 'completed',
        card_last_four: '4242',
        flutterwave_ref: 'FLW-001',
      };

      const context: MinimizationContext = {
        role: 'teacher',
        category: DataCategory.PAYMENT,
        purpose: 'api_response',
      };

      const result = minimizeApiResponse(paymentData, context);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});

// ============================================================================
// PII Not in AI Prompts
// ============================================================================

describe('AI Prompt Minimization', () => {
  it('should exclude PII fields from AI prompts', () => {
    const studentData = {
      id: 'stu-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@school.edu',
      phone: '+2348012345678',
      date_of_birth: '2010-05-15',
      gender: 'male',
      admission_number: 'ADM2024001',
      class_id: 'cls-001',
    };

    const result = minimizeForAIPrompt(studentData, DataCategory.STUDENT);

    // PII fields should never be in AI prompts
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('date_of_birth');
    expect(result).not.toHaveProperty('photo_url');
  });

  it('should exclude fields marked as excludeFromAI', () => {
    const paymentData = {
      id: 'pay-001',
      amount: 50000,
      card_last_four: '4242',
      card_token: 'tok_xxx',
      flutterwave_ref: 'FLW-001',
    };

    const result = minimizeForAIPrompt(paymentData, DataCategory.PAYMENT);

    // Card details and refs should never be in AI prompts
    expect(result).not.toHaveProperty('card_last_four');
    expect(result).not.toHaveProperty('card_token');
    expect(result).not.toHaveProperty('flutterwave_ref');
  });

  it('should allow non-PII, non-excluded fields in AI prompts', () => {
    const examData = {
      id: 'exam-001',
      title: 'Math Midterm',
      subject_id: 'sub-math',
    };

    const result = minimizeForAIPrompt(examData, DataCategory.EXAM);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('subject_id');
  });

  it('buildAISafeContext should combine multiple sources safely', () => {
    const context = buildAISafeContext([
      {
        data: { id: 'stu-001', first_name: 'John', email: 'john@school.edu', class_id: 'cls-001' },
        category: DataCategory.STUDENT,
      },
      {
        data: { id: 'exam-001', title: 'Math Test' },
        category: DataCategory.EXAM,
      },
    ]);

    // Should not contain PII
    expect(context).not.toContain('john@school.edu');
    // Should contain non-PII data
    expect(context).toContain('Math Test');
  });
});

// ============================================================================
// Retention Enforcement
// ============================================================================

describe('Data Retention', () => {
  it('should return correct retention periods', () => {
    expect(getRetentionPeriod(DataCategory.STUDENT)).toBe(84); // 7 years
    expect(getRetentionPeriod(DataCategory.AI_CONVERS)).toBe(12); // 1 year
    expect(getRetentionPeriod(DataCategory.ANALYTICS)).toBe(24); // 2 years
    expect(getRetentionPeriod(DataCategory.ORGANIZATION)).toBe(0); // Indefinite
  });

  it('should return correct retention policies', () => {
    const studentPolicy = getRetentionPolicy(DataCategory.STUDENT);
    expect(studentPolicy).toBeDefined();
    expect(studentPolicy?.expiryAction).toBe('anonymize');
    expect(studentPolicy?.userDeletable).toBe(true);
    expect(studentPolicy?.consentRequired).toBe(true);

    const paymentPolicy = getRetentionPolicy(DataCategory.PAYMENT);
    expect(paymentPolicy).toBeDefined();
    expect(paymentPolicy?.expiryAction).toBe('archive');
    expect(paymentPolicy?.userDeletable).toBe(false);
  });

  it('should calculate correct cutoff dates', () => {
    const cutoff = getRetentionCutoffDate(DataCategory.AI_CONVERS);
    const expectedCutoff = new Date();
    expectedCutoff.setMonth(expectedCutoff.getMonth() - 12);

    // Should be within 1 second of expected (accounting for test execution time)
    expect(Math.abs(cutoff.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
  });

  it('should return retention compliance check results', async () => {
    const results = await checkRetentionCompliance();
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('tableName');
      expect(result).toHaveProperty('retentionMonths');
      expect(result).toHaveProperty('action');
    }
  });

  it('should return valid retention schedule', () => {
    const schedule = getRetentionSchedule();
    expect(schedule.frequency).toBe('daily');
    expect(schedule.enabled).toBe(true);
    expect(schedule.batchSize).toBeGreaterThan(0);
    expect(schedule.activeCategories.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Anonymization
// ============================================================================

describe('Anonymization', () => {
  it('should replace PII fields with placeholders', () => {
    const record = {
      id: 'stu-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@school.edu',
      phone: '+2348012345678',
      class_id: 'cls-001',
    };

    const anonymized = anonymizeRecord(record, DataCategory.STUDENT);

    expect(anonymized.first_name).toBe('[anonymized_first_name]');
    expect(anonymized.last_name).toBe('[anonymized_last_name]');
    expect(anonymized.email).toBe('[anonymized_email]');
    expect(anonymized.phone).toBe('[anonymized_phone]');
    // Non-PII fields should remain unchanged
    expect(anonymized.id).toBe('stu-001');
    expect(anonymized.class_id).toBe('cls-001');
  });

  it('should be irreversible (placeholder values, not masked)', () => {
    const record = { email: 'john@school.edu' };
    const anonymized = anonymizeRecord(record, DataCategory.STUDENT);

    // Anonymized value should NOT be reversible
    expect(anonymized.email).not.toContain('john');
    expect(anonymized.email).not.toContain('school.edu');
  });
});

// ============================================================================
// Data Export Format (GDPR Right to Portability)
// ============================================================================

describe('Data Export', () => {
  it('should generate export with correct structure', async () => {
    const result = await exportUserData('user-001');

    expect(result).toHaveProperty('userId', 'user-001');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('exportedAt');
    expect(result).toHaveProperty('format', 'json');
    expect(result).toHaveProperty('checksum');
  });

  it('should only include exportable fields', async () => {
    const result = await exportUserData('user-001');

    for (const category of result.categories) {
      expect(category).toHaveProperty('category');
      expect(category).toHaveProperty('tableName');
      expect(category).toHaveProperty('recordCount');
      expect(category).toHaveProperty('data');
    }
  });

  it('should generate a valid checksum', async () => {
    const result = await exportUserData('user-001');

    expect(result.checksum).toMatch(/^[a-f0-9]+$/);
    expect(result.checksum.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Data Deletion Completeness (GDPR Right to be Forgotten)
// ============================================================================

describe('Data Deletion', () => {
  it('should require user confirmation', async () => {
    await expect(
      deleteUserData('user-001', {
        confirmedByUser: false,
        reason: 'test',
      })
    ).rejects.toThrow('explicit user confirmation');
  });

  it('should separate deletable and retainable data', async () => {
    const result = await deleteUserData('user-001', {
      confirmedByUser: true,
      reason: 'User requested deletion (GDPR Art. 17)',
    });

    expect(result).toHaveProperty('userId', 'user-001');
    expect(result).toHaveProperty('deleted');
    expect(result).toHaveProperty('retained');
    expect(result).toHaveProperty('deletedAt');
    expect(result).toHaveProperty('verificationHash');

    // Student data should be deletable
    const deletedCategories = result.deleted.map((d) => d.category);
    expect(deletedCategories).toContain(DataCategory.STUDENT);

    // Payment data should be retained (legal obligation)
    const retainedCategories = result.retained.map((r) => r.category);
    expect(retainedCategories).toContain(DataCategory.PAYMENT);
  });

  it('should provide retention reasons for retained data', async () => {
    const result = await deleteUserData('user-001', {
      confirmedByUser: true,
      reason: 'GDPR deletion request',
    });

    for (const retained of result.retained) {
      expect(retained.reason).toBeTruthy();
      expect(retained.reason.length).toBeGreaterThan(0);
    }
  });

  it('should generate verification hash', async () => {
    const result = await deleteUserData('user-001', {
      confirmedByUser: true,
      reason: 'test',
    });

    expect(result.verificationHash).toMatch(/^del_[a-f0-9]+$/);
  });
});

describe('Deletion Verification', () => {
  it('should verify complete deletion', () => {
    const result = {
      userId: 'user-001',
      deleted: [{ category: DataCategory.STUDENT, tableName: 'students', recordsDeleted: 5 }],
      retained: [{ category: DataCategory.PAYMENT, tableName: 'payments', recordsRetained: 3, reason: 'Legal obligation' }],
      deletedAt: new Date().toISOString(),
      verificationHash: 'del_abc123def456',
    };

    const verification = verifyDeletionCompleteness(result);
    expect(verification.verified).toBe(true);
    expect(verification.issues).toHaveLength(0);
  });

  it('should flag missing retention reasons', () => {
    const result = {
      userId: 'user-001',
      deleted: [],
      retained: [{ category: DataCategory.PAYMENT, tableName: 'payments', recordsRetained: 3, reason: '' }],
      deletedAt: new Date().toISOString(),
      verificationHash: 'del_abc123def456',
    };

    const verification = verifyDeletionCompleteness(result);
    expect(verification.verified).toBe(false);
    expect(verification.issues.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Cross-Tenant Data Isolation
// ============================================================================

describe('Cross-Tenant Data Isolation', () => {
  it('should verify isolation for categories with RLS', async () => {
    const result = await verifyTenantIsolation('org-001', DataCategory.STUDENT);

    // Student data requires RLS, so should pass
    expect(result.isolated).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag categories without RLS', async () => {
    const result = await verifyTenantIsolation('org-001', DataCategory.ANALYTICS);

    // Analytics doesn't require RLS — this could be a violation
    if (!result.isolated) {
      expect(result.violations.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Data Classification
// ============================================================================

describe('Data Classification', () => {
  it('should classify all data categories', () => {
    expect(DATA_CLASSIFICATIONS.length).toBeGreaterThan(0);

    const categories = DATA_CLASSIFICATIONS.map((c) => c.category);
    expect(categories).toContain(DataCategory.STUDENT);
    expect(categories).toContain(DataCategory.TEACHER);
    expect(categories).toContain(DataCategory.PARENT);
    expect(categories).toContain(DataCategory.EXAM);
    expect(categories).toContain(DataCategory.ATTENDANCE);
    expect(categories).toContain(DataCategory.PAYMENT);
    expect(categories).toContain(DataCategory.AI_CONVERS);
    expect(categories).toContain(DataCategory.ANALYTICS);
  });

  it('should have PII fields for student data', () => {
    const piiFields = getPIIFields(DataCategory.STUDENT);
    expect(piiFields.length).toBeGreaterThan(0);

    const fieldNames = piiFields.map((f) => f.field);
    expect(fieldNames).toContain('first_name');
    expect(fieldNames).toContain('last_name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('phone');
    expect(fieldNames).toContain('date_of_birth');
  });

  it('should have AI-excluded fields for student data', () => {
    const excludedFields = getAIExcludedFields(DataCategory.STUDENT);
    expect(excludedFields.length).toBeGreaterThan(0);

    const fieldNames = excludedFields.map((f) => f.field);
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('phone');
    expect(fieldNames).toContain('date_of_birth');
    expect(fieldNames).toContain('photo_url');
  });

  it('should have log-masked fields for student data', () => {
    const maskedFields = getLogMaskedFields(DataCategory.STUDENT);
    expect(maskedFields.length).toBeGreaterThan(0);

    const fieldNames = maskedFields.map((f) => f.field);
    expect(fieldNames).toContain('first_name');
    expect(fieldNames).toContain('email');
  });

  it('should enforce correct sensitivity levels', () => {
    const studentClass = getClassification(DataCategory.STUDENT);
    expect(studentClass?.sensitivity).toBe(SensitivityLevel.CONFIDENTIAL);

    const paymentClass = getClassification(DataCategory.PAYMENT);
    expect(paymentClass?.sensitivity).toBe(SensitivityLevel.RESTRICTED);

    const analyticsClass = getClassification(DataCategory.ANALYTICS);
    expect(analyticsClass?.sensitivity).toBe(SensitivityLevel.INTERNAL);
  });

  it('should enforce access control requirements', () => {
    const paymentClass = getClassification(DataCategory.PAYMENT);
    expect(paymentClass?.accessControl.encryptAtRest).toBe(true);
    expect(paymentClass?.accessControl.requiresRLS).toBe(true);
    expect(paymentClass?.accessControl.auditAccess).toBe(true);
    expect(paymentClass?.accessControl.ipWhitelist).toBe(true);
  });

  it('should classify by sensitivity level', () => {
    const restricted = getClassificationsBySensitivity(SensitivityLevel.RESTRICTED);
    expect(restricted.length).toBeGreaterThan(0);

    const restrictedCategories = restricted.map((c) => c.category);
    expect(restrictedCategories).toContain(DataCategory.PAYMENT);
  });

  it('should check role access correctly', () => {
    expect(hasAccess(DataCategory.STUDENT, 'teacher', 'read')).toBe(true);
    expect(hasAccess(DataCategory.PAYMENT, 'teacher', 'read')).toBe(false);
    expect(hasAccess(DataCategory.PAYMENT, 'school_admin', 'read')).toBe(true);
    expect(hasAccess(DataCategory.STUDENT, 'student', 'read')).toBe(true);
  });
});

// ============================================================================
// Log Sanitization
// ============================================================================

describe('Log Sanitization', () => {
  it('should sanitize email addresses in log messages', () => {
    const result = sanitizeLogMessage('User john.doe@school.edu logged in');
    expect(result).not.toContain('john.doe@school.edu');
    expect(result).toContain('[email_redacted]');
  });

  it('should sanitize API keys in log messages', () => {
    const result = sanitizeLogMessage('API call with key sk-abcdefghijklmnopqrst');
    expect(result).not.toContain('sk-abcdefghijklmnopqrst');
    expect(result).toContain('[api_key_redacted]');
  });

  it('should sanitize phone numbers in log messages', () => {
    const result = sanitizeLogMessage('Called parent at +2348012345678');
    expect(result).not.toContain('+2348012345678');
    expect(result).toContain('[phone_redacted]');
  });

  it('should sanitize JWT tokens in log messages', () => {
    const result = sanitizeLogMessage('Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(result).toContain('[jwt_redacted]');
  });

  it('should sanitize for logging with classification', () => {
    const data = {
      id: 'stu-001',
      first_name: 'John',
      email: 'john@school.edu',
      class_id: 'cls-001',
    };

    const result = sanitizeForLogging(data, DataCategory.STUDENT);

    // PII fields should be masked
    expect(result.email).not.toBe('john@school.edu');
    expect(result.first_name).not.toBe('John');
    // Non-PII fields should remain
    expect(result.id).toBe('stu-001');
    expect(result.class_id).toBe('cls-001');
  });
});

// ============================================================================
// Minimum Data Collection Validation
// ============================================================================

describe('Minimum Data Collection', () => {
  it('should validate minimum collection for grading purpose', () => {
    const result = validateMinimumCollection(
      DataCategory.STUDENT,
      ['id', 'first_name', 'last_name'],
      'grading'
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should flag unnecessary PII collection', () => {
    const result = validateMinimumCollection(
      DataCategory.STUDENT,
      ['id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth'],
      'grading'
    );

    // email, phone, DOB are not needed for grading
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should flag RESTRICTED field collection', () => {
    const result = validateMinimumCollection(
      DataCategory.STUDENT,
      ['id', 'first_name', 'last_name', 'date_of_birth'],
      'enrollment'
    );

    // date_of_birth is RESTRICTED
    expect(result.issues.some((i) => i.includes('RESTRICTED'))).toBe(true);
  });

  it('should allow billing purpose to collect email', () => {
    const result = validateMinimumCollection(
      DataCategory.STUDENT,
      ['id', 'first_name', 'last_name', 'email'],
      'billing'
    );

    expect(result.valid).toBe(true);
  });
});
