// ============================================================================
// ExamForge AI — Environment Variable Validation
// ============================================================================
// Validates all required environment variables at application startup.
// Implements fail-fast: if any CRITICAL variable is missing or invalid in
// production, the application will refuse to start.
// ============================================================================

// ── Types ────────────────────────────────────────────────────────────────────

export type EnvSeverity = 'critical' | 'warning' | 'info';

export interface EnvIssue {
  variable: string;
  severity: EnvSeverity;
  message: string;
  category: string;
}

export interface EnvValidationResult {
  valid: boolean;
  issues: EnvIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  environment: string;
  timestamp: string;
}

export interface EnvVariableSpec {
  name: string;
  required: boolean;
  severity: EnvSeverity;
  category: string;
  description: string;
  /** Regex pattern the value must match */
  pattern?: RegExp;
  /** Min length for the value */
  minLength?: number;
  /** Values that indicate a placeholder/default (never valid in production) */
  placeholderPatterns?: RegExp[];
  /** Must be a URL */
  isUrl?: boolean;
  /** Must NOT be exposed to the client (NEXT_PUBLIC_) */
  mustBeServerOnly?: boolean;
  /** Should be exposed to the client (NEXT_PUBLIC_) */
  shouldExposeToClient?: boolean;
}

// ── Environment Variable Specifications ─────────────────────────────────────

