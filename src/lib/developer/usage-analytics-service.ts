// ============================================================================
// ExamForge AI — API Usage Analytics Service
// ============================================================================
// Records and aggregates API usage data including request counts, latency,
// error rates, and per-endpoint statistics. Supports time-period queries and
// data export in JSON and CSV formats.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import type {
  APIRequestRecord,
  APIUsageAnalytics,
  AnalyticsPeriod,
  EndpointAnalytics,
  ErrorAnalytics,
  ErrorDetail,
  ExportFormat,
  HTTPMethod,
  LatencyAnalytics,
  TopAPIUser,
} from './types';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const DB_TABLE = 'api_request_logs';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Generate a unique ID using cryptographically secure randomness */
function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert an analytics period string to a start timestamp.
 */
function periodToStartDate(period: AnalyticsPeriod): Date {
  const now = new Date();
  const msMap: Record<AnalyticsPeriod, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };
  return new Date(now.getTime() - msMap[period]);
}

/**
 * Calculate a percentile from a sorted array of numbers.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

// ----------------------------------------------------------------------------
// Record API Request
// ----------------------------------------------------------------------------

/**
 * Record an API request for analytics.
 * Stores the request details in the database for later aggregation.
 */
export async function recordAPIRequest(
  endpoint: string,
  method: HTTPMethod,
  statusCode: number,
  latencyMs: number,
  apiKeyPrefix?: string,
  userId?: string
): Promise<void> {
  const supabase = await createClient();

  const record: APIRequestRecord = {
    id: generateId(),
    endpoint,
    method,
    statusCode,
    latencyMs,
    apiKeyPrefix: apiKeyPrefix ?? null,
    userId: userId ?? null,
    orgId: null,
    timestamp: new Date(),
  };

  const { error } = await supabase.from(DB_TABLE).insert({
    id: record.id,
    endpoint,
    method,
    status_code: statusCode,
    latency_ms: latencyMs,
    api_key_prefix: record.apiKeyPrefix,
    user_id: record.userId,
    org_id: record.orgId,
    timestamp: record.timestamp.toISOString(),
  });

  if (error) {
    console.error('Failed to record API request:', error.message);
  }
}

// ----------------------------------------------------------------------------
// Aggregated Analytics
// ----------------------------------------------------------------------------

/**
 * Get aggregated API usage analytics for an organization over a time period.
 */
export async function getAPIUsageAnalytics(
  orgId: string,
  period: AnalyticsPeriod
): Promise<APIUsageAnalytics> {
  const supabase = await createClient();
  const startDate = periodToStartDate(period).toISOString();

  const { data, error } = await supabase
    .from(DB_TABLE)
    .select('endpoint, method, status_code, latency_ms')
    .eq('org_id', orgId)
    .gte('timestamp', startDate);

  if (error) {
    throw new Error(`Failed to get API usage analytics: ${error.message}`);
  }

  const records = data ?? [];

  // Aggregate by endpoint
  const byEndpoint: Record<string, number> = {};
  const byMethod: Record<HTTPMethod, number> = {
    GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0,
  };
  const byStatusCode: Record<string, number> = {};
  let totalLatency = 0;
  let errorCount = 0;

  for (const record of records) {
    // By endpoint
    const epKey = `${record.method} ${record.endpoint}`;
    byEndpoint[epKey] = (byEndpoint[epKey] ?? 0) + 1;

    // By method
    const method = record.method as HTTPMethod;
    if (method in byMethod) {
      byMethod[method] += 1;
    }

    // By status code
    const statusGroup = `${Math.floor(record.status_code / 100)}xx`;
    byStatusCode[String(record.status_code)] = (byStatusCode[String(record.status_code)] ?? 0) + 1;
    byStatusCode[statusGroup] = (byStatusCode[statusGroup] ?? 0) + 1;

    // Latency
    totalLatency += record.latency_ms;

    // Error count (4xx and 5xx)
    if (record.status_code >= 400) {
      errorCount++;
    }
  }

  const totalRequests = records.length;
  const avgLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;
  const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

  return {
    totalRequests,
    byEndpoint,
    byMethod,
    avgLatency: Math.round(avgLatency),
    errorRate: Math.round(errorRate * 10000) / 10000,
    byStatusCode,
  };
}

// ----------------------------------------------------------------------------
// Per-Endpoint Analytics
// ----------------------------------------------------------------------------

/**
 * Get analytics for a specific API endpoint over a time period.
 */
