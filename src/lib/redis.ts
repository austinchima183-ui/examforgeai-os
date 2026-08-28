// ============================================================================
// ExamForge AI — Cache Backend Stub (Supabase-Only Architecture)
// ============================================================================
// The optional Redis layer was removed during the Supabase unification.
// All consumers use in-memory fallbacks; getRedis() always returns null.
// ============================================================================

import { logger } from '@/lib/utils/logger'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>
  del(key: string | string[]): Promise<number>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  ttl(key: string): Promise<number>
  exists(key: string | string[]): Promise<number>
  ping(): Promise<string>
  /**
   * Execute a Lua script via EVALSHA / EVAL fallback.
   * Returns the raw result from Redis.
   */
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>
  /**
   * Add members to a sorted set.
   */
  zadd(key: string, ...scoreMembers: (string | number)[]): Promise<number>
  /**
   * Remove members from a sorted set by score range.
   */
  zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number>
  /**
   * Count members in a sorted set by score range.
   */
  zcard(key: string): Promise<number>
  /**
   * Count members in a sorted set by score range.
   */
  zcount(key: string, min: number | string, max: number | string): Promise<number>
  /**
   * Disconnect gracefully.
   */
  quit(): Promise<string>
}

// ──────────────────────────────────────────────────────────────
// Lazy Redis Initialization
// ──────────────────────────────────────────────────────────────
// SUPABASE UNIFICATION (2026-08-25): The architecture is Supabase-only.
// The optional Redis layer (ioredis) was removed — all consumers
// (cache.ts, rate-limit-distributed.ts, health.ts) already implement
// in-memory fallbacks and now always use them. getRedis() always
// returns null; the interface is preserved for type compatibility.

let redisAvailable = false
let redisInstance: RedisClient | null = null
let redisInitAttempted = false

/**
 * Get the Redis client singleton.
 * Always returns null in the Supabase-only architecture — callers
 * must gracefully degrade (they already do, via in-memory fallbacks).
 */
export async function getRedis(): Promise<RedisClient | null> {
  return null
}

/**
 * Check if Redis is available.
 */
export function isRedisAvailable(): boolean {
  return redisAvailable
}

/**
 * Reset Redis state (for testing).
 */
export function resetRedisState(): void {
  redisInstance = null
  redisInitAttempted = false
  redisAvailable = false
}
