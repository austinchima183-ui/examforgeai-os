// ============================================================================
// ExamForge AI — Custom Supabase-Backed Analytics Provider
// ============================================================================
// Sends events to the /api/analytics/events endpoint for storage in Supabase.
// ============================================================================

const BATCH_SIZE = 10
const BATCH_INTERVAL = 5000 // 5 seconds

interface QueuedEvent {
  eventName: string
  properties?: Record<string, unknown>
  timestamp: string
  page?: string
  sessionId?: string
}

let eventQueue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

async function flushEvents() {
  if (eventQueue.length === 0) return

  const eventsToSend = eventQueue.splice(0, BATCH_SIZE)

  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend }),
    })
  } catch {
    // Re-add events to queue on failure (limit re-tries)
    if (eventQueue.length < 100) {
      eventQueue.unshift(...eventsToSend)
    }
  }
}

export function trackCustomEvent(eventName: string, properties?: Record<string, unknown>) {
  const event: QueuedEvent = {
    eventName,
    properties,
    timestamp: new Date().toISOString(),
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    sessionId: getOrCreateSessionId(),
  }

  eventQueue.push(event)

  // Flush immediately if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents()
  }

  // Start batch timer if not running
  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, BATCH_INTERVAL)
  }
}

export function identifyCustomUser(_userId: string, _traits?: Record<string, unknown>) {
  // Custom provider doesn't need separate identify —
  // userId is passed in event properties
}

export function initCustomProvider() {
  // Set up page unload flush
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (eventQueue.length > 0) {
        // Use sendBeacon for reliability during page unload
        const data = JSON.stringify({ events: eventQueue })
        navigator.sendBeacon('/api/analytics/events', data)
        eventQueue = []
      }
    })
  }
}

export function cleanupCustomProvider() {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  flushEvents()
}