export async function getEndpointAnalytics(
  orgId: string,
  endpoint: string,
  period: AnalyticsPeriod
): Promise<EndpointAnalytics> {
  const supabase = await createClient();
  const startDate = periodToStartDate(period).toISOString();

  const { data, error } = await supabase
    .from(DB_TABLE)
    .select('method, status_code, latency_ms')
    .eq('org_id', orgId)
    .eq('endpoint', endpoint)
    .gte('timestamp', startDate);

  if (error) {
    throw new Error(`Failed to get endpoint analytics: ${error.message}`);
  }

  const records = data ?? [];

  if (records.length === 0) {
    return {
      endpoint,
      method: 'GET',
      totalRequests: 0,
      avgLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      errorRate: 0,
      byStatusCode: {},
    };
  }

  const method = records[0].method as HTTPMethod;
  const latencies = records.map((r) => r.latency_ms).sort((a, b) => a - b);
  const byStatusCode: Record<string, number> = {};
  let errorCount = 0;

  for (const record of records) {
    byStatusCode[String(record.status_code)] = (byStatusCode[String(record.status_code)] ?? 0) + 1;
    if (record.status_code >= 400) {
      errorCount++;
    }
  }

  return {
    endpoint,
    method,
    totalRequests: records.length,
    avgLatency: Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length),
    p50Latency: percentile(latencies, 50),
    p95Latency: percentile(latencies, 95),
    p99Latency: percentile(latencies, 99),
    errorRate: Math.round((errorCount / records.length) * 10000) / 10000,
    byStatusCode,
  };
}

// ----------------------------------------------------------------------------
// Error Analytics
// ----------------------------------------------------------------------------

/**
 * Get error analytics for an organization over a time period.
 */
