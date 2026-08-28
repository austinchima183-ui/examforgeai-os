// ============================================================================
// ExamForge AI — Demo Booking Zod Schema
// ============================================================================

import { z } from 'zod'

export const demoBookingSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  company: z.string().min(2, 'Institution name is required').max(100),
  role: z.string().min(2, 'Role is required').max(50),
  teamSize: z.enum(['1-50', '51-200', '201-500', '501-1000', '1000+']),
  preferredDate: z.string().min(1, 'Please select a date'),
  preferredTime: z.string().min(1, 'Please select a time'),
  timezone: z.string().min(1),
  notes: z.string().max(500).optional(),
  source: z.enum(['hero', 'pricing', 'cta', 'floating', 'popup', 'direct']),
})

export type DemoBookingFormData = z.infer<typeof demoBookingSchema>
