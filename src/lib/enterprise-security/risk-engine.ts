// ============================================================================
// ExamForge AI — Risk-Based Authentication Engine
// ============================================================================
// Calculates risk scores (0-100) based on multiple heuristics:
// - Failed login attempts (recent)
// - Unusual geographic location
// - New/unknown device
// - Impossible travel detection
// - Malware detection signals
// - Suspicious activity patterns
// Risk scores drive conditional access decisions (allow, MFA, block).
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  RiskScore,
  RiskLevel,
  RiskFactors,
  RiskAction,
  RiskAssessmentContext,
  RiskHistoryEntry,
} from './types'

// ──────────────────────────────────────────────────────────────
// Risk Scoring Constants
// ──────────────────────────────────────────────────────────────

/**
 * Maximum score contribution from each risk factor.
 * Total maximum is 100 (sum of all MAX values).
 */
const RISK_WEIGHTS = {
  failedLogins: {
    max: 25,
    /** Score per failed attempt (diminishing with a cap) */
    perAttempt: 8,
    /** Maximum failed attempts to consider */
    maxAttempts: 5,
  },
  unusualLocation: {
    max: 20,
    /** Score for login from a country never seen before */
    newCountry: 20,
    /** Score for login from a new city in a known country */
    newCity: 12,
  },
  newDevice: {
    max: 15,
    /** Score for a completely new device */
    unknown: 15,
    /** Score for a device seen less than 3 times */
    rarelySeen: 8,
  },
  impossibleTravel: {
    max: 25,
    /** Score for physically impossible travel */
    impossible: 25,
    /** Score for unlikely but possible travel */
    unlikely: 15,
  },
  malwareDetected: {
    max: 10,
    /** Score for confirmed malware on device */
    confirmed: 10,
    /** Score for suspected/potential malware */
    suspected: 6,
  },
  suspiciousActivity: {
    max: 5,
    /** Score for unusual access patterns */
    unusualPattern: 5,
    /** Score for accessing sensitive resources at odd hours */
    oddHourAccess: 3,
  },
} as const

/**
 * Risk level thresholds.
 */
const RISK_THRESHOLDS: { max: number; level: RiskLevel }[] = [
  { max: 15, level: 'very_low' },
  { max: 30, level: 'low' },
  { max: 50, level: 'medium' },
  { max: 75, level: 'high' },
  { max: 100, level: 'very_high' },
]

/**
 * Earth's average radius in kilometers.
 */
const EARTH_RADIUS_KM = 6371

/**
 * Maximum speed for impossible travel detection (km/h).
 * Commercial flights max ~900 km/h; we add margin for connection overlap.
 */
const MAX_TRAVEL_SPEED_KMH = 1000

/**
 * Minimum time delta (ms) for travel detection to be meaningful.
 * Avoids false positives from concurrent sessions.
 */
const MIN_TRAVEL_TIME_MS = 5 * 60 * 1000 // 5 minutes

// ──────────────────────────────────────────────────────────────
// In-memory risk tracking (replace with Redis/DB in production)
// ──────────────────────────────────────────────────────────────

interface FailedLoginTracker {
  count: number
  lastAttemptAt: number
}

const failedLoginCache = new Map<string, FailedLoginTracker>()
const RISK_WINDOW_MS = 30 * 60 * 1000 // 30 minute window

// ──────────────────────────────────────────────────────────────
// Risk Engine Functions
// ──────────────────────────────────────────────────────────────

/**
 * Calculate a comprehensive risk score for an authentication attempt.
 * Uses real heuristics — no random numbers.
 */