export async function getErrorAnalytics(
  orgId: string,
  period: AnalyticsPeriod
): Promise<ErrorAnalytics> {
  const supabase = await createClient();
  const startDate = periodToStartDate(period).toISOString();

  const { data, error } = await supabase
    .from(DB_TABLE)
    .select('endpoint, method, status_code, timestamp')
    .eq('org_id', orgId)
    .gte('timestamp', startDate)
    .gte('status_code', 400);

  if (error) {
    throw new Error(`Failed to get error analytics: ${error.message}`);
  }

  const errorRecords = data ?? [];

  // Also get total count for rate calculation
  const { count: totalCount, error: totalError } = await supabase
    .from(DB_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('timestamp', startDate);

  if (totalError) {
    throw new Error(`Failed to get total request count: ${totalError.message}`);
  }

  const totalRequests = totalCount ?? 0;
  const totalErrors = errorRecords.length;
  const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

  // Group errors by endpoint
  const byEndpoint: Record<string, { count: number; rate: number }> = {};
  const byStatusCode: Record<string, number> = {};

  const endpointErrorMap = new Map<string, { count: number; lastOccurrence: Date; method: HTTPMethod; statusCode: number }>();

  for (const record of errorRecords) {
    const key = `${record.method} ${record.endpoint}`;
    byEndpoint[key] = {
      count: (byEndpoint[key]?.count ?? 0) + 1,
      rate: 0, // Calculated below
    };

    byStatusCode[String(record.status_code)] = (byStatusCode[String(record.status_code)] ?? 0) + 1;

    // Track for top errors
    const existing = endpointErrorMap.get(key);
    const ts = new Date(record.timestamp);
    if (!existing || ts > existing.lastOccurrence) {
      endpointErrorMap.set(key, {
        count: (existing?.count ?? 0) + 1,
        lastOccurrence: ts,
        method: record.method as HTTPMethod,
        statusCode: record.status_code,
      });
    } else {
      existing.count += 1;
    }
  }

  // Calculate rates
  for (const key of Object.keys(byEndpoint)) {
    byEndpoint[key].rate = totalRequests > 0
      ? Math.round((byEndpoint[key].count / totalRequests) * 10000) / 10000
      : 0;
  }

  // Top errors sorted by count
  const topErrors: ErrorDetail[] = Array.from(endpointErrorMap.entries())
    .map(([key, info]) => ({
      endpoint: key.split(' ').slice(1).join(' '),
      method: info.method,
      statusCode: info.statusCode,
      count: info.count,
      lastOccurrence: info.lastOccurrence,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalErrors,
    errorRate: Math.round(errorRate * 10000) / 10000,
    byEndpoint,
    byStatusCode,
    topErrors,
  };
}

// ----------------------------------------------------------------------------
// Latency Analytics
// ----------------------------------------------------------------------------

/**
 * Get latency analytics with percentile data for an organization.
 */
export async function getLatencyAnalytics(
  orgId: string,
  period: AnalyticsPeriod
): Promise<LatencyAnalytics> {
  const supabase = await createClient();
  const startDate = periodToStartDate(period).toISOString();

  const { data, error } = await supabase
    .from(DB_TABLE)
    .select('endpoint, latency_ms')
    .eq('org_id', orgId)
    .gte('timestamp', startDate);

  if (error) {
    throw new Error(`Failed to get latency analytics: ${error.message}`);
  }

  const records = data ?? [];

  if (records.length === 0) {
    return {
      avgLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      byEndpoint: {},
    };
  }

  // Overall latency stats
  const allLatencies = records.map((r) => r.latency_ms).sort((a, b) => a - b);
  const avgLatency = allLatencies.reduce((s, l) => s + l, 0) / allLatencies.length;

  // Per-endpoint latency stats
  const endpointLatencies = new Map<string, number[]>();
  for (const record of records) {
    const existing = endpointLatencies.get(record.endpoint) ?? [];
    existing.push(record.latency_ms);
    endpointLatencies.set(record.endpoint, existing);
  }

  const byEndpoint: Record<string, { avg: number; p50: number; p95: number; p99: number }> = {};
  for (const [ep, latencies] of endpointLatencies) {
    const sorted = latencies.sort((a, b) => a - b);
    byEndpoint[ep] = {
      avg: Math.round(sorted.reduce((s, l) => s + l, 0) / sorted.length),
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    };
  }

  return {
    avgLatency: Math.round(avgLatency),
    p50Latency: percentile(allLatencies, 50),
    p95Latency: percentile(allLatencies, 95),
    p99Latency: percentile(allLatencies, 99),
    maxLatency: allLatencies[allLatencies.length - 1],
    byEndpoint,
  };
}

// ----------------------------------------------------------------------------
// Top API Users
// ----------------------------------------------------------------------------

/**
 * Get the top API consumers for an organization.
 */
export async function getTopAPIUsers(
  orgId: string,
  limit: number = 10
): Promise<TopAPIUser[]> {
  const supabase = await createClient();

  // Get all request records grouped by API key / user
  const { data, error } = await supabase
    .from(DB_TABLE)
    .select('api_key_prefix, user_id, status_code, latency_ms')
    .eq('org_id', orgId);

  if (error) {
    throw new Error(`Failed to get top API users: ${error.message}`);
  }

  const records = data ?? [];

  // Aggregate by user/key combination
  const userMap = new Map<string, {
    userId: string;
    apiKeyPrefix: string;
    totalRequests: number;
    errorCount: number;
    totalLatency: number;
  }>();

  for (const record of records) {
    const key = `${record.user_id ?? 'anonymous'}:${record.api_key_prefix ?? 'none'}`;

    const existing = userMap.get(key);
    if (existing) {
      existing.totalRequests += 1;
      existing.totalLatency += record.latency_ms;
      if (record.status_code >= 400) {
        existing.errorCount += 1;
      }
    } else {
      userMap.set(key, {
        userId: record.user_id ?? 'anonymous',
        apiKeyPrefix: record.api_key_prefix ?? 'none',
        totalRequests: 1,
        errorCount: record.status_code >= 400 ? 1 : 0,
        totalLatency: record.latency_ms,
      });
    }
  }

  // Sort by total requests and take top N
  return Array.from(userMap.values())
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, limit)
    .map((u) => ({
      userId: u.userId,
      apiKeyPrefix: u.apiKeyPrefix,
      totalRequests: u.totalRequests,
      errorRate: Math.round((u.errorCount / u.totalRequests) * 10000) / 10000,
      avgLatency: Math.round(u.totalLatency / u.totalRequests),
    }));
}

// ----------------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------------

/**
 * Export API usage data for an organization in the specified format.
 * Returns the data as a string ready for download.
 */
export async function exportUsageReport(
  orgId: string,
  period: AnalyticsPeriod,
  format: ExportFormat
): Promise<string> {
  const supabase = await createClient();
  const startDate = periodToStartDate(period).toISOString();

  const { data, error } = await supabase
    .from(DB_TABLE)
    .select('*')
    .eq('org_id', orgId)
    .gte('timestamp', startDate)
    .order('timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to export usage report: ${error.message}`);
  }

  const records = data ?? [];

  if (format === 'csv') {
    return exportAsCSV(records);
  }

  return exportAsJSON(records);
}

/**
 * Export records as JSON string.
 */
function exportAsJSON(records: Record<string, unknown>[]): string {
  return JSON.stringify(
    records.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      method: r.method,
      statusCode: r.status_code,
      latencyMs: r.latency_ms,
      apiKeyPrefix: r.api_key_prefix,
      userId: r.user_id,
      timestamp: r.timestamp,
    })),
    null,
    2
  );
}

/**
 * Export records as CSV string.
 */
function exportAsCSV(records: Record<string, unknown>[]): string {
  const headers = ['id', 'endpoint', 'method', 'statusCode', 'latencyMs', 'apiKeyPrefix', 'userId', 'timestamp'];
  const headerRow = headers.join(',');

  const rows = records.map((r) =>
    [
      r.id,
      r.endpoint,
      r.method,
      r.status_code,
      r.latency_ms,
      r.api_key_prefix ?? '',
      r.user_id ?? '',
      r.timestamp,
    ]
      .map((val) => {
        const str = String(val);
        // Escape commas and quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',')
  );

  return [headerRow, ...rows].join('\n');
}
