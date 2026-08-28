// ============================================================================
// ExamForge AI — PostHog Analytics Provider
// ============================================================================

export function trackPostHogEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!posthogKey) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posthog = (window as any).posthog
  if (!posthog || typeof posthog.capture !== 'function') return

  posthog.capture(eventName, properties)
}

export function identifyPostHogUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!posthogKey) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posthog = (window as any).posthog
  if (!posthog || typeof posthog.identify !== 'function') return

  posthog.identify(userId, traits)
}

export function initPostHog() {
  if (typeof window === 'undefined') return

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  if (!posthogKey) return

  // Load PostHog script
  const script = document.createElement('script')
  script.innerHTML = `
    !function(t,e){var o,n,i,r=[],a=[],s=t.interactions,c="posthog";t[c]={init:function(t,e){var o=t.api_key;n=t.api_host||"https://us.i.posthog.com";i=t.capture_pageview||!0;var l=document.createElement("script");l.type="text/javascript",l.async=!0,l.src=n+"/static/array.js",document.head.appendChild(l)},capture:function(t,e){r.push({event:t,properties:e||{}})},identify:function(t,e){a.push({distinct_id:t,properties:e||{}})}}}(window,document);
    window.posthog.init({api_key:'${posthogKey}',api_host:'${posthogHost}',capture_pageview:false});
  `
  document.head.appendChild(script)
}
