// ============================================================================
// ExamForge AI — Contact Form Zod Schema
// ============================================================================

import { z } from 'zod'

export const contactSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  school: z.string().max(100).optional(),
  institutionType: z.enum(['primary', 'secondary', 'tertiary', 'training', 'other']).optional(),
  subject: z.enum(['general', 'demo', 'pricing', 'support', 'partnership', 'other']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be under 2000 characters'),
  honeypot: z.string().max(0), // Must be empty
})

export type ContactFormData = z.infer<typeof contactSchema>

// Derive priority from subject
export function derivePriority(subject: ContactFormData['subject']): 'low' | 'medium' | 'high' {
  if (subject === 'demo' || subject === 'partnership') return 'high'
  if (subject === 'pricing' || subject === 'support') return 'medium'
  return 'low'
}
