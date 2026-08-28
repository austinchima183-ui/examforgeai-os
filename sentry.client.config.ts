// ExamForge AI — Sentry Client Configuration
// No-op when NEXT_PUBLIC_SENTRY_DSN is not configured

export {}

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (sentryDsn) {
  // Only import and init Sentry when DSN is available
  // This prevents node:worker_threads from leaking into client bundle
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          block: ['.sentry-block'],
        }),
      ],
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? process.env.npm_package_version,
      ignoreErrors: [
        'NetworkError', 'Network request failed', 'Failed to fetch',
        'Load failed', 'AbortError', 'Non-Error promise rejection captured',
        'ResizeObserver loop completed with undelivered notifications',
        'ResizeObserver loop limit exceeded',
      ],
      enabled: (process.env.NODE_ENV as string) === 'production' || (process.env.NODE_ENV as string) === 'staging',
    })
  }).catch(() => {
    // Sentry SDK not available — no-op
  })
}