const ENV_SPECS: EnvVariableSpec[] = [
  // ── Supabase ──
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    severity: 'critical',
    category: 'Supabase',
    description: 'Supabase project URL',
    isUrl: true,
    shouldExposeToClient: true,
    placeholderPatterns: [/your-project/i, /placeholder/i, /example\.com/i],
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    severity: 'critical',
    category: 'Supabase',
    description: 'Supabase anonymous key (public, safe for browser)',
    minLength: 20,
    shouldExposeToClient: true,
    placeholderPatterns: [/your-anon-key/i, /placeholder/i],
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    severity: 'critical',
    category: 'Supabase',
    description: 'Supabase service role key (NEVER expose to client)',
    minLength: 20,
    mustBeServerOnly: true,
    placeholderPatterns: [/your-service-role/i, /placeholder/i],
  },

  // ── AI Providers ──
  {
    name: 'OPENAI_API_KEY',
    required: false,
    severity: 'warning',
    category: 'AI',
    description: 'OpenAI API key for GPT models',
    minLength: 20,
    mustBeServerOnly: true,
    placeholderPatterns: [/sk-placeholder/i, /sk-test/i, /sk-xxxx/i],
  },
  {
    name: 'GEMINI_API_KEY',
    required: false,
    severity: 'warning',
    category: 'AI',
    description: 'Google Gemini API key',
    minLength: 10,
    mustBeServerOnly: true,
    placeholderPatterns: [/your-gemini-key/i, /placeholder/i],
  },

  // ── Payment (Flutterwave) ──
  {
    name: 'FLUTTERWAVE_PUBLIC_KEY',
    required: false,
    severity: 'warning',
    category: 'Payment',
    description: 'Flutterwave public key for client-side encryption',
    shouldExposeToClient: true,
    placeholderPatterns: [/FLWPUBK-xxxx/i, /test/i, /placeholder/i],
  },
  {
    name: 'FLUTTERWAVE_SECRET_KEY',
    required: false,
    severity: 'warning',
    category: 'Payment',
    description: 'Flutterwave secret key for server-side operations',
    mustBeServerOnly: true,
    placeholderPatterns: [/FLWSECK-xxxx/i, /test/i, /placeholder/i],
  },
  {
    name: 'FLUTTERWAVE_WEBHOOK_HASH',
    required: false,
    severity: 'info',
    category: 'Payment',
    description: 'Flutterwave webhook verification hash',
    mustBeServerOnly: true,
  },

  // ── Sentry / Observability ──
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    required: false,
    severity: 'info',
    category: 'Sentry',
    description: 'Sentry DSN for client-side error reporting',
    isUrl: true,
    shouldExposeToClient: true,
  },
  {
    name: 'SENTRY_AUTH_TOKEN',
    required: false,
    severity: 'info',
    category: 'Sentry',
    description: 'Sentry auth token for source map upload',
    mustBeServerOnly: true,
  },
  {
    name: 'SENTRY_ORG',
    required: false,
    severity: 'info',
    category: 'Sentry',
    description: 'Sentry organization slug',
  },
  {
    name: 'SENTRY_PROJECT',
    required: false,
    severity: 'info',
    category: 'Sentry',
    description: 'Sentry project slug',
  },

  // ── Email (Resend) ──
  {
    name: 'RESEND_API_KEY',
    required: false,
    severity: 'warning',
    category: 'Email',
    description: 'Resend API key for transactional emails',
    mustBeServerOnly: true,
    placeholderPatterns: [/re_xxxx/i, /placeholder/i],
  },
  {
    name: 'EMAIL_FROM_ADDRESS',
    required: false,
    severity: 'info',
    category: 'Email',
    description: 'Default sender email address',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // ── Redis (Rate Limiting) ──
  {
    name: 'REDIS_URL',
    required: false,
    severity: 'info',
    category: 'Redis',
    description: 'Redis connection URL for distributed rate limiting',
    isUrl: true,
    mustBeServerOnly: true,
  },

  // ── Application ──
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    severity: 'critical',
    category: 'App',
    description: 'Public application URL',
    isUrl: true,
    shouldExposeToClient: true,
    placeholderPatterns: [/localhost/i],
  },
  {
    name: 'NODE_ENV',
    required: true,
    severity: 'critical',
    category: 'App',
    description: 'Application environment',
    pattern: /^(development|staging|production|test)$/,
  },

  // ── Security ──
  {
    name: 'SESSION_TOKEN_SECRET',
    required: true,
    severity: 'critical',
    category: 'Security',
    description: 'Secret for session token hashing — must be cryptographically random',
    minLength: 32,
    mustBeServerOnly: true,
    placeholderPatterns: [/examforge/i, /dev/i, /secret-dev/i, /changeme/i, /placeholder/i],
  },
  {
    name: 'CSRF_SECRET',
    required: true,
    severity: 'critical',
    category: 'Security',
    description: 'Secret for CSRF token generation — must be cryptographically random',
    minLength: 32,
    mustBeServerOnly: true,
    placeholderPatterns: [/examforge/i, /dev/i, /csrf-secret-dev/i, /changeme/i, /placeholder/i],
  },
  {
    name: 'ENCRYPTION_KEY',
    required: true,
    severity: 'critical',
    category: 'Security',
    description: 'AES-256 encryption key for sensitive data at rest',
    minLength: 32,
    mustBeServerOnly: true,
    placeholderPatterns: [/placeholder/i, /changeme/i, /test/i],
  },
  {
    name: 'WEBHOOK_SECRET',
    required: false,
    severity: 'warning',
    category: 'Security',
    description: 'Secret for webhook signature verification',
    minLength: 16,
    mustBeServerOnly: true,
  },

  // ── Database ──
  {
    name: 'SUPABASE_DB_POOL_URL',
    required: false,
    severity: 'warning',
    category: 'Database',
    description: 'Optional direct Postgres pooler URL for Supabase',
    mustBeServerOnly: true,
  },
];

// ── Development Credential Patterns ──────────────────────────────────────────

const DEV_CREDENTIAL_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /sk-test/i, description: 'Stripe/OpenAI test key detected' },
  { pattern: /pk_test/i, description: 'Stripe test publishable key detected' },
  { pattern: /FLWPUBK-TEST/i, description: 'Flutterwave test public key detected' },
  { pattern: /FLWSECK-TEST/i, description: 'Flutterwave test secret key detected' },
  { pattern: /password/i, description: 'Literal "password" in credential value' },
  { pattern: /admin123/i, description: 'Default admin password detected' },
  { pattern: /secret123/i, description: 'Default secret detected' },
  { pattern: /changeme/i, description: '"changeme" placeholder detected' },
  { pattern: /todo/i, description: '"todo" placeholder in credential value' },
];

// ── Exposed Service Key Patterns ─────────────────────────────────────────────

const EXPOSED_KEY_PREFIXES = [
  { prefix: 'NEXT_PUBLIC_', name: 'NEXT_PUBLIC_' },
];

