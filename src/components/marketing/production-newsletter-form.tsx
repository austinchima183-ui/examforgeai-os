'use client'

// ============================================================================
// ExamForge AI — Production Newsletter Form
// ============================================================================
// React Hook Form + Zod, GDPR consent, all states, source tracking.
// Compact design for footer/CTA placement.
// ============================================================================

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  newsletterSchema, type NewsletterFormData,
} from '@/lib/validators/newsletter'
import {
  subscribeNewsletter,
} from '@/features/marketing/actions/newsletter.action'

type FormState = 'idle' | 'submitting' | 'success' | 'already-subscribed' | 'error'

interface ProductionNewsletterFormProps {
  source?: 'footer' | 'cta' | 'popup' | 'inline' | 'demo'
  compact?: boolean
  className?: string
}

export function ProductionNewsletterForm({
  source = 'footer',
  compact = false,
  className = '',
}: ProductionNewsletterFormProps) {
  const [formState, setFormState] = useState<FormState>('idle')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [gdprConsent, setGdprConsent] = useState(false)

  const form = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: '',
      source,
      preferences: [],
    },
  })

  const onSubmit = async (data: NewsletterFormData) => {
    if (!gdprConsent && !compact) return

    setFormState('submitting')
    try {
      const result = await subscribeNewsletter({ ...data, source })
      if (result.success) {
        if (result.message?.includes('already')) {
          setFormState('already-subscribed')
        } else {
          setSuccessMessage(
            result.message ?? 'Check your inbox to verify your subscription.',
          )
          setFormState('success')
        }
        form.reset()
        setGdprConsent(false)
      } else {
        setFormState('error')
      }
    } catch {
      setFormState('error')
    }
  }

  const isSubmitting = formState === 'submitting'

  // ── Compact variant (single row) ──
  if (compact) {
    return (
      <div className={className}>
        <AnimatePresence mode="wait">
          {formState === 'success' || formState === 'already-subscribed' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-9500/10 border border-emerald-500/20 text-green-600 dark:text-green-400"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">
                {formState === 'already-subscribed'
                  ? 'Already subscribed!'
                  : 'Check your email!'}
              </span>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-10 flex-1"
                aria-label="Email address for newsletter"
                aria-required="true"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-10"
              >
                {isSubmitting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  'Subscribe'
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Full variant (with GDPR checkbox) ──
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {formState === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="flex items-center gap-2 px-5 py-3 rounded-lg bg-green-50 dark:bg-green-9500/10 border border-emerald-500/20 text-green-600 dark:text-green-400"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        ) : formState === 'already-subscribed' ? (
          <motion.div
            key="already"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="flex items-center gap-2 px-5 py-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400"
          >
            <Mail className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">
              You&apos;re already subscribed!
            </span>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <Label
                  htmlFor={`newsletter-email-${source}`}
                  className="sr-only"
                >
                  Email address for newsletter subscription
                </Label>
                <Input
                  id={`newsletter-email-${source}`}
                  type="email"
                  placeholder="Enter your email"
                  className="h-10 w-full"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register('email')}
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !gdprConsent}
                className="h-10 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  'Subscribe'
                )}
              </Button>
            </div>

            {form.formState.errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.email.message}
              </p>
            )}

            {/* ── GDPR Consent ── */}
            <div className="flex items-start gap-2">
              <Checkbox
                id={`newsletter-consent-${source}`}
                className="mt-0.5"
                checked={gdprConsent}
                onCheckedChange={(checked) => setGdprConsent(checked === true)}
                aria-required="true"
              />
              <Label
                htmlFor={`newsletter-consent-${source}`}
                className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
              >
                I agree to receive marketing emails from ExamForge AI. You can
                unsubscribe at any time.
              </Label>
            </div>

            {formState === 'error' && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Failed to subscribe. Please try again.
              </p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
