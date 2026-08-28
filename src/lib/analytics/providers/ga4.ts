// ============================================================================
// ExamForge AI — GA4 Analytics Provider
// ============================================================================

export function trackGA4Event(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID
  if (!ga4Id) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag
  if (typeof gtag !== 'function') return

  gtag('event', eventName, properties)
}

export function identifyGA4User(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID
  if (!ga4Id) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag
  if (typeof gtag !== 'function') return

  gtag('config', ga4Id, {
    user_id: userId,
    ...traits,
  })
}

export function initGA4() {
  if (typeof window === 'undefined') return

  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID
  if (!ga4Id) return

  // Load gtag script
  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`
  script.async = true
  document.head.appendChild(script)

  // Initialize dataLayer and gtag function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).dataLayer = (window as any).dataLayer || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).gtag = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).dataLayer.push(args)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).gtag('js', new Date())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).gtag('config', ga4Id)
}
