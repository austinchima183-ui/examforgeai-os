// ============================================================================
// ExamForge AI OS — Design System Index
// ============================================================================
// Single import surface for all dashboard composite primitives. This is the
// canonical API for building dashboards — every page should import from here
// instead of reaching into individual /components/ui/ files when a composite
// primitive exists.
//
// Layered approach:
//   1. /lib/design/system.ts — design tokens (colors, spacing, motion, etc.)
//   2. /components/ui/* — base primitives (Button, Card, Dialog, Drawer,
//      Tooltip, etc. — mostly shadcn/ui-style, already solid)
//   3. /components/system/* — THIS FILE — composite dashboard primitives
//      that compose base primitives + design tokens into higher-level
//      patterns (KpiCard, SectionCard, PageHeader, FilterBar, ActivityFeed,
//      ChartCard, QuickActions, DashboardPage, BulkActionBar, InlineEditField,
//      SavedFilters).
//
// Usage in a dashboard page:
//   import {
//     DashboardPage, KpiCard, KpiGrid, SectionCard, ActivityFeed,
//     ChartCard, QuickActions, PageHeader, FilterBar, getGreeting,
//   } from '@/components/system'
//
//   <DashboardPage
//     title={firstName}
//     greeting={getGreeting()}
//     description="3 exams upcoming"
//     badge={{ label: 'Student', icon: GraduationCap }}
//     kpis={<KpiGrid>...</KpiGrid>}
//     sidebar={<ActivityFeed items={...} />}
//   >
//     ...main content...
//   </DashboardPage>
// ============================================================================

import type * as React from 'react'

// ─── Design tokens ──────────────────────────────────────────────────────────
export {
  appColors,
  glassTiers,
  space,
  typography,
  radii,
  motionPresets,
  layers,
  breakpoints,
  dashboardGrid,
  trendConfig,
  statusToneConfig,
  activityTypeConfig,
  getGreeting,
  formatRelativeTime,
} from '@/lib/design/system'
export type {
  GlassTier,
  TrendDirection,
  StatusTone,
  ActivityType,
} from '@/lib/design/system'

// ─── Composite dashboard primitives ────────────────────────────────────────
export { PageHeader } from './page-header'
export type { PageHeaderProps, PageHeaderBreadcrumb } from './page-header'

export { KpiCard, KpiGrid } from './kpi-card'
export type { KpiCardProps, KpiGridProps } from './kpi-card'

export { SectionCard } from './section-card'
export type { SectionCardProps } from './section-card'

export { FilterBar } from './filter-bar'
export type { FilterBarProps } from './filter-bar'

export { ActivityFeed } from './activity-feed'
export type {
  ActivityFeedProps,
  ActivityFeedItem,
} from './activity-feed'

export { ChartCard } from './chart-card'
export type { ChartCardProps, ChartCardSeries } from './chart-card'

export { QuickActions } from './quick-actions'
export type { QuickActionsProps, QuickAction } from './quick-actions'

export { DashboardPage } from './dashboard-page'
export type { DashboardPageProps } from './dashboard-page'

export { BulkActionBar, defaultBulkActions } from './bulk-action-bar'
export type { BulkActionBarProps, BulkAction } from './bulk-action-bar'

export { InlineEditField } from './inline-edit-field'
export type { InlineEditFieldProps } from './inline-edit-field'

export { SavedFilters } from './saved-filters'
export type { SavedFiltersProps, SavedView } from './saved-filters'

// ─── Widget framework (Mission 2 — Enterprise dashboard UX) ───────────────
export {
  WidgetGrid,
  WidgetSkeleton,
  WidgetEmptyState,
  WidgetErrorState,
} from './widget-grid'
export type { WidgetGridProps, WidgetDef, WidgetCategory } from './widget-grid'
export { WIDGET_CATEGORY_LABELS } from './widget-grid'

// ─── Widget system 3.0 — marketplace + toolbar ────────────────────────────
export { WidgetMarketplace } from './widget-marketplace'
export type { WidgetMarketplaceProps } from './widget-marketplace'
export { WidgetToolbar } from './widget-toolbar'
export type { WidgetToolbarProps } from './widget-toolbar'

// ─── UX 2.0 — Dashboard grid system, hero, animated counters ──────────────
export { DashboardGrid, GridItem, gridSpans } from './dashboard-grid'
export type { DashboardGridProps, GridItemProps, GridItemSpan } from './dashboard-grid'

export { HeroSection } from './hero-section'
export type { HeroSectionProps, HeroStat } from './hero-section'

export { AnimatedNumber, parseKpiValue } from './animated-number'
export type { AnimatedNumberProps } from './animated-number'

// ─── UX 2.0 — Real-data dashboard widgets ──────────────────────────────────
export { ScoreTrendWidget } from './widgets/score-trend-widget'
export type { ScoreTrendWidgetProps } from './widgets/score-trend-widget'

export { PerformanceBarWidget } from './widgets/performance-bar-widget'
export type { PerformanceBarWidgetProps } from './widgets/performance-bar-widget'

export { UpcomingTasksWidget } from './widgets/upcoming-tasks-widget'
export type { UpcomingTasksWidgetProps, TaskItem } from './widgets/upcoming-tasks-widget'

export { MiniCalendarWidget, AnnouncementsWidget } from './widgets/mini-calendar-widget'
export type {
  MiniCalendarWidgetProps,
  CalendarDayEvent,
  AnnouncementItem,
} from './widgets/mini-calendar-widget'

export { GoalsWidget } from './widgets/goals-widget'
export type { GoalsWidgetProps, GoalItem } from './widgets/goals-widget'

export { TrendWidget } from './widgets/trend-widget'
export type { TrendWidgetProps } from './widgets/trend-widget'

// ─── Base primitives re-exported for convenience ──────────────────────────
// These already exist as solid shadcn/ui-style components — re-exporting here
// so consumers have one import for the whole design system layer.
export {
  Button,
  buttonVariants,
} from '@/components/ui/button'
// Re-export ButtonProps from the variant module since shadcn doesn't surface it directly
export type { VariantProps } from 'class-variance-authority'
import type { Button as ButtonType } from '@/components/ui/button'
export type ButtonProps = React.ComponentProps<typeof ButtonType>
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
export { Badge, badgeVariants } from '@/components/ui/badge'
export { Input } from '@/components/ui/input'
export { Textarea } from '@/components/ui/textarea'
export { Label } from '@/components/ui/label'
export { Separator } from '@/components/ui/separator'
export { Skeleton } from '@/components/ui/skeleton'
export { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
export { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
export { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
export { Checkbox } from '@/components/ui/checkbox'
export { Switch } from '@/components/ui/switch'
export { Progress } from '@/components/ui/progress'
export { EmptyState } from '@/components/ui/empty-state'
export type { EmptyStateProps } from '@/components/ui/empty-state'
export { DockPanel, DockTrigger } from '@/components/system/dock-panel'
export type { DockPanelProps, DockSide } from '@/components/system/dock-panel'
