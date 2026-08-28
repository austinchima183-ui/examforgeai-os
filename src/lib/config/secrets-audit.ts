// ============================================================================
// ExamForge AI — Secrets Audit
// ============================================================================
// Scans the codebase for hardcoded secrets, development credentials, and
// verifies .env.example completeness. Can be run as part of CI/CD pipeline
// to prevent secrets from being committed.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SecretsAuditIssue {
  type: 'hardcoded-secret' | 'dev-credential' | 'missing-env-doc' | 'exposed-secret' | 'weak-secret';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  message: string;
  value?: string; // Masked/Truncated for safety
}

export interface SecretsAuditResult {
  passed: boolean;
  issues: SecretsAuditIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  filesScanned: number;
  timestamp: string;
}

// ── Secret Detection Patterns ───────────────────────────────────────────────

const SECRET_PATTERNS: {
  name: string;
  pattern: RegExp;
  severity: SecretsAuditIssue['severity'];
  type: SecretsAuditIssue['type'];
}[] = [
  // API Keys
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{20,}/,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
  {
    name: 'AWS Secret Key',
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*["'][A-Za-z0-9/+=]{40}["']/,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
  {
    name: 'Generic API Key Assignment',
    pattern: /(?:api[_-]?key|apikey|API[_-]?KEY)\s*[=:]\s*["'][A-Za-z0-9]{20,}["']/i,
    severity: 'high',
    type: 'hardcoded-secret',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
  // Supabase Keys
  {
    name: 'Supabase Service Role Key',
    pattern: /eyJ[a-zA-Z0-9]{100,}/,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
  // Flutterwave
  {
    name: 'Flutterwave Secret Key',
    pattern: /FLWSECK-[a-zA-Z0-9-]{20,}/,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
  // Database URLs with credentials
  {
    name: 'Database URL with Password',
    pattern: /(?:postgres|mysql|mongodb):\/\/[^:s]+:[^@]+@/,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
  // Generic secrets
  {
    name: 'Secret Assignment',
    pattern: /(?:secret|SECRET|token|TOKEN|password|PASSWORD)\s*[=:]\s*["'][^"']{8,}["']/,
    severity: 'high',
    type: 'hardcoded-secret',
  },
  // Encryption keys
  {
    name: 'Encryption Key',
    pattern: /(?:encryption[_-]?key|ENCRYPTION[_-]?KEY)\s*[=:]\s*["'][A-Za-z0-9]{16,}["']/i,
    severity: 'critical',
    type: 'hardcoded-secret',
  },
];

const DEV_CREDENTIAL_PATTERNS: {
  name: string;
  pattern: RegExp;
}[] = [
  { name: 'Test API Key', pattern: /sk-test[a-zA-Z0-9]*/ },
  { name: 'Stripe Test Key', pattern: /pk_test_[a-zA-Z0-9]+/ },
  { name: 'Flutterwave Test Key', pattern: /FLWPUBK-TEST-[a-zA-Z0-9-]+/ },
  { name: 'Default Password', pattern: /password['":\s]*[=:]['":\s]*(?:admin|root|test|default|changeme)/i },
  { name: 'Hardcoded Localhost', pattern: /https?:\/\/localhost(?::\d+)?/ },
  { name: 'Hardcoded 127.0.0.1', pattern: /https?:\/\/127\.0\.0\.1(?::\d+)?/ },
  { name: 'Placeholder Value', pattern: /(?:your-|my-|replace-|insert-)(?:key|secret|token|password)/i },
  { name: 'Todo Secret', pattern: /(?:TODO|FIXME|HACK|XXX).*(?:secret|key|password|token)/i },
];

const WEAK_SECRET_PATTERNS: {
  name: string;
  pattern: RegExp;
}[] = [
  { name: 'Short Secret (<16 chars)', pattern: /(?:secret|SECRET|key|KEY)\s*[=:]\s*["'][A-Za-z0-9]{1,15}["']/ },
  { name: 'Numeric-only Secret', pattern: /(?:secret|SECRET|password|PASSWORD)\s*[=:]\s*["']\d{4,}["']/ },
  { name: 'Common Password', pattern: /(?:password|PASSWORD)\s*[=:]\s*["'](?:123456|password|qwerty|abc123|letmein)["']/i },
];

// ── File Patterns to Skip ────────────────────────────────────────────────────

const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /\.git/,
  /coverage/,
  /playwright-report/,
  /__pycache__/,
  /\.env\.example$/,
  /\.env\.template$/,
  /secrets-audit\.ts$/, // Don't scan ourselves
  /core-web-vitals\.ts$/,
  /env-validation\.ts$/,
  /\.min\.js$/,
  /\.min\.css$/,
  /\.lock$/,
  /package-lock\.json/,
  /bun\.lock/,
  /yarn\.lock/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.ico$/,
  /\.woff/,
  /\.ttf/,
  /\.pdf$/,
];

// ── Mask a secret value for safe reporting ───────────────────────────────────

function maskValue(value: string): string {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 8, 20))}${value.slice(-4)}`;
}

// ── Scan a Single File ───────────────────────────────────────────────────────

function scanFile(
  filePath: string,
  relativePath: string,
  issues: SecretsAuditIssue[]
): void {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return; // Skip unreadable files
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comment-only lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }

    // Check for hardcoded secrets
    for (const sp of SECRET_PATTERNS) {
      if (sp.pattern.test(line)) {
        const match = line.match(sp.pattern);
        issues.push({
          type: sp.type,
          severity: sp.severity,
          file: relativePath,
          line: lineNum,
          message: `${sp.name} detected`,
          value: match ? maskValue(match[0]) : undefined,
        });
      }
    }

    // Check for development credentials
    for (const dp of DEV_CREDENTIAL_PATTERNS) {
      if (dp.pattern.test(line)) {
        issues.push({
          type: 'dev-credential',
          severity: 'medium',
          file: relativePath,
          line: lineNum,
          message: `${dp.name} pattern detected`,
        });
      }
    }

    // Check for weak secrets
    for (const wp of WEAK_SECRET_PATTERNS) {
      if (wp.pattern.test(line)) {
        issues.push({
          type: 'weak-secret',
          severity: 'medium',
          file: relativePath,
          line: lineNum,
          message: `${wp.name} detected`,
        });
      }
    }
  }
}

// ── Check .env.example Completeness ──────────────────────────────────────────

function checkEnvExampleCompleteness(
  projectRoot: string,
  issues: SecretsAuditIssue[]
): void {
  const envExamplePath = path.join(projectRoot, '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    issues.push({
      type: 'missing-env-doc',
      severity: 'high',
      file: '.env.example',
      line: 0,
      message: '.env.example file is missing. All environment variables should be documented.',
    });
    return;
  }

  const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');

  // Check that critical env vars are documented
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'NODE_ENV',
  ];

  for (const varName of requiredVars) {
    if (!envExampleContent.includes(varName)) {
      issues.push({
        type: 'missing-env-doc',
        severity: 'medium',
        file: '.env.example',
        line: 0,
        message: `Required environment variable ${varName} is not documented in .env.example`,
      });
    }
  }

  // Check that .env is in .gitignore
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const envPatterns = ['.env', '.env.local', '.env.production.local', '.env.development.local'];
    for (const pattern of envPatterns) {
      if (!gitignoreContent.includes(pattern)) {
        issues.push({
          type: 'exposed-secret',
          severity: 'high',
          file: '.gitignore',
          line: 0,
          message: `${pattern} is not in .gitignore. Environment files with secrets may be committed.`,
        });
      }
    }
  }
}

// ── Recursively Walk Directory ───────────────────────────────────────────────

function walkDir(dir: string, callback: (filePath: string, relativePath: string) => void): number {
  let count = 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath);

    // Skip patterns
    if (SKIP_PATTERNS.some((p) => p.test(relativePath) || p.test(entry.name))) {
      continue;
    }

    if (entry.isDirectory()) {
      count += walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      // Only scan text-like files
      const ext = path.extname(entry.name).toLowerCase();
      const scanableExts = [
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.py', '.sh', '.bash', '.zsh',
        '.json', '.yaml', '.yml', '.toml',
        '.env', '.env.local', '.env.production', '.env.development',
        '.sql', '.md', '.html', '.css',
      ];

      if (scanableExts.includes(ext) || entry.name.startsWith('.env')) {
        callback(fullPath, relativePath);
        count++;
      }
    }
  }

  return count;
}

// ── Main Audit Function ─────────────────────────────────────────────────────

/**
 * Run a comprehensive secrets audit on the codebase.
 * Call from CI/CD or as a pre-commit hook.
 *
 * @param projectRoot - Root directory of the project (defaults to cwd)
 * @param options - Audit options
 */
export function auditSecrets(
  projectRoot: string = process.cwd(),
  options: {
    /** Fail on high/critical issues (default: true) */
    failOnError?: boolean;
    /** Also check .env.example completeness (default: true) */
    checkEnvDocs?: boolean;
    /** Maximum files to scan (default: 5000) */
    maxFiles?: number;
  } = {}
): SecretsAuditResult {
  const {
    failOnError = true,
    checkEnvDocs = true,
    maxFiles = 5000,
  } = options;

  const issues: SecretsAuditIssue[] = [];
  let filesScanned = 0;

  // Scan all source files
  filesScanned = walkDir(projectRoot, (filePath, relativePath) => {
    if (filesScanned >= maxFiles) return;
    scanFile(filePath, relativePath, issues);
  });

  // Check .env.example completeness
  if (checkEnvDocs) {
    checkEnvExampleCompleteness(projectRoot, issues);
  }

  // Deduplicate issues (same file, line, type)
  const uniqueIssues = issues.filter(
    (issue, index, self) =>
      index === self.findIndex(
        (i) => i.file === issue.file && i.line === issue.line && i.type === issue.type
      )
  );

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  uniqueIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summary = {
    critical: uniqueIssues.filter((i) => i.severity === 'critical').length,
    high: uniqueIssues.filter((i) => i.severity === 'high').length,
    medium: uniqueIssues.filter((i) => i.severity === 'medium').length,
    low: uniqueIssues.filter((i) => i.severity === 'low').length,
    total: uniqueIssues.length,
  };

  const hasBlockingIssues = failOnError && (summary.critical > 0 || summary.high > 0);

  return {
    passed: !hasBlockingIssues,
    issues: uniqueIssues,
    summary,
    filesScanned,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format audit results as a human-readable report
 */
export function formatAuditReport(result: SecretsAuditResult): string {
  const lines: string[] = [];

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(' SECRETS AUDIT REPORT');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`  Timestamp:     ${result.timestamp}`);
  lines.push(`  Files Scanned: ${result.filesScanned}`);
  lines.push(`  Status:        ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push('');
  lines.push(`  Critical: ${result.summary.critical}`);
  lines.push(`  High:     ${result.summary.high}`);
  lines.push(`  Medium:   ${result.summary.medium}`);
  lines.push(`  Low:      ${result.summary.low}`);
  lines.push(`  Total:    ${result.summary.total}`);
  lines.push('');

  if (result.issues.length > 0) {
    lines.push(' Issues Found:');
    lines.push(' ─────────────');

    for (const issue of result.issues.slice(0, 50)) { // Limit output
      const icon = issue.severity === 'critical' ? '🔴' :
                  issue.severity === 'high' ? '🟠' :
                  issue.severity === 'medium' ? '🟡' : '🟢';
      const location = `${issue.file}:${issue.line}`;
      lines.push(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.type}`);
      lines.push(`     ${issue.message}`);
      lines.push(`     at ${location}`);
      if (issue.value) {
        lines.push(`     value: ${issue.value}`);
      }
      lines.push('');
    }

    if (result.issues.length > 50) {
      lines.push(`  ... and ${result.issues.length - 50} more issues`);
      lines.push('');
    }
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

/**
 * Run the secrets audit and throw if it fails (for CI/CD use)
 */
export function auditSecretsOrFail(projectRoot?: string): void {
  const result = auditSecrets(projectRoot);

  console.log(formatAuditReport(result));

  if (!result.passed) {
    throw new Error(
      `Secrets audit failed: ${result.summary.critical} critical, ${result.summary.high} high severity issues found.`
    );
  }
}
