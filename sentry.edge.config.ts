// ExamForge AI — Sentry Edge Configuration
// No-op when NEXT_PUBLIC_SENTRY_DSN is not configured
// Empty file prevents node:worker_threads from leaking into Edge Runtime

export {}

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (sentryDsn) {
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? process.env.npm_package_version,
      enabled: (process.env.NODE_ENV as string) === 'production' || (process.env.NODE_ENV as string) === 'staging',
    })
  }).catch(() => {})
}
