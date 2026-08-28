// ============================================================================
// ExamForge AI — Newsletter Zod Schema
// ============================================================================

import { z } from 'zod'

export const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  source: z.enum(['footer', 'cta', 'popup', 'inline', 'demo']),
  preferences: z.array(z.string()).optional(),
})

export type NewsletterFormData = z.infer<typeof newsletterSchema>