const MUST_BE_SERVER_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'FLUTTERWAVE_SECRET_KEY',
  'RESEND_API_KEY',
  'ENCRYPTION_KEY',
  'WEBHOOK_SECRET',
  'SENTRY_AUTH_TOKEN',
  'REDIS_URL',
  'SESSION_TOKEN_SECRET',
  'CSRF_SECRET',
];

// ── Validation Logic ────────────────────────────────────────────────────────

function getEnvValue(name: string): string | undefined {
  return process.env[name];
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isStaging(): boolean {
  return (process.env.NODE_ENV as string) === 'staging';
}

function validateVariable(spec: EnvVariableSpec): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const value = getEnvValue(spec.name);
  const isProdLike = isProduction() || isStaging();

  // Check if required variable is missing
  if (spec.required && !value) {
    issues.push({
      variable: spec.name,
      severity: spec.severity,
      message: `Required variable ${spec.name} is not set. ${spec.description}`,
      category: spec.category,
    });
    return issues; // No point checking further
  }

  // Skip optional empty variables
  if (!spec.required && !value) {
    return issues;
  }

  // Check for placeholder values (critical in production)
  if (spec.placeholderPatterns && value) {
    for (const placeholderPattern of spec.placeholderPatterns) {
      if (placeholderPattern.test(value)) {
        issues.push({
          variable: spec.name,
          severity: spec.severity === 'warning' ? 'warning' : (isProdLike ? 'critical' : 'warning'),
          message: `${spec.name} contains placeholder value matching "${placeholderPattern.source}". This must be replaced before deployment.`,
          category: spec.category,
        });
      }
    }
  }

  // Check minimum length
  if (spec.minLength && value && value.length < spec.minLength) {
    issues.push({
      variable: spec.name,
      severity: isProdLike ? 'critical' : 'warning',
      message: `${spec.name} is too short (${value.length} chars, minimum ${spec.minLength}). This likely indicates a placeholder or invalid value.`,
      category: spec.category,
    });
  }

  // Check URL format
  if (spec.isUrl && value) {
    try {
      new URL(value);
    } catch {
      issues.push({
        variable: spec.name,
        severity: isProdLike ? 'critical' : 'warning',
        message: `${spec.name} is not a valid URL: "${value}"`,
        category: spec.category,
      });
    }
  }

  // Check pattern match
  if (spec.pattern && value && !spec.pattern.test(value)) {
    issues.push({
      variable: spec.name,
      severity: isProdLike ? 'critical' : 'warning',
      message: `${spec.name} does not match required pattern: ${spec.pattern.source}`,
      category: spec.category,
    });
  }

  // Check server-only keys not exposed to client
  if (spec.mustBeServerOnly && spec.name.startsWith('NEXT_PUBLIC_')) {
    issues.push({
      variable: spec.name,
      severity: 'critical',
      message: `${spec.name} is marked as server-only but has NEXT_PUBLIC_ prefix. This exposes it to the browser!`,
      category: spec.category,
    });
  }

  // Check for development credentials in production
  if (isProdLike && value) {
    for (const devPattern of DEV_CREDENTIAL_PATTERNS) {
      if (devPattern.pattern.test(value)) {
        issues.push({
          variable: spec.name,
          severity: 'critical',
          message: `${spec.name} contains development credential: ${devPattern.description}. Must not be used in production!`,
          category: spec.category,
        });
      }
    }
  }

  return issues;
}

function checkExposedServerKeys(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProdLike = isProduction() || isStaging();

  for (const key of MUST_BE_SERVER_KEYS) {
    const value = process.env[key];
    if (!value) continue;

    // Check if it's exposed with NEXT_PUBLIC_ prefix
    const publicVariant = `NEXT_PUBLIC_${key}`;
    if (process.env[publicVariant]) {
      issues.push({
        variable: publicVariant,
        severity: 'critical',
        message: `Server-only key ${key} is also exposed as ${publicVariant}. Remove the NEXT_PUBLIC_ variant immediately.`,
        category: 'Security',
      });
    }
  }

  return issues;
}

