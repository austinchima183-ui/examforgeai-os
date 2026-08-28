'use client'

// ============================================================================
// ExamForge AI — Production Contact Form Component
// ============================================================================
// React Hook Form + Zod validation, honeypot anti-spam, GDPR consent,
// all submission states, full accessibility with shadcn/ui components.
// ============================================================================

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Loader2, AlertCircle, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { contactSchema, type ContactFormData } from '@/lib/validators/contact'
import {
  submitContactForm, type ContactActionResult,
} from '@/features/marketing/actions/contact.action'

const institutionTypes = [
  { value: 'primary', label: 'Primary School' },
  { value: 'secondary', label: 'Secondary School' },
  { value: 'tertiary', label: 'University / Tertiary' },
  { value: 'training', label: 'Training Institute' },
  { value: 'other', label: 'Other' },
] as const

const subjects = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'demo', label: 'Request a Demo' },
  { value: 'pricing', label: 'Pricing Question' },
  { value: 'support', label: 'Technical Support' },
  { value: 'partnership', label: 'Partnership Inquiry' },
  { value: 'other', label: 'Other' },
] as const

type FormPhase = 'idle' | 'submitting' | 'success' | 'error'

export function ContactForm() {
  const [phase, setPhase] = useState<FormPhase>('idle')
  const [resultId, setResultId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [gdprConsent, setGdprConsent] = useState(false)

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      school: '',
      institutionType: undefined,
      subject: 'general',
      message: '',
      honeypot: '',
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    if (!gdprConsent) return

    setPhase('submitting')
    setErrorMessage('')
    setResultId('')

    const result: ContactActionResult = await submitContactForm(data)

    if (result.success) {
      setPhase('success')
      setResultId(result.id ?? '')
      form.reset()
      setGdprConsent(false)
    } else {
      setPhase('error')
      setErrorMessage(result.error ?? 'An unexpected error occurred. Please try again.')
    }
  }

  return (
    <AnimatePresence mode="wait">
      {phase === 'success' ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Message Sent Successfully!</h3>
          <p className="text-sm text-muted-foreground mb-2">
            We&apos;ll respond within 24 hours.
          </p>
          {resultId && (
            <p className="text-xs text-muted-foreground">
              Reference:{' '}
              <span className="font-mono font-semibold">
                {resultId.slice(0, 8).toUpperCase()}
              </span>
            </p>
          )}
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-5"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          {/* ── Honeypot — hidden from users, traps bots ── */}
          <div
            className="absolute -left-[9999px] opacity-0"
            aria-hidden="true"
          >
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...form.register('honeypot')}
            />
          </div>

          {/* ── First & Last Name ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-firstName">
                First name <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="contact-firstName"
                type="text"
                placeholder="John"
                className="mt-1.5 h-11"
                aria-required="true"
                aria-invalid={!!form.formState.errors.firstName}
                aria-describedby={
                  form.formState.errors.firstName ? 'contact-firstName-error' : undefined
                }
                {...form.register('firstName')}
              />
              {form.formState.errors.firstName && (
                <p
                  id="contact-firstName-error"
                  className="mt-1 text-xs text-destructive flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="contact-lastName">
                Last name <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="contact-lastName"
                type="text"
                placeholder="Doe"
                className="mt-1.5 h-11"
                aria-required="true"
                aria-invalid={!!form.formState.errors.lastName}
                aria-describedby={
                  form.formState.errors.lastName ? 'contact-lastName-error' : undefined
                }
                {...form.register('lastName')}
              />
              {form.formState.errors.lastName && (
                <p
                  id="contact-lastName-error"
                  className="mt-1 text-xs text-destructive flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* ── Email ── */}
          <div>
            <Label htmlFor="contact-email">
              Email <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="john@school.edu"
              className="mt-1.5 h-11"
              aria-required="true"
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={
                form.formState.errors.email ? 'contact-email-error' : undefined
              }
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p
                id="contact-email-error"
                className="mt-1 text-xs text-destructive flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* ── Phone (optional) ── */}
          <div>
            <Label htmlFor="contact-phone">Phone number (optional)</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="+234 801 234 5678"
              className="mt-1.5 h-11"
              aria-invalid={!!form.formState.errors.phone}
              aria-describedby={
                form.formState.errors.phone ? 'contact-phone-error' : undefined
              }
              {...form.register('phone')}
            />
            {form.formState.errors.phone && (
              <p
                id="contact-phone-error"
                className="mt-1 text-xs text-destructive flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          {/* ── School (optional) ── */}
          <div>
            <Label htmlFor="contact-school">School name (optional)</Label>
            <Input
              id="contact-school"
              type="text"
              placeholder="Your school name"
              className="mt-1.5 h-11"
              {...form.register('school')}
            />
          </div>

          {/* ── Institution Type ── */}
          <div>
            <Label htmlFor="contact-institutionType">Institution type</Label>
            <Select
              value={form.watch('institutionType') ?? ''}
              onValueChange={(value) =>
                form.setValue(
                  'institutionType',
                  value as ContactFormData['institutionType'],
                )
              }
            >
              <SelectTrigger id="contact-institutionType" className="mt-1.5 h-11">
                <SelectValue placeholder="Select institution type" />
              </SelectTrigger>
              <SelectContent>
                {institutionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Subject ── */}
          <div>
            <Label htmlFor="contact-subject">
              Subject <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Select
              value={form.watch('subject')}
              onValueChange={(value) =>
                form.setValue('subject', value as ContactFormData['subject'])
              }
            >
              <SelectTrigger id="contact-subject" className="mt-1.5 h-11">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subj) => (
                  <SelectItem key={subj.value} value={subj.value}>
                    {subj.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.subject && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          {/* ── Message ── */}
          <div>
            <Label htmlFor="contact-message">
              Message <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Textarea
              id="contact-message"
              rows={5}
              placeholder="Tell us about your school and how we can help..."
              className="mt-1.5 resize-none"
              aria-required="true"
              aria-invalid={!!form.formState.errors.message}
              aria-describedby={
                form.formState.errors.message ? 'contact-message-error' : undefined
              }
              {...form.register('message')}
            />
            {form.formState.errors.message && (
              <p
                id="contact-message-error"
                className="mt-1 text-xs text-destructive flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.message.message}
              </p>
            )}
          </div>

          {/* ── GDPR Consent ── */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="contact-gdpr"
              className="mt-0.5"
              checked={gdprConsent}
              onCheckedChange={(checked) => setGdprConsent(checked === true)}
              aria-required="true"
            />
            <Label
              htmlFor="contact-gdpr"
              className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
            >
              I consent to ExamForge AI processing my data to respond to this
              inquiry. See our{' '}
              <a
                href="/privacy"
                className="underline hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>.
            </Label>
          </div>
          {!gdprConsent && form.formState.isSubmitted && (
            <p className="text-xs text-destructive">
              Please accept the privacy consent to continue.
            </p>
          )}

          {/* ── General form error ── */}
          {phase === 'error' && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </p>
            </div>
          )}

          {/* ── Submit Button ── */}
          <Button
            type="submit"
            className="w-full shadow-md shadow-primary/25 h-11"
            disabled={phase === 'submitting' || !gdprConsent}
          >
            {phase === 'submitting' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Send Message
              </>
            )}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  )
}
