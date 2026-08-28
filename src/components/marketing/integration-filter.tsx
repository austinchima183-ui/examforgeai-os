'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExternalLink, BookOpen, GraduationCap, Mail, MessageSquare,
  CreditCard, BarChart3, Webhook, Code, Zap, Database, Plug,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { IntegrationItem } from '@/app/(marketing)/integrations/page'

// Icon name to component mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap, Mail, MessageSquare, CreditCard, BarChart3,
  Webhook, Code, Zap, Database, Plug,
}

// ============================================================================
// ExamForge AI — Integration Filter (Client Component)
// ============================================================================

type FilterValue = 'all' | 'sis' | 'communication' | 'productivity' | 'payment' | 'analytics' | 'developer'
type StatusFilter = 'all' | 'available' | 'beta' | 'coming_soon'

const CATEGORY_FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sis', label: 'Student Info Systems' },
  { value: 'communication', label: 'Communication' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'payment', label: 'Payment' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'developer', label: 'Custom API' },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'beta', label: 'Beta' },
  { value: 'coming_soon', label: 'Coming Soon' },
]

function getStatusBadge(status: 'available' | 'beta' | 'coming_soon') {
  switch (status) {
    case 'available':
      return <Badge className="bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-200 dark:border-emerald-800 text-[10px]">Available</Badge>
    case 'beta':
      return <Badge className="bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 text-[10px]">Beta</Badge>
    case 'coming_soon':
      return <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
  }
}

interface IntegrationFilterProps {
  integrations: IntegrationItem[]
}

export function IntegrationFilter({ integrations }: IntegrationFilterProps) {
  const [categoryFilter, setCategoryFilter] = useState<FilterValue>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = integrations.filter((integration) => {
    const categoryMatch = categoryFilter === 'all' || integration.categorySlug === categoryFilter
    const statusMatch = statusFilter === 'all' || integration.status === statusFilter
    return categoryMatch && statusMatch
  })

  return (
    <div className="max-w-5xl mx-auto">
      {/* Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
          {CATEGORY_FILTERS.map((opt) => (
            <button
              key={opt.value}
              role="tab"
              aria-selected={categoryFilter === opt.value}
              onClick={() => setCategoryFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                categoryFilter === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              role="tab"
              aria-selected={statusFilter === opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                statusFilter === opt.value
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integration Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${categoryFilter}-${statusFilter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filtered.map((integration) => {
            const Icon = iconMap[integration.icon] || Code
            const isAvailable = integration.status === 'available'
            const isBeta = integration.status === 'beta'
            return (
              <div
                key={integration.name}
                className="rounded-xl border border-border/50 bg-card/80 p-6 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{integration.name}</h3>
                      <p className="text-xs text-muted-foreground">{integration.category}</p>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {integration.description}
                </p>

                {/* Details */}
                <div className="rounded-lg border border-border/30 bg-muted/30 p-3 mb-4 mt-auto">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {integration.details}
                  </p>
                </div>

                {/* Action */}
                <div className="flex gap-2">
                  {(isAvailable || isBeta) && integration.docsLink ? (
                    <Button variant="default" size="sm" className="flex-1" asChild>
                      <Link href={integration.docsLink}>
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        View Docs
                      </Link>
                    </Button>
                  ) : null}
                  {isAvailable && (
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href="/contact">Connect</Link>
                    </Button>
                  )}
                  {integration.status === 'coming_soon' && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href="/contact">Join Waitlist</Link>
                    </Button>
                  )}
                  {isBeta && !integration.docsLink && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href="/contact">Request Access</Link>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No integrations match the selected filters.</p>
        </div>
      )}
    </div>
  )
}