function checkTestAccountPatterns(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProdLike = isProduction() || isStaging();

  if (!isProdLike) return issues;

  // Check for mock data flags
  const mockFlags = ['MOCK_DATA', 'USE_MOCK', 'ENABLE_MOCK', 'SEED_DATA'];
  for (const flag of mockFlags) {
    if (process.env[flag] === 'true' || process.env[flag] === '1') {
      issues.push({
        variable: flag,
        severity: 'critical',
        message: `Mock data flag ${flag} is enabled in production. This must be disabled.`,
        category: 'Data',
      });
    }
  }

  return issues;
}

// ── Main Validation Function ────────────────────────────────────────────────

/**
 * Validate all environment variables at application startup.
 * Returns a detailed validation result with all issues found.
 *
 * In production, CRITICAL issues will cause the app to fail to start.
 */
export function validateEnvironment(): EnvValidationResult {
  const allIssues: EnvIssue[] = [];
  const environment = process.env.NODE_ENV || 'undefined';

  // Validate all configured variables
  for (const spec of ENV_SPECS) {
    const issues = validateVariable(spec);
    allIssues.push(...issues);
  }

  // Check for exposed server keys
  allIssues.push(...checkExposedServerKeys());

  // Check for test account patterns
  allIssues.push(...checkTestAccountPatterns());

  // Sort issues by severity
  const severityOrder: Record<EnvSeverity, number> = { critical: 0, warning: 1, info: 2 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
  const infoCount = allIssues.filter((i) => i.severity === 'info').length;

  return {
    valid: criticalCount === 0,
    issues: allIssues,
    criticalCount,
    warningCount,
    infoCount,
    environment,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate environment and throw if invalid (for use at startup).
 * Call this at application initialization to fail fast.
 */
export function validateEnvironmentOrFail(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    const criticalIssues = result.issues.filter((i) => i.severity === 'critical');

    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(' ENVIRONMENT VALIDATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const issue of criticalIssues) {
      console.error(`  [CRITICAL] ${issue.variable}: ${issue.message}`);
    }

    if (result.warningCount > 0) {
      console.error(`\n  ${result.warningCount} warning(s) also found.`);
    }

    console.error('\n  Fix these issues before starting the application.\n');

    // During Next.js build phase (phase-production-build), log errors but don't throw.
    // This allows the build to succeed while still surfacing misconfigured vars.
    // At runtime (request time), the app will still fail if vars are truly missing.
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    if (!isBuildPhase) {
      throw new Error(
        `Environment validation failed: ${criticalIssues.length} critical issue(s) found. ` +
        `Variables: ${criticalIssues.map((i) => i.variable).join(', ')}`
      );
    } else {
      console.warn('[ExamForge] Build proceeding despite env validation issues — fix before runtime.');
    }
  }

  // Log warnings in development
  if (result.warningCount > 0 && process.env.NODE_ENV !== 'production') {
    const warnings = result.issues.filter((i) => i.severity === 'warning');
    for (const issue of warnings) {
      console.warn(`[ENV WARN] ${issue.variable}: ${issue.message}`);
    }
  }
}

/**
 * Get a human-readable report of the validation result
 */
export function formatValidationReport(result: EnvValidationResult): string {
  const lines: string[] = [];

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(' ENVIRONMENT VALIDATION REPORT');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`  Environment: ${result.environment}`);
  lines.push(`  Timestamp:   ${result.timestamp}`);
  lines.push(`  Status:      ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push('');
  lines.push(`  Critical: ${result.criticalCount}`);
  lines.push(`  Warnings: ${result.warningCount}`);
  lines.push(`  Info:     ${result.infoCount}`);
  lines.push('');

  if (result.issues.length > 0) {
    lines.push(' Issues:');
    lines.push(' ────────');

    const grouped = new Map<string, EnvIssue[]>();
    for (const issue of result.issues) {
      const group = grouped.get(issue.category) || [];
      group.push(issue);
      grouped.set(issue.category, group);
    }

    for (const [category, issues] of grouped) {
      lines.push(`  [${category}]`);
      for (const issue of issues) {
        const icon = issue.severity === 'critical' ? '❌' :
                    issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`    ${icon} ${issue.variable}: ${issue.message}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
