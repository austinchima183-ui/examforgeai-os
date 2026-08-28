// ============================================================================
// ExamForge AI — Core Web Vitals Monitoring
// ============================================================================
// Measures and reports Core Web Vitals (LCP, INP, CLS) with configurable
// thresholds aligned to Google's "good" ratings:
//   LCP < 2.5s  |  INP < 200ms  |  CLS < 0.1
// Results are reported to the observability layer for alerting & dashboards.
// ============================================================================

import { recordMetric, incrementCounter } from '@/lib/observability/metrics';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VitalThreshold {
  good: number;
  needsImprovement: number;
}

export interface VitalMeasurement {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
}

export interface VitalReport {
  lcp: VitalMeasurement | null;
  inp: VitalMeasurement | null;
  cls: VitalMeasurement | null;
  fcp: VitalMeasurement | null;
  ttfb: VitalMeasurement | null;
}

export interface WebVitalsConfig {
  /** Report vitals to observability layer */
  reportToObservability: boolean;
  /** Log vitals to console in development */
  logInDev: boolean;
  /** Custom callback for vital measurements */
  onVital?: (measurement: VitalMeasurement) => void;
  /** Custom thresholds (override defaults) */
  thresholds?: Partial<Record<VitalName, VitalThreshold>>;
}

export type VitalName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

// ── Default Thresholds (Google's recommendations) ───────────────────────────

const DEFAULT_THRESHOLDS: Record<VitalName, VitalThreshold> = {
  LCP: { good: 2500, needsImprovement: 4000 },      // ms
  INP: { good: 200, needsImprovement: 500 },         // ms
  CLS: { good: 0.1, needsImprovement: 0.25 },       // score
  FCP: { good: 1800, needsImprovement: 3000 },      // ms
  TTFB: { good: 800, needsImprovement: 1800 },      // ms
};

// ── Rating Helper ───────────────────────────────────────────────────────────

function getRating(
  name: VitalName,
  value: number,
  thresholds: Record<VitalName, VitalThreshold>
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// ── Unique ID Generator ─────────────────────────────────────────────────────

function generateVitalId(): string {
  return `vital-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`;
}

// ── Navigation Type Detection ───────────────────────────────────────────────

function getNavigationType(): string {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return 'unknown';
  }
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navEntries.length > 0) {
    const type = navEntries[0].type;
    return type || 'navigate';
  }
  return 'unknown';
}

// ── Core Measurement Processing ─────────────────────────────────────────────

let config: WebVitalsConfig = {
  reportToObservability: true,
  logInDev: true,
};

let thresholds: Record<VitalName, VitalThreshold> = { ...DEFAULT_THRESHOLDS };

// Internal state for latest measurements
const latestReport: VitalReport = {
  lcp: null,
  inp: null,
  cls: null,
  fcp: null,
  ttfb: null,
};

