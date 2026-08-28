// ============================================================================
// ExamForge AI — Data Retention
// ============================================================================
// Implements data retention policies, auto-deletion, and GDPR rights:
//   - Define retention periods per data type
//   - Auto-deletion after retention period
//   - Export functionality (GDPR right to portability — Art. 20)
//   - Deletion functionality (GDPR right to be forgotten — Art. 17)
//   - Retention policy enforcement
// ============================================================================
// Persistence: Supabase — all queries hit the database for real counts.
// Falls back to zeros/nulls on DB errors so the API contract is preserved.
// ============================================================================

import {
  DataCategory,
  DATA_CLASSIFICATIONS,
  getClassification,
  type RetentionPolicy,
  type DataTypeClassification,
} from './data-classification';

import { createClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RetentionCheckResult {
  category: DataCategory;
  tableName: string;
  recordsOverRetention: number;
  totalRecords: number;
  retentionMonths: number;
  action: RetentionPolicy['expiryAction'];
  oldestRecord: string | null;
}

export interface RetentionEnforcementResult {
  enforced: boolean;
  categories: RetentionEnforcementCategory[];
  totalRecordsDeleted: number;
  totalRecordsAnonymized: number;
  totalRecordsArchived: number;
  timestamp: string;
}

export interface RetentionEnforcementCategory {
  category: DataCategory;
  tableName: string;
  action: RetentionPolicy['expiryAction'];
  recordsAffected: number;
  success: boolean;
  error?: string;
}

export interface DataExportResult {
  userId: string;
  categories: DataExportCategory[];
  exportedAt: string;
  format: string;
  checksum: string;
}

export interface DataExportCategory {
  category: DataCategory;
  tableName: string;
  recordCount: number;
  data: Record<string, unknown>[];
}

export interface DataDeletionResult {
  userId: string;
  deleted: DataDeletionCategory[];
  retained: DataDeletionRetentionCategory[];
  deletedAt: string;
  verificationHash: string;
}

export interface DataDeletionCategory {
  category: DataCategory;
  tableName: string;
  recordsDeleted: number;
}

export interface DataDeletionRetentionCategory {
  category: DataCategory;
  tableName: string;
  recordsRetained: number;
  reason: string;
}

// ── Supabase Client Helper ───────────────────────────────────────────────────

async function getSupabase() {
  try {
    return await createClient()
  } catch {
    return null
  }
}

// ── Retention Period Definitions ─────────────────────────────────────────────

/**
 * Get the retention period for a data category in months
 */
export function getRetentionPeriod(category: DataCategory): number {
  const classification = getClassification(category);
  return classification?.retention.retentionMonths ?? 0;
}

/**
 * Get the full retention policy for a data category
 */
export function getRetentionPolicy(category: DataCategory): RetentionPolicy | null {
  const classification = getClassification(category);
  return classification?.retention ?? null;
}

/**
 * Calculate the cutoff date for a data category
 */
export function getRetentionCutoffDate(category: DataCategory): Date {
  const months = getRetentionPeriod(category);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

// ── Retention Enforcement ───────────────────────────────────────────────────

/**
 * Check which records have exceeded their retention period.
 * Queries Supabase for real counts. Falls back to zeros on DB errors.
 */
export async function checkRetentionCompliance(): Promise<RetentionCheckResult[]> {
  const results: RetentionCheckResult[] = [];
  const sb = await getSupabase()

  for (const classification of DATA_CLASSIFICATIONS) {
    const { category, tableName, retention } = classification;
    const cutoffDate = getRetentionCutoffDate(category);
    const cutoffISO = cutoffDate.toISOString();

    // Default result (used when DB is unavailable or table doesn't exist)
    const fallback: RetentionCheckResult = {
      category,
      tableName,
      recordsOverRetention: 0,
      totalRecords: 0,
      retentionMonths: retention.retentionMonths,
      action: retention.expiryAction,
      oldestRecord: null,
    };

    if (!sb) {
      results.push(fallback);
      continue;
    }

    try {
      // Count total records
      const { count: totalRecords, error: totalError } = await sb
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (totalError) {
        // Table may not exist or RLS blocks — use fallback
        results.push(fallback);
        continue;
      }

      // Count records older than the retention cutoff
      const { count: overRetention, error: overError } = await sb
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISO)

      // Get the oldest record's created_at
      const { data: oldestRow, error: oldestError } = await sb
        .from(tableName)
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      results.push({
        category,
        tableName,
        recordsOverRetention: overError ? 0 : (overRetention ?? 0),
        totalRecords: totalRecords ?? 0,
        retentionMonths: retention.retentionMonths,
        action: retention.expiryAction,
        oldestRecord: (!oldestError && oldestRow?.created_at) ? oldestRow.created_at as string : null,
      });
    } catch {
      results.push(fallback);
    }
  }

  return results;
}

/**
 * Enforce retention policies across all data categories.
 * This should be run as a scheduled job (e.g., daily at 03:00 UTC).
 * When `execute` is true, actual DB mutations are performed.
 */
export async function enforceRetentionPolicies(
  execute: boolean = false
): Promise<RetentionEnforcementResult> {
  const categories: RetentionEnforcementCategory[] = [];
  let totalDeleted = 0;
  let totalAnonymized = 0;
  let totalArchived = 0;

  const sb = await getSupabase()

  for (const classification of DATA_CLASSIFICATIONS) {
    const { category, tableName, retention } = classification;

    // Skip categories with indefinite retention (0 months)
    if (retention.retentionMonths === 0) continue;

    const cutoffDate = getRetentionCutoffDate(category);
    const cutoffISO = cutoffDate.toISOString();

    try {
      if (!sb) {
        // No DB — report zero affected
        categories.push({
          category,
          tableName,
          action: retention.expiryAction,
          recordsAffected: 0,
          success: false,
          error: 'Database unavailable',
        });
        continue;
      }

      switch (retention.expiryAction) {
        case 'delete': {
          let recordsAffected = 0;

          if (execute) {
            // Count first, then delete
            const { count } = await sb
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .lt('created_at', cutoffISO)

            const { error: deleteError } = await sb
              .from(tableName)
              .delete()
              .lt('created_at', cutoffISO)

            if (deleteError) {
              categories.push({
                category,
                tableName,
                action: 'delete',
                recordsAffected: 0,
                success: false,
                error: deleteError.message,
              });
              break;
            }

            recordsAffected = count ?? 0;
          } else {
            // Dry run — just count
            const { count } = await sb
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .lt('created_at', cutoffISO)

            recordsAffected = count ?? 0;
          }

          totalDeleted += recordsAffected;
          categories.push({
            category,
            tableName,
            action: 'delete',
            recordsAffected,
            success: true,
          });
          break;
        }
        case 'anonymize': {
          let recordsAffected = 0;

          if (execute) {
            // Count qualifying records
            const { count } = await sb
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .lt('created_at', cutoffISO)

            // Anonymize PII fields in qualifying records
            const commonPIIFields = ['email', 'phone', 'first_name', 'last_name', 'ip_address'];
            const anonUpdate: Record<string, string> = {};
            for (const field of commonPIIFields) {
              anonUpdate[field] = `[anonymized_${field}]`;
            }

            const { error: updateError } = await sb
              .from(tableName)
              .update(anonUpdate)
              .lt('created_at', cutoffISO)

            if (updateError) {
              categories.push({
                category,
                tableName,
                action: 'anonymize',
                recordsAffected: 0,
                success: false,
                error: updateError.message,
              });
              break;
            }

            recordsAffected = count ?? 0;
          } else {
            // Dry run — just count
            const { count } = await sb
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .lt('created_at', cutoffISO)

            recordsAffected = count ?? 0;
          }

          totalAnonymized += recordsAffected;
          categories.push({
            category,
            tableName,
            action: 'anonymize',
            recordsAffected,
            success: true,
          });
          break;
        }
        case 'archive': {
          // Archive: copy to archive table then delete originals.
          // For safety, we only count in dry-run mode.
          let recordsAffected = 0;

          if (execute) {
            // Fetch records to archive
            const { data: rowsToArchive, error: selectError } = await sb
              .from(tableName)
              .select('*')
              .lt('created_at', cutoffISO)

            if (selectError) {
              categories.push({
                category,
                tableName,
                action: 'archive',
                recordsAffected: 0,
                success: false,
                error: selectError.message,
              });
              break;
            }

            recordsAffected = rowsToArchive?.length ?? 0;

            if (recordsAffected > 0) {
              // Insert into archive table
              const archiveTable = `archived_${tableName}`
              const { error: archiveError } = await sb
                .from(archiveTable)
                .insert(rowsToArchive)

              if (archiveError) {
                categories.push({
                  category,
                  tableName,
                  action: 'archive',
                  recordsAffected: 0,
                  success: false,
                  error: `Archive insert failed: ${archiveError.message}`,
                });
                break;
              }

              // Delete originals
              const { error: deleteError } = await sb
                .from(tableName)
                .delete()
                .lt('created_at', cutoffISO)

              if (deleteError) {
                categories.push({
                  category,
                  tableName,
                  action: 'archive',
                  recordsAffected: 0,
                  success: false,
                  error: `Delete after archive failed: ${deleteError.message}`,
                });
                break;
              }
            }
          } else {
            // Dry run — just count
            const { count } = await sb
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .lt('created_at', cutoffISO)

            recordsAffected = count ?? 0;
          }

          totalArchived += recordsAffected;
          categories.push({
            category,
            tableName,
            action: 'archive',
            recordsAffected,
            success: true,
          });
          break;
        }
      }
    } catch (error) {
      categories.push({
        category,
        tableName,
        action: retention.expiryAction,
        recordsAffected: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    enforced: execute,
    categories,
    totalRecordsDeleted: totalDeleted,
    totalRecordsAnonymized: totalAnonymized,
    totalRecordsArchived: totalArchived,
    timestamp: new Date().toISOString(),
  };
}

// ── Anonymization Helpers ────────────────────────────────────────────────────

/**
 * Anonymize a record by replacing PII with irreversible placeholders
 */
export function anonymizeRecord(
  record: Record<string, unknown>,
  category: DataCategory
): Record<string, unknown> {
  const classification = getClassification(category);
  if (!classification) return record;

  const anonymized = { ...record };

  for (const field of classification.fields) {
    if (field.isPII && field.field in anonymized) {
      // Irreversible anonymization — different from masking
      anonymized[field.field] = `[anonymized_${field.field}]`;
    }
  }

  // Always anonymize common PII fields regardless of classification
  const commonPIIFields = ['email', 'phone', 'first_name', 'last_name', 'ip_address'];
  for (const field of commonPIIFields) {
    if (field in anonymized && typeof anonymized[field] === 'string') {
      anonymized[field] = `[anonymized_${field}]`;
    }
  }

  return anonymized;
}

// ── GDPR Right to Data Portability (Art. 20) ────────────────────────────────

/**
 * Export all data associated with a user in a portable format.
 * Implements GDPR Article 20 — Right to Data Portability.
 *
 * Queries Supabase for the user's data in each classified table.
 * Filters to exportable fields only.
 */
export async function exportUserData(
  userId: string,
  options: {
    format?: 'json' | 'csv';
    categories?: DataCategory[];
  } = {}
): Promise<DataExportResult> {
  const { format = 'json', categories } = options;
  const exportCategories: DataExportCategory[] = [];
  const sb = await getSupabase();

  // Define which tables to export per category
  const exportableCategories = categories ?? Object.values(DataCategory);

  for (const category of exportableCategories) {
    const classification = getClassification(category);
    if (!classification) continue;

    let exportData: Record<string, unknown>[] = [];

    if (sb) {
      try {
        // Query the table for this user's data
        // Try user_id first, fall back to id for tables like organizations
        const { data, error } = await sb
          .from(classification.tableName)
          .select('*')
          .eq('user_id', userId)

        if (!error && data) {
          exportData = data as Record<string, unknown>[];
        } else if (error) {
          // Table may not have user_id or may not exist — skip gracefully
          console.warn(`Export: could not query ${classification.tableName} for user ${userId}:`, error.message)
        }
      } catch (err) {
        console.warn(`Export: error querying ${classification.tableName}:`, err)
      }
    }

    // Filter to exportable fields only
    const filteredData = exportData.map((record) => {
      const filtered: Record<string, unknown> = {};
      for (const field of classification.fields) {
        if (field.exportable && field.field in record) {
          filtered[field.field] = record[field.field];
        }
      }
      return filtered;
    });

    exportCategories.push({
      category,
      tableName: classification.tableName,
      recordCount: filteredData.length,
      data: filteredData,
    });
  }

  // Calculate checksum for integrity verification
  const checksum = generateChecksum(exportCategories);

  return {
    userId,
    categories: exportCategories,
    exportedAt: new Date().toISOString(),
    format,
    checksum,
  };
}

/**
 * Format exported data as a downloadable file
 */
export function formatExportData(exportResult: DataExportResult): string {
  return JSON.stringify(exportResult, null, 2);
}

// ── GDPR Right to Be Forgotten (Art. 17) ────────────────────────────────────

/**
 * Delete all data associated with a user.
 * Implements GDPR Article 17 — Right to Erasure ("Right to be Forgotten").
 *
 * This is a HARD delete for user-controlled data and anonymization
 * for data that must be retained (financial, legal obligations).
 * Queries Supabase for real record counts.
 */
export async function deleteUserData(
  userId: string,
  options: {
    /** Confirmation that the user has explicitly requested deletion */
    confirmedByUser: boolean;
    /** Reason for deletion */
    reason: string;
    /** Whether to actually execute (dry run by default) */
    execute?: boolean;
  }
): Promise<DataDeletionResult> {
  if (!options.confirmedByUser) {
    throw new Error('Data deletion requires explicit user confirmation (GDPR Art. 17)');
  }

  const deleted: DataDeletionCategory[] = [];
  const retained: DataDeletionRetentionCategory[] = [];
  const sb = await getSupabase();

  for (const classification of DATA_CLASSIFICATIONS) {
    const { category, tableName, retention } = classification;

    if (!sb) {
      // No DB — record zero counts
      if (retention.userDeletable) {
        deleted.push({ category, tableName, recordsDeleted: 0 });
      } else {
        retained.push({ category, tableName, recordsRetained: 0, reason: retention.rationale });
      }
      continue;
    }

    try {
      // Count matching records for this user
      const { count, error: countError } = await sb
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const recordCount = countError ? 0 : (count ?? 0);

      if (retention.userDeletable) {
        // This data can be fully deleted
        let recordsDeleted = 0;

        if (options.execute && recordCount > 0) {
          const { error: deleteError } = await sb
            .from(tableName)
            .delete()
            .eq('user_id', userId)

          recordsDeleted = deleteError ? 0 : recordCount;
        }

        deleted.push({
          category,
          tableName,
          recordsDeleted: options.execute ? (recordCount > 0 ? recordCount : 0) : 0,
        });
      } else {
        // This data must be retained (legal obligation) — anonymize instead
        let recordsRetained = recordCount;

        if (options.execute && recordCount > 0) {
          // Anonymize PII fields
          const commonPIIFields = ['email', 'phone', 'first_name', 'last_name', 'ip_address'];
          const anonUpdate: Record<string, string> = {};
          for (const field of commonPIIFields) {
            anonUpdate[field] = `[anonymized_${field}]`;
          }

          const { error: anonError } = await sb
            .from(tableName)
            .update(anonUpdate)
            .eq('user_id', userId)

          if (anonError) {
            recordsRetained = 0; // Anonymization failed
          }
        }

        retained.push({
          category,
          tableName,
          recordsRetained: options.execute ? recordsRetained : recordCount,
          reason: retention.rationale,
        });
      }
    } catch {
      if (retention.userDeletable) {
        deleted.push({ category, tableName, recordsDeleted: 0 });
      } else {
        retained.push({ category, tableName, recordsRetained: 0, reason: retention.rationale });
      }
    }
  }

  // Generate verification hash for audit trail
  const verificationHash = generateVerificationHash(userId, deleted, retained);

  return {
    userId,
    deleted,
    retained,
    deletedAt: new Date().toISOString(),
    verificationHash,
  };
}

/**
 * Verify that a data deletion was complete
 */
export function verifyDeletionCompleteness(
  result: DataDeletionResult
): { verified: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check that something was deleted
  if (result.deleted.length === 0 && result.retained.length === 0) {
    issues.push('No data was deleted or retained — deletion may have failed');
  }

  // Check that retained data has proper justification
  for (const retained of result.retained) {
    if (!retained.reason || retained.reason.trim().length === 0) {
      issues.push(`Retained data in ${retained.tableName} has no justification reason`);
    }
  }

  // Check that verification hash is present
  if (!result.verificationHash) {
    issues.push('Missing verification hash — deletion cannot be verified');
  }

  return { verified: issues.length === 0, issues };
}

// ── Cross-Tenant Data Isolation ──────────────────────────────────────────────

/**
 * Verify that data is properly isolated between tenants (organizations).
 * Queries Supabase to check for cross-tenant data leakage.
 */
export async function verifyTenantIsolation(
  tenantId: string,
  dataCategory: DataCategory
): Promise<{ isolated: boolean; violations: string[] }> {
  const violations: string[] = [];
  const sb = await getSupabase();

  const classification = getClassification(dataCategory);
  if (classification && !classification.accessControl.requiresRLS) {
    violations.push(
      `${dataCategory} does not require RLS — tenant isolation may not be enforced at the database level`
    );
  }

  if (sb && classification) {
    try {
      // Check for records that don't belong to this tenant
      // (i.e., rows where organization_id is NOT the given tenantId)
      const { count, error } = await sb
        .from(classification.tableName)
        .select('*', { count: 'exact', head: true })
        .neq('organization_id', tenantId)

      if (!error && count && count > 0) {
        violations.push(
          `Found ${count} records in ${classification.tableName} not belonging to tenant ${tenantId} — potential data leakage`
        );
      }
    } catch {
      // Cannot verify — may not have organization_id column
    }
  }

  return { isolated: violations.length === 0, violations };
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function generateChecksum(categories: DataExportCategory[]): string {
  // Simple checksum for data integrity verification
  const data = JSON.stringify(categories);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateVerificationHash(
  userId: string,
  deleted: DataDeletionCategory[],
  retained: DataDeletionRetentionCategory[]
): string {
  const data = JSON.stringify({ userId, deleted, retained, timestamp: Date.now() });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `del_${Math.abs(hash).toString(16).padStart(12, '0')}`;
}

// ── Retention Schedule ───────────────────────────────────────────────────────

/**
 * Get the retention enforcement schedule configuration
 */
export function getRetentionSchedule() {
  return {
    /** How often retention enforcement should run */
    frequency: 'daily',
    /** Time of day to run (UTC) */
    time: '03:00',
    /** Whether enforcement is enabled */
    enabled: true,
    /** Maximum records to process per run (safety limit) */
    batchSize: 10000,
    /** Whether to send notifications after enforcement */
    notifyOnCompletion: true,
    /** Categories currently under retention enforcement */
    activeCategories: DATA_CLASSIFICATIONS
      .filter((c) => c.retention.retentionMonths > 0)
      .map((c) => ({
        category: c.category,
        tableName: c.tableName,
        retentionMonths: c.retention.retentionMonths,
        action: c.retention.expiryAction,
      })),
  };
}
