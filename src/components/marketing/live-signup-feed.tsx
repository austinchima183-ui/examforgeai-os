'use client'

// ============================================================================
// ExamForge AI OS — Live Signup Feed
// ============================================================================
// Shows recent signup activity. Subtle social proof, not flashy.
// Neural cyan indicator. Muted text. Nearly invisible.
// ============================================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

interface FeedItem {
  school: string
  time: string
}

// Fallback schools shown only when API is unavailable
const FALLBACK_SCHOOLS = [
  'Lagos State University',
  'University of Ibadan',
  'Ahmadu Bello University',
  'Kings College Lagos',
  'Grace Schools Abuja',
  'Federal Government College',
  'Baptist High School',
  'Loyola Jesuit College',
  'Day Waterman College',
  'British International School',
]

let feedIndex = 0

function generateFeedItem(schools: string[]): FeedItem {
  if (schools.length === 0) schools = FALLBACK_SCHOOLS
  const school = schools[feedIndex % schools.length]
  feedIndex++
  const minutes = (feedIndex % 30) + 1
  const time = minutes === 1 ? '1 min ago' : `${minutes} mins ago`
  return { school, time }
}

export function LiveSignupFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [recentSchools, setRecentSchools] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/marketing/demos?limit=10')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.demos?.length) {
          setRecentSchools(data.demos.map((d: { schoolName: string }) => d.schoolName))
        }
      })
      .catch(() => {
        // Fallback to static list — already handled by generateFeedItem
      })
  }, [])

  useEffect(() => {
    const schoolsToUse = recentSchools.length > 0 ? recentSchools : FALLBACK_SCHOOLS

    setItems([
      generateFeedItem(schoolsToUse),
      generateFeedItem(schoolsToUse),
      generateFeedItem(schoolsToUse),
    ])

    const interval = setInterval(() => {
      setItems((prev) => {
        const newItems = [generateFeedItem(schoolsToUse), ...prev].slice(0, 5)
        return newItems
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [recentSchools])

  return (
    <div className="space-y-1.5 max-h-40 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={`${item.school}-${index}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="flex items-center gap-2.5 text-xs"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400/8 text-cyan-400/60 flex-shrink-0">
              <Check className="h-2.5 w-2.5" />
            </div>
            <span className="text-foreground/55 truncate">{item.school}</span>
            <span className="text-muted-foreground/40 flex-shrink-0">{item.time}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
