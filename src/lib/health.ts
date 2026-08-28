// ============================================================================
// ExamForge AI — Health Check System
// ============================================================================
// Production health endpoints for monitoring and load balancers.
// /api/health        — Overall application health
// /api/health/db     — Database connectivity
// /api/health/ai     — AI provider availability
// /api/health/redis  — Redis connectivity
// ============================================================================

import { getRedis, isRedisAvailable } from '@/lib/redis'
import { logger } from '@/lib/utils/logger'
import { getProviderHealthStatus } from '@/lib/ai/ai-reliability'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface HealthCheckResult {
  status: HealthStatus
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: ComponentHealth
    redis: ComponentHealth
    ai: ComponentHealth
  }
}

export interface ComponentHealth {
  status: HealthStatus
  latencyMs?: number
  message?: string
  details?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Individual Health Checks
// ──────────────────────────────────────────────────────────────

/**
 * Check database connectivity via Supabase.
 */
export async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now()

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Simple query to verify connectivity
    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    const latencyMs = Date.now() - start

    if (error) {
      logger.error('Database health check failed', error)
      return {
        status: 'unhealthy',
        latencyMs,
        message: `Database query failed: ${error.message}`,
      }
    }

    return {
      status: latencyMs > 2000 ? 'degraded' : 'healthy',
      latencyMs,
      message: latencyMs > 2000 ? 'Database responding slowly' : 'Connected',
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: `Database connection error: ${error instanceof Error ? error.message : 'unknown'}`,
    }
  }
}

/**
 * Check Redis connectivity.
 */
export async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now()

  try {
    const redis = await getRedis()

    if (!redis) {
      return {
        status: 'healthy', // Supabase-only architecture: in-memory caching is the designed default
        message: 'In-memory caching active (Supabase-only architecture)',
        details: { fallbackActive: true },
      }
    }

    const result = await redis.ping()
    const latencyMs = Date.now() - start

    if (result !== 'PONG') {
      return {
        status: 'unhealthy',
        latencyMs,
        message: 'Redis ping returned unexpected result',
      }
    }

    return {
      status: latencyMs > 100 ? 'degraded' : 'healthy',
      latencyMs,
      message: latencyMs > 100 ? 'Redis responding slowly' : 'Connected',
    }
  } catch (error) {
    return {
      status: 'degraded', // Degraded, not unhealthy — app can work without Redis
      latencyMs: Date.now() - start,
      message: `Redis error: ${error instanceof Error ? error.message : 'unknown'}`,
      details: { fallbackActive: true },
    }
  }
}

/**
 * Check AI provider health.
 */
export function checkAI(): ComponentHealth {
  const providers = getProviderHealthStatus()

  if (providers.length === 0) {
    return {
      status: 'healthy', // No data yet = no failures
      message: 'No AI requests recorded yet',
    }
  }

  const healthyProviders = providers.filter(p => p.healthy)
  const totalProviders = providers.length
  const healthyCount = healthyProviders.length

  // At least one healthy provider = degraded (not full unhealthy)
  if (healthyCount === 0) {
    return {
      status: 'unhealthy',
      message: 'All AI providers are unhealthy',
      details: {
        providers: providers.map(p => ({
          name: p.provider,
          healthy: p.healthy,
          failures: p.consecutiveFailures,
          circuitOpen: p.circuitOpen,
        })),
      },
    }
  }

  if (healthyCount < totalProviders) {
    return {
      status: 'degraded',
      message: `${healthyCount}/${totalProviders} AI providers healthy`,
      details: {
        healthy: healthyProviders.map(p => p.provider),
        unhealthy: providers.filter(p => !p.healthy).map(p => ({
          name: p.provider,
          failures: p.consecutiveFailures,
          circuitOpen: p.circuitOpen,
        })),
      },
    }
  }

  return {
    status: 'healthy',
    message: `All ${totalProviders} AI providers healthy`,
    details: {
      providers: providers.map(p => ({
        name: p.provider,
        avgLatency: p.avgLatencyMs,
        totalRequests: p.totalRequests,
      })),
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Full Health Check
// ──────────────────────────────────────────────────────────────

/**
 * Run all health checks and return the overall result.
 */
export async function getHealthStatus(): Promise<HealthCheckResult> {
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ])

  const ai = checkAI()

  const checks = { database, redis, ai }

  // Determine overall status
  const statuses = Object.values(checks).map(c => c.status)
  let overall: HealthStatus = 'healthy'

  if (statuses.includes('unhealthy')) {
    // If database is unhealthy, the whole app is unhealthy
    overall = database.status === 'unhealthy' ? 'unhealthy' : 'degraded'
  } else if (statuses.includes('degraded')) {
    overall = 'degraded'
  }

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.2.0',
    uptime: process.uptime(),
    checks,
  }
}
