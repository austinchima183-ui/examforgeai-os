'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Star, Quote, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { ProfessionalAvatar } from '@/components/marketing/illustrations'
import { ForgeStarRating } from '@/components/marketing/design-system'

// ============================================================================
// ExamForge AI — Testimonials Section (Premium AI OS)
// ============================================================================
// Carousel/slider for testimonials with animated star ratings,
// clean quote cards with avatar, name, role, subtle borders,
// forge-glass-surface cards, and auto-rotation with pause on hover.
// ============================================================================

const testimonials = [
  {
    name: 'Dr. Adebayo Okonkwo',
    role: 'Vice Chancellor',
    school: 'Covenant University',
    initials: 'AO',
    rating: 5,
    text: 'ExamForge AI has completely transformed our examination process. We went from spending weeks on exam logistics to setting up and delivering CBT exams in a single day. The AI auto-marking alone has saved our faculty over 2,000 hours per semester.',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    name: 'Mrs. Fatima Abdullahi',
    role: 'Head of Examinations',
    school: 'Ahmadu Bello University',
    initials: 'FA',
    rating: 5,
    text: 'The live monitoring feature gives us confidence in exam integrity. We can see exactly what is happening across all 350 exam terminals in real-time. The AI question generation is remarkably accurate and aligned with our curriculum.',
    gradient: 'from-cyan-500 to-teal-600',
  },
  {
    name: 'Mr. Chinedu Eze',
    role: 'IT Director',
    school: 'Kings College Lagos',
    initials: 'CE',
    rating: 5,
    text: 'We evaluated seven different platforms before choosing ExamForge AI. The security architecture, the RBAC system, and the seamless integration with our existing processes made it the clear winner. Setup took less than a week.',
    gradient: 'from-indigo-500 to-cyan-500',
  },
  {
    name: 'Prof. Grace Okafor',
    role: 'Dean of Science',
    school: 'University of Ibadan',
    initials: 'GO',
    rating: 5,
    text: 'The predictive analytics feature has been a game-changer for identifying struggling students early. We can now intervene before exam season, and our pass rates have improved by 18% since implementing the platform.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    name: 'Mr. Tunde Bakare',
    role: 'School Administrator',
    school: 'Gracefield International School',
    initials: 'TB',
    rating: 5,
    text: 'As a K-12 school, we needed a platform that was simple enough for our younger students but powerful enough for our needs. ExamForge AI delivers on both. The parent portal has also improved our communication dramatically.',
    gradient: 'from-indigo-500 to-amber-500',
  },
  {
    name: 'Dr. Ngozi Ibe',
    role: 'Director of Assessment',
    school: 'Federal College of Education',
    initials: 'NI',
    rating: 5,
    text: 'The marketplace feature is brilliant. We share exam templates with other institutions and download pre-built question banks. It has created a community of educators collaborating to improve assessment quality across Nigeria.',
    gradient: 'from-amber-400 to-cyan-400',
  },
]

function AnimatedStarRating({ rating, isInView }: { rating: number; isInView: boolean }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, rotate: -30 }}
          animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.3 + i * 0.08 }}
        >
          <Star
            className={`h-4 w-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`}
          />
        </motion.div>
      ))}
    </div>
  )
}

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Show 3 testimonials at a time on desktop, 1 on mobile
  const itemsPerView = 3
  const totalPages = Math.ceil(testimonials.length / itemsPerView)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }, [])

  // Auto-rotation
  useEffect(() => {
    if (isPaused || isHovered) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isPaused, isHovered, nextSlide])

  // Get visible testimonials
  const getVisibleTestimonials = () => {
    const visible = []
    for (let i = 0; i < itemsPerView; i++) {
      const idx = (currentIndex + i) % testimonials.length
      visible.push({ ...testimonials[idx], idx })
    }
    return visible
  }

  return (
    <SectionWrapper id="testimonials" backgroundClassName="bg-[#090909]">
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4"
          >
            Testimonials
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Loved by{' '}
            <GradientText preset="forge">educators everywhere</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Hear from the schools and educators who have transformed their operations with ExamForge AI.
          </motion.p>
        </div>

        {/* Carousel */}
        <div className="relative max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {getVisibleTestimonials().map((testimonial) => (
                <div
                  key={`${testimonial.name}-${testimonial.idx}`}
                  className="group relative"
                >
                  {/* Subtle gradient border glow on hover */}
                  <div
                    className={`absolute -inset-px rounded-xl bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-[1px]`}
                    aria-hidden="true"
                  />
                  {/* Clean quote card with subtle border */}
                  <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-6 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-500 flex flex-col h-full">
                    {/* Stars and Quote */}
                    <div className="flex items-center justify-between mb-4">
                      <AnimatedStarRating rating={testimonial.rating} isInView={isInView} />
                      <Quote className="h-5 w-5 text-primary/15" />
                    </div>

                    {/* Testimonial text */}
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                      &ldquo;{testimonial.text}&rdquo;
                    </p>

                    {/* Author: avatar, name, role */}
                    <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]">
                      <ProfessionalAvatar
                        name={testimonial.name}
                        role={testimonial.role}
                        organization={testimonial.school}
                        size="sm"
                        gradient={testimonial.gradient}
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-xs text-foreground/60">
                          {testimonial.role}, {testimonial.school}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prevSlide}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 transition-all duration-200"
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Dots indicator */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-white/10 hover:bg-white/20'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 transition-all duration-200"
              aria-label="Next testimonials"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Pause/Play button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
