'use client';

import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Shimmer Loading Fallback ────────────────────────────────────────────────

function ShimmerBlock({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

function ShimmerCard() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

function ChartShimmer() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

function EditorShimmer() {
  return (
    <div className="space-y-2 p-4">
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded" />
    </div>
  );
}

function PDFShimmer() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </div>
  );
}

// ─── Lazy AI Components ──────────────────────────────────────────────────────

export const LazyAICopilot = lazy(() =>
  import('@/components/ai/ai-copilot').then((mod) => ({
    default: mod.default ?? mod.AiCopilot ?? (() => null),
  }))
);

export const LazyAITutor = lazy(() =>
  import('@/components/ai/contextual-ai-assistant').then((mod) => ({
    default: mod.default ?? mod.ContextualAIAssistant ?? (() => null),
  }))
);

export const LazyAIQuestionGenerator = lazy(() =>
  import('@/app/(app)/teacher/ai-question-generator/page').then((mod) => ({
    default: mod.default ?? (() => null),
  }))
);

// ─── Lazy Chart Components ───────────────────────────────────────────────────

export const LazyBarChart = lazy(() =>
  import('@/components/charts/bar-chart').then((mod) => ({
    default: mod.BarChart ?? (() => null),
  }))
);

export const LazyAreaChart = lazy(() =>
  import('@/components/charts/area-chart').then((mod) => ({
    default: mod.AreaChart ?? (() => null),
  }))
);

// ─── Lazy PDF Components ─────────────────────────────────────────────────────

export const LazyPDFViewer = lazy(() =>
  import('@/components/reports/report-export-toolbar').then((mod) => ({
    default: mod.ReportExportToolbar ?? (() => null),
  }))
);

// ─── Lazy Editor Components ──────────────────────────────────────────────────

export const LazyRichTextEditor = lazy(() =>
  import('@/components/forms/textarea-field').then((mod) => ({
    default: mod.TextareaField ?? (() => null),
  }))
);

// ─── Wrapped Components with Suspense ────────────────────────────────────────

export function AICopilotLazy(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<ShimmerCard />}>
      <LazyAICopilot {...props} />
    </Suspense>
  );
}

export function AITutorLazy(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<ShimmerCard />}>
      <LazyAITutor {...props} />
    </Suspense>
  );
}

export function AIQuestionGeneratorLazy(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<ShimmerBlock />}>
      <LazyAIQuestionGenerator {...props} />
    </Suspense>
  );
}

export function BarChartLazy(props: any) {
  return (
    <Suspense fallback={<ChartShimmer />}>
      <LazyBarChart {...props} />
    </Suspense>
  );
}

export function AreaChartLazy(props: any) {
  return (
    <Suspense fallback={<ChartShimmer />}>
      <LazyAreaChart {...props} />
    </Suspense>
  );
}

export function PDFViewerLazy(props: any) {
  return (
    <Suspense fallback={<PDFShimmer />}>
      <LazyPDFViewer {...props} />
    </Suspense>
  );
}

export function RichTextEditorLazy(props: any) {
  return (
    <Suspense fallback={<EditorShimmer />}>
      <LazyRichTextEditor {...props} />
    </Suspense>
  );
}

// ─── Preload Hints ───────────────────────────────────────────────────────────

/**
 * Call to preload a module when it's likely to be needed soon.
 * Uses requestIdleCallback for non-blocking preloading.
 */
function preloadModule(importFn: () => Promise<unknown>) {
  const schedule = typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 200);

  schedule(() => {
    importFn().catch(() => {
      // Preload failed silently — component will retry on actual render
    });
  });
}

/** Preload AI modules — call when user navigates to an AI-enabled area */
export function preloadAIModules() {
  preloadModule(() => import('@/components/ai/ai-copilot'));
  preloadModule(() => import('@/components/ai/contextual-ai-assistant'));
}

/** Preload chart modules — call when user navigates to a dashboard/analytics area */
export function preloadChartModules() {
  preloadModule(() => import('@/components/charts/bar-chart'));
  preloadModule(() => import('@/components/charts/area-chart'));
}

/** Preload PDF modules — call when user is about to view/export reports */
export function preloadPDFModules() {
  preloadModule(() => import('@/components/reports/report-export-toolbar'));
}

/** Preload editor modules — call when user is about to edit content */
export function preloadEditorModules() {
  preloadModule(() => import('@/components/forms/textarea-field'));
}

// ─── Module Group Exports ────────────────────────────────────────────────────

export const LazyAIComponents = {
  AICopilot: AICopilotLazy,
  AITutor: AITutorLazy,
  AIQuestionGenerator: AIQuestionGeneratorLazy,
  preload: preloadAIModules,
};

export const LazyChartComponents = {
  BarChart: BarChartLazy,
  AreaChart: AreaChartLazy,
  preload: preloadChartModules,
};

export const LazyPDFComponents = {
  PDFViewer: PDFViewerLazy,
  preload: preloadPDFModules,
};

export const LazyEditorComponents = {
  RichTextEditor: RichTextEditorLazy,
  preload: preloadEditorModules,
};
