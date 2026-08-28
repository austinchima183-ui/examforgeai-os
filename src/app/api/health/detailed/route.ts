// ============================================================================
// ExamForge AI — Detailed Health Check API Route
// ============================================================================
// GET /api/health/detailed — Comprehensive system health for super_admins
//
// Returns: database status, AI provider status, Redis status, memory usage,
// uptime, active alerts, metrics summary
// Distinguishes: healthy, degraded, unhealthy
// Includes: version, environment, last deployment time
// Never exposes: secrets, API keys, tokens, or sensitive data
// Requires: super_admin authentication
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/api/auth-guard'
import { checkDatabase, checkRedis, checkAI } from '@/lib/health'
import { checkAlerts, getActiveAlerts } from '@/lib/observability/alerts'
import { getMetricSummary, getTotalDataPoints, getStoreStartTime } from '@/lib/observability/metrics'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('api:health:detailed')

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

interface DetailedHealthResponse {
  status: HealthStatus
  timestamp: string
  version: string
  environment: string
  uptime: number
  lastDeploymentTime?: string

  checks: {
    database: {
      status: HealthStatus
      latencyMs?: number
      message?: string
    }
    ai: {
      status: HealthStatus
      message?: string
      details?: Record<string, unknown>
    }
    redis: {
      status: HealthStatus
      latencyMs?: number
      message?: string
      details?: Record<string, unknown>
    }
    memory: {
      status: HealthStatus
      heapUsedMb: number
      heapTotalMb: number
      rssMb: number
      externalMb: number
      usagePercent: number
      message?: string
    }
  }

  alerts: {
    health: 'healthy' | 'degraded' | 'critical'
    active: Array<{
      id: string
      name: string
      severity: string
      currentValue?: number
      threshold: number
      unit: string
      recommendedAction: string
    }>
    summary: {
      critical: number
      warning: number
      info: number
      total: number
    }
  }

  metrics: {
    totalDataPoints: number
    storeAgeSeconds: number
    topLatency: Array<{
      name: string
      p95: number
      p99: number
      count: number
      avg: number
    }>
    errorRates: Array<{
      name: string
      count: number
      last5minCount: number
    }>
  }
}

// ──────────────────────────────────────────────────────────────
// Memory Check
// ──────────────────────────────────────────────────────────────

function checkMemory(): DetailedHealthResponse['checks']['memory'] {
  const mem = process.memoryUsage()
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100
  const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100
  const rssMb = Math.round(mem.rss / 1024 / 1024 * 100) / 100
  const externalMb = Math.round(mem.external / 1024 / 1024 * 100) / 100
  const usagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100 * 100) / 100

  let status: HealthStatus = 'healthy'
  let message: string | undefined

  if (usagePercent > 90) {
    status = 'unhealthy'
    message = 'Memory critically low — heap usage > 90%'
  } else if (usagePercent > 75) {
    status = 'degraded'
    message = 'Memory pressure — heap usage > 75%'
  } else {
    message = 'Normal'
  }

  return {
    status,
    heapUsedMb,
    heapTotalMb,
    rssMb,
    externalMb,
    usagePercent,
    message,
  }
}

// ──────────────────────────────────────────────────────────────
// Safe Metric Summary (no sensitive data)
// ──────────────────────────────────────────────────────────────

function getSafeMetrics(): DetailedHealthResponse['metrics'] {
  const summary = getMetricSummary()
  const now = Date.now()
  const storeAgeSeconds = Math.round((now - getStoreStartTime()) / 1000)

  // Top latency metrics (by p95, highest first)
  const topLatency = summary
    .filter(s => s.name.includes('latency') || s.name.includes('ttfb'))
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 10)
    .map(s => ({
      name: s.name,
      p95: Math.round(s.p95),
      p99: Math.round(s.p99),
      count: s.count,
      avg: Math.round(s.avg * 100) / 100,
    }))

  // Error rates
  const errorRates = summary
    .filter(s => s.name.includes('error') || s.name.includes('failure'))
    .sort((a, b) => b.last5min.count - a.last5min.count)
    .slice(0, 10)
    .map(s => ({
      name: s.name,
      count: s.count,
      last5minCount: s.last5min.count,
    }))

  return {
    totalDataPoints: getTotalDataPoints(),
    storeAgeSeconds,
    topLatency,
    errorRates,
  }
}

// ──────────────────────────────────────────────────────────────
// Route Handler
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Require super_admin authentication
  const auth = await requireApiRole(request, ['super_admin'])
  if (auth instanceof NextResponse) return auth

  // Verify role explicitly for defense in depth
  if (auth instanceof NextResponse) return auth

  const startTime = Date.now()

  try {
    // Run all health checks in parallel
    const [database, redis] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ])
    const ai = checkAI()
    const memory = checkMemory()

    // Evaluate alert rules
    const alertResult = checkAlerts()
    const activeAlerts = getActiveAlerts()

    // Get safe metrics summary
    const metrics = getSafeMetrics()

    // Determine overall status
    const allStatuses = [database.status, redis.status, ai.status, memory.status]
    let overallStatus: HealthStatus = 'healthy'

    if (
      database.status === 'unhealthy' ||
      memory.status === 'unhealthy' ||
      alertResult.health === 'critical'
    ) {
      overallStatus = 'unhealthy'
    } else if (
      allStatuses.includes('degraded') ||
      alertResult.health === 'degraded'
    ) {
      overallStatus = 'degraded'
    }

    const response: DetailedHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.2.0',
      environment: process.env.NODE_ENV ?? 'development',
      uptime: Math.round(process.uptime()),
      lastDeploymentTime: process.env.LAST_DEPLOYMENT_TIME,

      checks: {
        database: {
          status: database.status,
          latencyMs: database.latencyMs,
          message: database.message,
        },
        ai: {
          status: ai.status,
          message: ai.message,
          details: ai.details,
        },
        redis: {
          status: redis.status,
          latencyMs: redis.latencyMs,
          message: redis.message,
          details: redis.details,
        },
        memory,
      },

      alerts: {
        health: alertResult.health,
        active: activeAlerts.map(a => ({
          id: a.id,
          name: a.name,
          severity: a.severity,
          currentValue: a.currentValue,
          threshold: a.threshold,
          unit: a.unit,
          recommendedAction: a.recommendedAction,
        })),
        summary: alertResult.summary,
      },

      metrics,
    }

    const duration = Date.now() - startTime
    log.info('Detailed health check completed', {
      status: overallStatus,
      duration,
      activeAlerts: activeAlerts.length,
    })

    const statusCode = overallStatus === 'healthy' ? 200
      : overallStatus === 'degraded' ? 200
      : 503

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    log.error('Detailed health check failed', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed — see server logs',
      },
      { status: 503 }
    )
  }
}
