// ============================================================================
// ExamForge AI — Analytics Event Definitions
// ============================================================================
// Typed event names and property interfaces for all trackable events.
// ============================================================================

// ── Event Name Constants ──
export const AnalyticsEvents = {
  PAGE_VIEW: 'page_view',
  CTA_CLICK: 'cta_click',
  FORM_START: 'form_start',
  FORM_COMPLETE: 'form_complete',
  FORM_ERROR: 'form_error',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  DEMO_REQUEST: 'demo_request',
  REGISTRATION_START: 'registration_start',
  REGISTRATION_COMPLETE: 'registration_complete',
  PRICING_VIEW: 'pricing_view',
  PRICING_SELECT: 'pricing_select',
  FEATURE_ENGAGE: 'feature_engage',
  SCROLL_DEPTH: 'scroll_depth',
  VIDEO_PLAY: 'video_play',
  DOWNLOAD: 'download',
  EXIT_INTENT: 'exit_intent',
  TRUST_NOTIFICATION_CLICK: 'trust_notification_click',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]

// ── Event Property Interfaces ──
export interface PageViewProperties {
  path: string
  title?: string
  referrer?: string
  search?: string
}

export interface CtaClickProperties {
  ctaId: string
  ctaText: string
  ctaLocation: string
  destinationUrl?: string
  plan?: string
}

export interface FormStartProperties {
  formId: string
  formType: string
}

export interface FormCompleteProperties {
  formId: string
  formType: string
  duration?: number
}

export interface FormErrorProperties {
  formId: string
  formType: string
  errors: string[]
}

export interface NewsletterSignupProperties {
  source: string
  email?: string
}

export interface DemoRequestProperties {
  source: string
  company?: string
  teamSize?: string
}

export interface RegistrationStartProperties {
  method: string
}

export interface RegistrationCompleteProperties {
  method: string
  role: string
  duration?: number
}

export interface PricingViewProperties {
  plan?: string
  billingCycle?: string
}

export interface PricingSelectProperties {
  plan: string
  billingCycle: string
  price?: number
}

export interface FeatureEngageProperties {
  featureName: string
  action: string
}

export interface ScrollDepthProperties {
  depth: number
  path: string
}

export interface VideoPlayProperties {
  videoId: string
  videoTitle?: string
}

export interface DownloadProperties {
  resourceId: string
  resourceType: string
  resourceTitle?: string
}

export interface ExitIntentProperties {
  path: string
  timeOnPage: number
}

export interface TrustNotificationClickProperties {
  notificationType: string
  schoolName?: string
}

// Union of all event properties
export type AnalyticsEventProperties =
  | PageViewProperties
  | CtaClickProperties
  | FormStartProperties
  | FormCompleteProperties
  | FormErrorProperties
  | NewsletterSignupProperties
  | DemoRequestProperties
  | RegistrationStartProperties
  | RegistrationCompleteProperties
  | PricingViewProperties
  | PricingSelectProperties
  | FeatureEngageProperties
  | ScrollDepthProperties
  | VideoPlayProperties
  | DownloadProperties
  | ExitIntentProperties
  | TrustNotificationClickProperties
  | Record<string, unknown>