export async function calculateRiskScore(
  userId: string,
  context: RiskAssessmentContext
): Promise<RiskScore> {
  // Evaluate each risk factor independently
  const failedLoginsResult = await assessFailedLogins(userId)
  const unusualLocationResult = await assessUnusualLocation(userId, context.ip)
  const newDeviceResult = await assessNewDevice(userId, context.deviceId)
  const impossibleTravelResult = context.previousIp
    ? await assessImpossibleTravel(
        userId,
        context.ip,
        context.previousIp,
        context.timeSinceLastLoginMs || MIN_TRAVEL_TIME_MS
      )
    : { score: 0, detected: false }
  const suspiciousActivityResult = await assessSuspiciousActivity(userId)

  // Malware detection — check device compliance
  const malwareResult = await assessMalware(context.deviceId)

  // Calculate individual factor scores (capped at max for each factor)
  const failedLoginsScore = Math.min(
    failedLoginsResult.recentFailures * RISK_WEIGHTS.failedLogins.perAttempt,
    RISK_WEIGHTS.failedLogins.max
  )
  const unusualLocationScore = unusualLocationResult.isUnusual
    ? (unusualLocationResult.isNewCountry
        ? RISK_WEIGHTS.unusualLocation.newCountry
        : RISK_WEIGHTS.unusualLocation.newCity)
    : 0
  const newDeviceScore = newDeviceResult.isNew
    ? RISK_WEIGHTS.newDevice.unknown
    : (newDeviceResult.isRarelySeen ? RISK_WEIGHTS.newDevice.rarelySeen : 0)
  const impossibleTravelScore = impossibleTravelResult.detected
    ? (('isImpossible' in impossibleTravelResult && impossibleTravelResult.isImpossible)
        ? RISK_WEIGHTS.impossibleTravel.impossible
        : RISK_WEIGHTS.impossibleTravel.unlikely)
    : 0
  const malwareDetectedScore = malwareResult.detected
    ? (malwareResult.isConfirmed
        ? RISK_WEIGHTS.malwareDetected.confirmed
        : RISK_WEIGHTS.malwareDetected.suspected)
    : 0
  const suspiciousActivityScore = suspiciousActivityResult.detected
    ? RISK_WEIGHTS.suspiciousActivity.unusualPattern
    : 0

  // Aggregate total score (sum of all factors, capped at 100)
  const totalScore = Math.min(
    failedLoginsScore +
    unusualLocationScore +
    newDeviceScore +
    impossibleTravelScore +
    malwareDetectedScore +
    suspiciousActivityScore,
    100
  )

  // Determine risk level
  const level = scoreToRiskLevel(totalScore)

  const factors: RiskFactors = {
    failedLogins: failedLoginsResult.recentFailures,
    unusualLocation: unusualLocationResult.isUnusual,
    newDevice: newDeviceResult.isNew,
    impossibleTravel: impossibleTravelResult.detected,
    malwareDetected: malwareResult.detected,
    suspiciousActivity: suspiciousActivityResult.detected,
    failedLoginsScore,
    unusualLocationScore,
    newDeviceScore,
    impossibleTravelScore,
    malwareDetectedScore,
    suspiciousActivityScore,
  }

  // Persist risk score to history
  await persistRiskScore(userId, totalScore, level, context.ip)

  return {
    score: totalScore,
    level,
    factors,
    assessedAt: new Date().toISOString(),
  }
}

/**
 * Assess the risk from recent failed login attempts.
 * Checks the Supabase audit log for recent failures.
 */
export async function assessFailedLogins(
  userId: string
): Promise<{ recentFailures: number; windowMinutes: number }> {
  const supabase = await createClient()
  const windowStart = new Date(Date.now() - RISK_WINDOW_MS).toISOString()

  // Query audit log for recent failed login attempts
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('action', 'auth.login')
    .eq('result', 'failure')
    .gte('timestamp', windowStart)

  if (error || !data) {
    // Fallback to in-memory tracker if DB query fails
    const cached = failedLoginCache.get(userId)
    return {
      recentFailures: cached?.count || 0,
      windowMinutes: RISK_WINDOW_MS / 60000,
    }
  }

  const recentFailures = Math.min(data.length, RISK_WEIGHTS.failedLogins.maxAttempts)

  return {
    recentFailures,
    windowMinutes: RISK_WINDOW_MS / 60000,
  }
}

/**
 * Assess whether the current IP is from an unusual location.
 * Compares against the user's historical login locations.
 */
