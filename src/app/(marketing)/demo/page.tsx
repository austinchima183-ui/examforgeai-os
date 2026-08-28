'use client'

// ============================================================================
// ExamForge AI — Demo Booking Page
// ============================================================================
// Two-column layout: booking form on left, info on right.
// React Hook Form + Zod, timezone auto-detection, all states.
// ============================================================================

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar, Clock, Globe, Users, Building2, Briefcase,
  CheckCircle2, ArrowRight, AlertCircle, Sparkles, ArrowLeft,
  Monitor, MessageSquare, ShieldCheck, Star, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  demoBookingSchema, type DemoBookingFormData,
} from '@/lib/validators/demo-booking'
import {
  bookDemo, type DemoBookingResult,
} from '@/features/marketing/actions/demo-booking.action'

// Time slots from 9 AM to 5 PM
const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
]

const teamSizes = [
  { value: '1-50', label: '1–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '201-500', label: '201–500 people' },
  { value: '501-1000', label: '501–1,000 people' },
  { value: '1000+', label: '1,000+ people' },
] as const

function getNextBusinessDays(count: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  const current = new Date(today)
  current.setDate(current.getDate() + 1)

  while (dates.length < count) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// "What to expect" steps
const whatToExpectSteps = [
  {
    icon: Calendar,
    title: 'Schedule Your Demo',
    description: 'Pick a date and time that works for you. No commitment required.',
  },
  {
    icon: Monitor,
    title: 'Live Platform Walkthrough',
    description: 'Our team shows you how ExamForge AI works for your specific needs.',
  },
  {
    icon: MessageSquare,
    title: 'Q&A and Next Steps',
    description: 'Get all your questions answered and discuss a custom implementation plan.',
  },
]

export default function DemoBookingPage() {
  const [result, setResult] = useState<DemoBookingResult | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  // Auto-detect timezone
  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'Africa/Lagos'
    }
  }, [])

  const availableDates = useMemo(() => getNextBusinessDays(14), [])

  const form = useForm<DemoBookingFormData>({
    resolver: zodResolver(demoBookingSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      role: '',
      teamSize: '1-50',
      preferredDate: '',
      preferredTime: '',
      timezone: detectedTimezone,
      notes: '',
      source: 'direct',
    },
  })

  const onSubmit = async (data: DemoBookingFormData) => {
    const bookingData = {
      ...data,
      preferredDate: selectedDate,
      preferredTime: selectedTime,
    }
    const res = await bookDemo(bookingData)
    setResult(res)
    if (res.success) {
      form.reset()
      setSelectedDate('')
      setSelectedTime('')
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div className="min-h-screen bg-[#090909]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <AnimatePresence mode="wait">
          {result?.success && result.bookingId ? (
            /* ── Success State ── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Demo Booked!</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We&apos;ve sent a confirmation email with all the details.
                Our team will reach out shortly to finalize.
              </p>
              <div className="bg-[#1D1D1D]/50 rounded-xl p-6 max-w-sm mx-auto mb-8">
                <p className="text-sm text-muted-foreground mb-1">Booking Reference</p>
                <p className="text-lg font-mono font-semibold">
                  {result.bookingId.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/contact">
                    Contact Sales
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ── Form + Info Layout ── */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Free • No commitment • 30 minutes</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                  Book a Demo
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                  See how ExamForge AI can transform your school&apos;s exam
                  management. Our team will walk you through the platform and
                  answer all your questions.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12 items-start">
                {/* ── Left: Form ── */}
                <div className="lg:col-span-3">
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    noValidate
                    className="space-y-8 animate-fade-in"
                  >
                    {/* Date & Time Selection */}
                    <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Calendar className="h-5 w-5 text-primary" />
                          Select Date & Time
                        </CardTitle>
                        <CardDescription>
                          Choose a time that works best for you
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Timezone display */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>
                            Timezone:{' '}
                            <strong className="text-foreground">
                              {detectedTimezone}
                            </strong>
                          </span>
                        </div>

                        {/* Date Selection */}
                        <div>
                          <Label className="mb-3 block">Preferred Date</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                            {availableDates.map((date) => {
                              const dateStr = formatDate(date)
                              const isSelected = selectedDate === dateStr
                              return (
                                <button
                                  key={dateStr}
                                  type="button"
                                  onClick={() => setSelectedDate(dateStr)}
                                  className={`p-2 rounded-lg border text-center text-sm transition-all duration-200 ${
                                    isSelected
                                      ? 'border-primary bg-primary/10 text-primary font-medium'
                                      : 'border-white/[0.04] hover:border-white/[0.06] hover:bg-white/[0.02]'
                                  }`}
                                >
                                  <div className="text-xs text-muted-foreground">
                                    {formatDisplayDate(date).split(', ')[0]}
                                  </div>
                                  <div className="font-semibold">
                                    {date.getDate()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {date.toLocaleDateString('en-US', {
                                      month: 'short',
                                    })}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                          <input
                            type="hidden"
                            {...form.register('preferredDate')}
                            value={selectedDate}
                          />
                          {!selectedDate &&
                            form.formState.errors.preferredDate && (
                              <p className="mt-1 text-xs text-destructive">
                                {form.formState.errors.preferredDate.message}
                              </p>
                            )}
                        </div>

                        {/* Time Selection */}
                        {selectedDate && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <Label className="mb-3 block flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Preferred Time
                            </Label>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                              {timeSlots.map((time) => {
                                const isSelected = selectedTime === time
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => setSelectedTime(time)}
                                    className={`p-2 rounded-lg border text-center text-xs transition-all duration-200 ${
                                      isSelected
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-white/[0.04] hover:border-white/[0.06] hover:bg-white/[0.02]'
                                    }`}
                                  >
                                    {time}
                                  </button>
                                )
                              })}
                            </div>
                            <input
                              type="hidden"
                              {...form.register('preferredTime')}
                              value={selectedTime}
                            />
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Users className="h-5 w-5 text-primary" />
                          Your Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="demo-name">
                              Full Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="demo-name"
                              placeholder="John Doe"
                              className="mt-1.5 forge-input-glow"
                              aria-required="true"
                              aria-invalid={!!form.formState.errors.name}
                              {...form.register('name')}
                            />
                            {form.formState.errors.name && (
                              <p className="mt-1 text-xs text-destructive">
                                {form.formState.errors.name.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="demo-email">
                              Work Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="demo-email"
                              type="email"
                              placeholder="john@school.edu"
                              className="mt-1.5 forge-input-glow"
                              aria-required="true"
                              aria-invalid={!!form.formState.errors.email}
                              {...form.register('email')}
                            />
                            {form.formState.errors.email && (
                              <p className="mt-1 text-xs text-destructive">
                                {form.formState.errors.email.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="demo-company">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                School / Organization{' '}
                                <span className="text-destructive">*</span>
                              </span>
                            </Label>
                            <Input
                              id="demo-company"
                              placeholder="Springfield Academy"
                              className="mt-1.5 forge-input-glow"
                              {...form.register('company')}
                            />
                            {form.formState.errors.company && (
                              <p className="mt-1 text-xs text-destructive">
                                {form.formState.errors.company.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="demo-role">
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3.5 w-3.5" />
                                Your Role{' '}
                                <span className="text-destructive">*</span>
                              </span>
                            </Label>
                            <Input
                              id="demo-role"
                              placeholder="Principal, IT Director, etc."
                              className="mt-1.5 forge-input-glow"
                              {...form.register('role')}
                            />
                            {form.formState.errors.role && (
                              <p className="mt-1 text-xs text-destructive">
                                {form.formState.errors.role.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>
                            Team / Student Size{' '}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={form.watch('teamSize')}
                            onValueChange={(val) =>
                              form.setValue(
                                'teamSize',
                                val as DemoBookingFormData['teamSize'],
                              )
                            }
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {teamSizes.map((size) => (
                                <SelectItem key={size.value} value={size.value}>
                                  {size.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="demo-notes">Additional Notes</Label>
                          <Textarea
                            id="demo-notes"
                            placeholder="Any specific topics or questions you'd like us to cover..."
                            className="mt-1.5 resize-none"
                            rows={3}
                            {...form.register('notes')}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Error display */}
                    {result?.error && (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {result.error}
                        </p>
                      </div>
                    )}

                    {/* Submit */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full shadow-md shadow-primary/25"
                      disabled={isSubmitting || !selectedDate || !selectedTime}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          Book Demo
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      By booking, you agree to our{' '}
                      <Link
                        href="/privacy"
                        className="underline hover:text-foreground"
                      >
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/terms"
                        className="underline hover:text-foreground"
                      >
                        Terms of Service
                      </Link>
                      .
                    </p>
                  </form>
                </div>

                {/* ── Right: Info Sidebar ── */}
                <div className="lg:col-span-2 space-y-6">
                  {/* What to Expect */}
                  <Card className="forge-glass-surface border border-border/30 rounded-xl forge-card-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        What to Expect
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-5">
                        {whatToExpectSteps.map((step, i) => {
                          const Icon = step.icon
                          return (
                            <div key={i} className="flex gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold mb-0.5">
                                  {step.title}
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Testimonial */}
                  <Card className="bg-[#1D1D1D]/50 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>
                      <blockquote className="text-sm text-foreground leading-relaxed mb-4">
                        &ldquo;ExamForge AI transformed our exam process. What
                        used to take weeks now takes hours. The AI question
                        generation is a game-changer for our faculty.&rdquo;
                      </blockquote>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                          AO
                        </div>
                        <div>
                          <p className="text-sm font-medium">Dr. Adebayo Ogundimu</p>
                          <p className="text-xs text-muted-foreground">
                            Dean of Exams, University of Lagos
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trust Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <ShieldCheck className="h-3 w-3" />
                      SOC 2 Type II
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <ShieldCheck className="h-3 w-3" />
                      GDPR Compliant
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <ShieldCheck className="h-3 w-3" />
                      256-bit Encryption
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <Users className="h-3 w-3" />
                      500+ Schools
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
