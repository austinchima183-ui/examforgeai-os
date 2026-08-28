// ============================================================================
// ExamForge AI — Disaster Recovery Configuration
// ============================================================================
// Documents RPO, RTO, backup strategy, incident response, and
// migration rollback procedures.
// ============================================================================

export const DISASTER_RECOVERY = {
  // ──────────────────────────────────────────────────────────────
  // Recovery Objectives
  // ──────────────────────────────────────────────────────────────
  objectives: {
    /** Recovery Point Objective: Maximum acceptable data loss.
     *  With continuous WAL archiving, we can recover to any point
     *  within the retention window. */
    rpo: '5 minutes', // Supabase Point-in-Time Recovery (PITR)

    /** Recovery Time Objective: Maximum acceptable downtime.
     *  With hot standby and automated failover. */
    rto: '15 minutes', // DNS failover + container startup

    /** Backup retention: How long backups are kept */
    backupRetention: {
      daily: '30 days',
      weekly: '90 days',
      monthly: '1 year',
    },
  },

  // ──────────────────────────────────────────────────────────────
  // Backup Strategy
  // ──────────────────────────────────────────────────────────────
  backups: {
    /** Supabase automatically handles PostgreSQL backups.
     *  - Daily full backups with PITR
     *  - WAL archiving for continuous recovery
     *  - Stored in a separate region for geo-redundancy */
    supabase: {
      type: 'managed_postgresql',
      provider: 'supabase',
      schedule: 'continuous_wal_archiving',
      pitr: true,
      retention: '7 days (Supabase Pro) / 30 days (Supabase Enterprise)',
      region: 'separate from primary',
    },

    /** Application-level backup for critical data.
     *  - Export key tables to S3-compatible storage
     *  - Useful for cross-provider migration and compliance */
    application: {
      type: 'scheduled_export',
      schedule: 'daily at 02:00 UTC',
      format: 'postgresql_dump',
      destination: 's3://examforge-backups/daily/',
      tables: [
        'organizations',
        'profiles',
        'schools',
        'exams',
        'questions',
        'exam_submissions',
        'audit_logs',
        'subscriptions',
        'ai_generations',
      ],
    },

    /** Verification: Backups must be tested regularly. */
    verification: {
      schedule: 'weekly',
      procedure: [
        '1. Restore latest backup to a staging database',
        '2. Run integrity checks (row counts, FK constraints)',
        '3. Run automated test suite against restored data',
        '4. Compare checksums with production',
        '5. Document any discrepancies',
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // Incident Response
  // ──────────────────────────────────────────────────────────────
  incidentResponse: {
    severityLevels: {
      critical: {
        description: 'Platform unavailable or data breach',
        responseTime: '15 minutes',
        escalation: 'Immediate — CTO + CEO + On-call engineer',
        examples: [
          'Database corruption',
          'Security breach (data exfiltration confirmed)',
          'Complete platform outage',
          'Payment processing failure',
        ],
      },
      high: {
        description: 'Major feature unavailable or degraded',
        responseTime: '30 minutes',
        escalation: 'On-call engineer → Engineering lead',
        examples: [
          'AI provider outage (all providers)',
          'Billing system failure',
          'Authentication system failure',
          'Single-tenant data leak suspected',
        ],
      },
      medium: {
        description: 'Feature degraded but functional',
        responseTime: '2 hours',
        escalation: 'On-call engineer',
        examples: [
          'Redis unavailable (caching degraded)',
          'Single AI provider failure',
          'Slow database queries (>5s)',
          'Rate limiting false positives',
        ],
      },
      low: {
        description: 'Minor issue, workaround available',
        responseTime: '24 hours',
        escalation: 'Next business day engineer',
        examples: [
          'Non-critical UI bug',
          'Analytics delay',
          'Email delivery delay',
        ],
      },
    },

    runbook: {
      databaseOutage: {
        symptoms: ['/api/health/database returns unhealthy', 'Application errors with DB connection'],
        steps: [
          '1. Check Supabase status page (status.supabase.com)',
          '2. Verify database connection parameters',
          '3. If Supabase outage: activate maintenance mode page',
          '4. If self-inflicted: identify and revert recent migration',
          '5. Monitor /api/health/database for recovery',
          '6. Verify data integrity post-recovery',
        ],
      },
      securityBreach: {
        symptoms: ['Anomaly detection alert', 'Unauthorized access in audit logs'],
        steps: [
          '1. IMMEDIATE: Isolate affected tenant (disable their access)',
          '2. IMMEDIATE: Rotate all exposed secrets',
          '3. IMMEDIATE: Force password reset for affected users',
          '4. Investigate: Review audit logs for scope of breach',
          '5. Document: Record timeline, affected data, remediation',
          '6. Notify: Contact affected organizations per data breach policy',
          '7. Patch: Fix the vulnerability that enabled the breach',
          '8. Verify: Run security test suite to confirm fix',
        ],
      },
      aiProviderOutage: {
        symptoms: ['All AI requests failing', 'Circuit breakers open for all providers'],
        steps: [
          '1. Verify circuit breaker status via /api/health/ai',
          '2. Check provider status pages (Gemini, OpenAI, etc.)',
          '3. If single provider: system auto-fallback should handle',
          '4. If all providers: display AI unavailable message to users',
          '5. Monitor provider recovery via health endpoints',
          '6. Reset circuit breakers when providers recover',
        ],
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // Rollback Strategy
  // ──────────────────────────────────────────────────────────────
  rollback: {
    application: {
      method: 'Vercel instant rollback',
      procedure: [
        '1. Navigate to Vercel dashboard → Deployments',
        '2. Find the last known good deployment',
        '3. Click "Promote to Production"',
        '4. Verify /api/health returns healthy',
      ],
      maxTime: '2 minutes',
    },
    database: {
      method: 'Supabase Point-in-Time Recovery',
      procedure: [
        '1. Identify the point of failure (timestamp)',
        '2. Contact Supabase support or use PITR API',
        '3. Restore to timestamp just before the incident',
        '4. Verify data integrity with test suite',
        '5. Promote restored database to primary',
      ],
      maxTime: '15 minutes',
      warning: 'PITR may result in data loss for transactions after the recovery point',
    },
    migration: {
      method: 'Rollback migration script',
      procedure: [
        '1. Identify the failed migration',
        '2. Run the corresponding _rollback.sql script',
        '3. Verify database schema matches expected state',
        '4. Run integration tests against rolled-back schema',
        '5. If rollback fails: contact DBA / restore from backup',
      ],
      maxTime: '5 minutes',
      warning: 'NEVER run DDL migrations without a tested rollback script',
    },
  },
} as const

/**
 * Recovery procedure type definitions.
 */
export type SeverityLevel = keyof typeof DISASTER_RECOVERY.incidentResponse.severityLevels
export type RunbookScenario = keyof typeof DISASTER_RECOVERY.incidentResponse.runbook