export async function assessUnusualLocation(
  userId: string,
  ip: string
): Promise<{ isUnusual: boolean; isNewCountry: boolean; country: string | null }> {
  const supabase = await createClient()

  // Resolve the current IP's geolocation
  const currentGeo = await resolveGeoLocation(ip)
  if (!currentGeo?.country) {
    // Cannot determine location — consider it slightly unusual
    return { isUnusual: true, isNewCountry: false, country: null }
  }

  // Get the user's previously seen countries and cities
  const { data: history } = await supabase
    .from('user_login_history')
    .select('country, city')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!history || history.length === 0) {
    // First login ever — not unusual per se
    return { isUnusual: false, isNewCountry: false, country: currentGeo.country }
  }

  const seenCountries = new Set(history.map((h: Record<string, unknown>) => h.country as string).filter(Boolean))
  const seenCities = new Set(
    history
      .filter((h: Record<string, unknown>) => h.country === currentGeo.country)
      .map((h: Record<string, unknown>) => h.city as string)
      .filter(Boolean)
  )

  const isNewCountry = !seenCountries.has(currentGeo.country)
  const isNewCity = currentGeo.city && !seenCities.has(currentGeo.city)

  return {
    isUnusual: isNewCountry || !!isNewCity,
    isNewCountry,
    country: currentGeo.country,
  }
}

/**
 * Assess whether the current device is new or rarely seen.
 */
export async function assessNewDevice(
  userId: string,
  deviceId: string | null
): Promise<{ isNew: boolean; isRarelySeen: boolean }> {
  if (!deviceId) {
    // No device ID provided — treat as new device
    return { isNew: true, isRarelySeen: false }
  }

  const supabase = await createClient()

  // Check if the device is registered
  const { data: device } = await supabase
    .from('devices')
    .select('id, login_count')
    .eq('id', deviceId)
    .eq('user_id', userId)
    .single()

  if (!device) {
    return { isNew: true, isRarelySeen: false }
  }

  const loginCount = (device.login_count as number) || 0
  const isRarelySeen = loginCount > 0 && loginCount < 3

  return { isNew: false, isRarelySeen }
}

/**
 * Detect impossible travel by comparing the distance between two IPs
 * within a time delta. If the travel speed exceeds MAX_TRAVEL_SPEED_KMH,
 * it's flagged as impossible.
 */
export async function assessImpossibleTravel(
  userId: string,
  currentIp: string,
  previousIp: string,
  timeDeltaMs: number
): Promise<{ detected: boolean; isImpossible: boolean; distanceKm: number; speedKmh: number }> {
  // Skip if time delta is too small (concurrent sessions)
  if (timeDeltaMs < MIN_TRAVEL_TIME_MS) {
    return { detected: false, isImpossible: false, distanceKm: 0, speedKmh: 0 }
  }

  // Same IP — no travel
  if (currentIp === previousIp) {
    return { detected: false, isImpossible: false, distanceKm: 0, speedKmh: 0 }
  }

  // Resolve geolocations for both IPs
  const [currentGeo, previousGeo] = await Promise.all([
    resolveGeoLocation(currentIp),
    resolveGeoLocation(previousIp),
  ])

  if (!currentGeo?.lat || !currentGeo?.lng || !previousGeo?.lat || !previousGeo?.lng) {
    // Cannot resolve locations — cannot detect impossible travel
    return { detected: false, isImpossible: false, distanceKm: 0, speedKmh: 0 }
  }

  // Calculate distance using the Haversine formula
  const distanceKm = haversineDistance(
    previousGeo.lat, previousGeo.lng,
    currentGeo.lat, currentGeo.lng
  )

  // Calculate speed
  const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60)
  const speedKmh = distanceKm / timeDeltaHours

  const detected = speedKmh > MAX_TRAVEL_SPEED_KMH * 0.8 // 80% threshold for "unlikely"
  const isImpossible = speedKmh > MAX_TRAVEL_SPEED_KMH

  return { detected, isImpossible, distanceKm, speedKmh }
}

/**
 * Assess malware detection signals from the device.
 */
async function assessMalware(
  deviceId: string | null
): Promise<{ detected: boolean; isConfirmed: boolean }> {
  if (!deviceId) return { detected: false, isConfirmed: false }

  const supabase = await createClient()

  // Check device compliance for malware signals
  const { data: device } = await supabase
    .from('devices')
    .select('is_compliant, malware_detected_at')
    .eq('id', deviceId)
    .single()

  if (!device) return { detected: false, isConfirmed: false }

  const isConfirmed = !!device.malware_detected_at
  const detected = isConfirmed || !device.is_compliant

  return { detected, isConfirmed }
}

/**
 * Assess suspicious activity patterns for a user.
 * Looks for unusual access times, resource access patterns, etc.
 */
