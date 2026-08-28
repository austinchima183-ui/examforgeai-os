'use client'

import { ProductionNewsletterForm } from '@/components/marketing/production-newsletter-form'

// ============================================================================
// ExamForge AI — Newsletter Form (Thin Wrapper)
// ============================================================================
// Delegates to the production newsletter form with inline source.
// ============================================================================

export function NewsletterForm() {
  return <ProductionNewsletterForm source="inline" compact />
}