function processVital(name: VitalName, value: number, delta: number): VitalMeasurement {
  const measurement: VitalMeasurement = {
    name,
    value: Math.round(value * 1000) / 1000, // 3 decimal precision
    rating: getRating(name, value, thresholds),
    delta,
    id: generateVitalId(),
    navigationType: getNavigationType(),
    timestamp: Date.now(),
  };

  // Store latest
  const key = name.toLowerCase() as keyof VitalReport;
  latestReport[key] = measurement;

  // Log in development
  if (config.logInDev && process.env.NODE_ENV === 'development') {
    const emoji = measurement.rating === 'good' ? '✅' :
                  measurement.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[WebVitals] ${emoji} ${name}: ${measurement.value}${name === 'CLS' ? '' : 'ms'} (${measurement.rating})`);
  }

  // Report to observability
  if (config.reportToObservability) {
    reportToObservabilityLayer(measurement);
  }

  // Custom callback
  config.onVital?.(measurement);

  return measurement;
}

// ── Observability Reporting ─────────────────────────────────────────────────

function reportToObservabilityLayer(measurement: VitalMeasurement): void {
  try {
    // Record as a metric value
    recordMetric(`web_vital_${measurement.name.toLowerCase()}` as any, measurement.value, {
      rating: measurement.rating,
      navigation: measurement.navigationType,
    });

    // Increment counter for rating bucket
    incrementCounter(`web_vital_${measurement.name.toLowerCase()}_${measurement.rating}` as any);

    // If poor, increment alert counter
    if (measurement.rating === 'poor') {
      incrementCounter('web_vital_poor_total' as any);
    }
  } catch {
    // Observability reporting should never break the app
    if (config.logInDev && process.env.NODE_ENV === 'development') {
      console.warn('[WebVitals] Failed to report to observability layer');
    }
  }
}

// ── Performance Observer Setup ──────────────────────────────────────────────

let observers: PerformanceObserver[] = [];
let clsValue = 0;
let clsEntries: PerformanceEntry[] = [];
let inpValue = 0;
let sessionWindow = false;

/**
 * Observe Largest Contentful Paint (LCP)
 */
function observeLCP(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        processVital('LCP', lastEntry.startTime, lastEntry.startTime);
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(observer);
  } catch {
    // LCP not supported
  }
}

/**
 * Observe First Contentful Paint (FCP)
 */
function observeFCP(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];
      if (firstEntry) {
        processVital('FCP', firstEntry.startTime, firstEntry.startTime);
      }
    });
    observer.observe({ type: 'paint', buffered: true });
    observers.push(observer);
  } catch {
    // FCP not supported
  }
}

/**
 * Observe Interaction to Next Paint (INP)
 * Uses event timing entries to measure worst interaction latency
 */
function observeINP(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        if (!eventEntry.interactionId) continue;

        // Use processingEnd - startTime for the duration
        const duration = eventEntry.processingEnd
          ? eventEntry.processingEnd - eventEntry.startTime
          : eventEntry.duration;

        // Track the worst interaction in the session window
        if (duration > inpValue) {
          inpValue = duration;
        }
      }
    });
    observer.observe({ type: 'event', buffered: true });
    observers.push(observer);

    // Report INP on page visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && inpValue > 0) {
          processVital('INP', inpValue, inpValue);
        }
      });
    }
  } catch {
    // INP not supported
  }
}

/**
 * Observe Cumulative Layout Shift (CLS)
 * Tracks session windows to avoid counting layout shifts after user input
 */
function observeCLS(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as LayoutShift;

        // Only count layout shifts without recent user input
        if (layoutShift.hadRecentInput) {
          sessionWindow = false;
          continue;
        }

        // Start new session window if needed
        if (!sessionWindow) {
          sessionWindow = true;
          clsValue = 0;
          clsEntries = [];
        }

        clsValue += layoutShift.value;
        clsEntries.push(entry);

        // Report current CLS value
        processVital('CLS', clsValue, layoutShift.value);
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    observers.push(observer);
  } catch {
    // CLS not supported
  }
}

/**
 * Observe Time to First Byte (TTFB)
 */
function observeTTFB(): void {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return;

  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const ttfb = navEntries[0].responseStart;
      if (ttfb > 0) {
        processVital('TTFB', ttfb, ttfb);
      }
    }
  } catch {
    // TTFB not available
  }
}

// ── Performance Event Timing type extensions ─────────────────────────────────

interface PerformanceEventTiming extends PerformanceEntry {
  interactionId?: number;
  processingEnd?: number;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize Core Web Vitals monitoring
 * Call once at application startup (client-side only)
 */
export function initWebVitals(userConfig?: Partial<WebVitalsConfig>): void {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Merge config
  config = { ...config, ...userConfig };

  // Merge custom thresholds
  if (userConfig?.thresholds) {
    for (const [name, threshold] of Object.entries(userConfig.thresholds)) {
      if (threshold) {
        thresholds[name as VitalName] = {
          ...thresholds[name as VitalName],
          ...threshold,
        };
      }
    }
  }

  // Set up all observers
  observeLCP();
  observeFCP();
  observeINP();
  observeCLS();
  observeTTFB();

  // Report final INP on page hide
  if (typeof document !== 'undefined') {
    const reportFinalVitals = () => {
      if (inpValue > 0) {
        processVital('INP', inpValue, inpValue);
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportFinalVitals();
      }
    });

    document.addEventListener('pagehide', reportFinalVitals, { once: true });
  }
}

/**
 * Get the latest Web Vitals report
 */
export function getWebVitalsReport(): VitalReport {
  return { ...latestReport };
}

/**
 * Get a specific vital measurement
 */
export function getVital(name: VitalName): VitalMeasurement | null {
  const key = name.toLowerCase() as keyof VitalReport;
  return latestReport[key];
}

/**
 * Check if all vitals meet "good" thresholds
 */
export function areVitalsGood(): boolean {
  const criticalVitals: VitalName[] = ['LCP', 'INP', 'CLS'];
  return criticalVitals.every((name) => {
    const measurement = getVital(name);
    return measurement?.rating === 'good';
  });
}

/**
 * Get a performance score (0-100) based on vitals
 */
export function getPerformanceScore(): number {
  const weights: Record<VitalName, number> = {
    LCP: 0.30,
    INP: 0.30,
    CLS: 0.25,
    FCP: 0.10,
    TTFB: 0.05,
  };

  let score = 0;
  for (const [name, weight] of Object.entries(weights)) {
    const measurement = getVital(name as VitalName);
    if (measurement) {
      const vitalScore =
        measurement.rating === 'good' ? 100 :
        measurement.rating === 'needs-improvement' ? 50 : 0;
      score += vitalScore * weight;
    }
  }

  return Math.round(score);
}

/**
 * Disconnect all observers (for cleanup)
 */
export function disconnectObservers(): void {
  for (const observer of observers) {
    observer.disconnect();
  }
  observers = [];
}

/**
 * Get current thresholds configuration
 */
export function getThresholds(): Record<VitalName, VitalThreshold> {
  return { ...thresholds };
}

/**
 * Check a specific value against thresholds without recording
 */
export function checkVitalThreshold(
  name: VitalName,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  return getRating(name, value, thresholds);
}

// ── Server-Side Utilities ───────────────────────────────────────────────────

/**
 * Server-side: validate response time targets
 * Use in API route middleware to ensure endpoints meet performance targets
 */
export function validateResponseTime(
  endpoint: string,
  durationMs: number,
  targetMs: number = 200
): { passed: boolean; duration: number; target: number; overrun: number } {
  const passed = durationMs <= targetMs;
  const overrun = Math.max(0, durationMs - targetMs);

  if (!passed) {
    incrementCounter('api_response_over_target' as any);
    recordMetric('api_response_overrun_ms' as any, overrun, { endpoint });
  }

  return { passed, duration: durationMs, target: targetMs, overrun };
}

/**
 * Server-side: target performance budget for bundle size
 */
export const PERFORMANCE_BUDGET = {
  /** Max initial JS bundle size (KB) */
  maxInitialJS: 150,
  /** Max total page weight (KB) */
  maxPageWeight: 500,
  /** Max time to interactive (ms) */
  maxTTI: 3500,
  /** Max first contentful paint (ms) */
  maxFCP: 1800,
  /** Max LCP (ms) */
  maxLCP: 2500,
  /** Max INP (ms) */
  maxINP: 200,
  /** Max CLS (score) */
  maxCLS: 0.1,
  /** Max TTFB (ms) */
  maxTTFB: 800,
} as const;

export type PerformanceBudget = typeof PERFORMANCE_BUDGET;