export async function assessSuspiciousActivity(
  userId: string
): Promise<{ detected: boolean; patterns: string[] }> {
  const supabase = await createClient()
  const patterns: string[] = []

  // Check 1: Multiple failed MFA attempts in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: failedMfaCount } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'auth.mfa_verify')
    .eq('result', 'failure')
    .gte('timestamp', oneHourAgo)

  if ((failedMfaCount || 0) >= 3) {
    patterns.push('multiple_failed_mfa')
  }

  // Check 2: Unusual access hours (between 2-5 AM local time)
  const currentHour = new Date().getHours()
  if (currentHour >= 2 && currentHour <= 5) {
    // Check if this user has ever logged in at these hours before
    const { count: nightLogins } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', 'auth.login')
      .eq('result', 'success')
      .gte('timestamp', oneHourAgo)

    // If this is their first night login recently, flag as suspicious
    if ((nightLogins || 0) <= 1) {
      patterns.push('unusual_time_access')
    }
  }

  // Check 3: Rapid successive logins from different IPs
  const { data: recentLogins } = await supabase
    .from('audit_logs')
    .select('ip')
    .eq('user_id', userId)
    .eq('action', 'auth.login')
    .eq('result', 'success')
    .gte('timestamp', oneHourAgo)
    .order('timestamp', { ascending: false })
    .limit(5)

  if (recentLogins && recentLogins.length >= 3) {
    const uniqueIps = new Set(recentLogins.map((l: Record<string, unknown>) => l.ip))
    if (uniqueIps.size >= 3) {
      patterns.push('multiple_ips_rapid')
    }
  }

  return { detected: patterns.length > 0, patterns }
}

/**
 * Get the risk score history for a user.
 */
export async function getRiskHistory(
  userId: string,
  limit: number = 50
): Promise<RiskHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('risk_score_history')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: Record<string, unknown>) => ({
    score: row.score as number,
    level: row.level as RiskLevel,
    action: row.action as RiskAction,
    ip: row.ip as string,
    timestamp: row.timestamp as string,
  }))
}

/**
 * Determine the action to take based on the risk level.
 * Maps risk levels to authentication requirements.
 */
export function triggerRiskAction(riskLevel: RiskLevel): RiskAction {
  switch (riskLevel) {
    case 'very_low':
    case 'low':
      return 'allow'
    case 'medium':
      return 'require_mfa'
    case 'high':
      return 'require_passkey'
    case 'very_high':
      return 'block'
    default:
      return 'require_mfa'
  }
}

/**
 * Record a failed login attempt in the in-memory tracker.
 * Used as a fast path before the audit log is persisted.
 */
export function recordFailedLogin(userId: string): void {
  const existing = failedLoginCache.get(userId)
  if (existing) {
    existing.count++
    existing.lastAttemptAt = Date.now()
  } else {
    failedLoginCache.set(userId, { count: 1, lastAttemptAt: Date.now() })
  }
}

/**
 * Clear the failed login tracker for a user (after successful login).
 */
export function clearFailedLogins(userId: string): void {
  failedLoginCache.delete(userId)
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Convert a numeric score to a risk level.
 */
function scoreToRiskLevel(score: number): RiskLevel {
  for (const threshold of RISK_THRESHOLDS) {
    if (score <= threshold.max) return threshold.level
  }
  return 'very_high'
}

/**
 * Persist a risk score to the history table.
 */
async function persistRiskScore(
  userId: string,
  score: number,
  level: RiskLevel,
  ip: string
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('risk_score_history').insert({
    user_id: userId,
    score,
    level,
    action: triggerRiskAction(level),
    ip,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Resolve the geographic location of an IP address.
 * Uses a lightweight geolocation lookup (could be backed by MaxMind GeoIP2).
 */
async function resolveGeoLocation(
  ip: string
): Promise<{ country: string | null; city: string | null; lat: number | null; lng: number | null } | null> {
  // Skip private/local IPs
  if (ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
    return { country: null, city: null, lat: null, lng: null }
  }

  try {
    // Use the ip-api.com free tier for geolocation
    // In production, use MaxMind GeoIP2 or similar local database
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`, {
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data.status !== 'success') return null

    return {
      country: data.country || null,
      city: data.city || null,
      lat: data.lat || null,
      lng: data.lon || null,
    }
  } catch {
    return null
  }
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 * Returns distance in kilometers.
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}
