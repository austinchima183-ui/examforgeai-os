// ExamForge AI — Sentry Server Configuration
// No-op when NEXT_PUBLIC_SENTRY_DSN is not configured

export {}

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (sentryDsn) {
  // Only import and init Sentry when DSN is available
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? process.env.npm_package_version,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
      ignoreErrors: [
        'NetworkError', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
        'MAX_RETRIES_PER_REQUEST',
      ],
      enabled: (process.env.NODE_ENV as string) === 'production' || (process.env.NODE_ENV as string) === 'staging',
    })
  }).catch(() => {
    // Sentry SDK not available — no-op
  })
}
