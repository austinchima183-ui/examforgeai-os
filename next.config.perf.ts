// ============================================================================
// ExamForge AI — Performance Optimizations for Next.js Config
// ============================================================================
// This file provides performance-focused configuration that can be merged
// into the main next.config.ts. It includes:
//   - Bundle analysis configuration
//   - Image optimization (WebP, AVIF)
//   - Font optimization
//   - Tree shaking & dead code elimination
//   - Dynamic imports for heavy components (AI, charts, PDF)
//   - Compression settings
// ============================================================================

import type { NextConfig } from 'next';

// ── Bundle Analysis ─────────────────────────────────────────────────────────

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// ── Performance Configuration ───────────────────────────────────────────────

// Derive Supabase hostname from env var (available at build time)
const supabasePerfHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : ''

export const performanceConfig: NextConfig = {
  // ── React & Rendering ──
  reactStrictMode: true,
  // Enable React 19 compiler optimizations
  experimental: {
    // Optimize package imports - tree shake heavy libraries
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash',
      'zod',
      'framer-motion',
    ],
    // Turbopack for faster dev builds
    // @ts-expect-error turbo is not in ExperimentalConfig type yet
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // ── Image Optimization ──
  images: {
    // Enable modern formats
    formats: ['image/avif', 'image/webp'],
    // Responsive device sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for responsive images
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum cache TTL (seconds) for optimized images
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    // Allow responsive images with a max age of 60s stale-while-revalidate
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      ...(supabasePerfHostname ? [{
        protocol: 'https' as const,
        hostname: supabasePerfHostname,
        pathname: '/storage/v1/object/public/**',
      }] : []),
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },

  // ── Compiler Optimization ──
  compiler: {
    // Remove console.log in production (keep console.error & console.warn)
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn', 'info'] }
      : false,
  },

  // ── Compression ──
  compress: true,

  // ── Output Tracing (for Docker/standalone deployments) ──
  // output: 'standalone', // Uncomment for self-hosted deployments

  // ── Power by header removal ──
  poweredByHeader: false,

  // ── Static Generation ──
  // Increase static page generation timeout for complex pages
  staticPageGenerationTimeout: 120,

  // ── Webpack Configuration ──
  webpack(config, { dev, isServer }) {
    // ── Production-only optimizations ──
    if (!dev) {
      // Tree shaking: mark side-effect-free packages
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        minimize: true,
      };
    }

    // ── SVG handling ──
    const fileLoaderRule = config.module.rules.find((rule: any) =>
      rule.test?.test?.('.svg')
    );
    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/;
    }
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // ── Bundle splitting for heavy modules ──
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...((config.optimization.splitChunks as any)?.cacheGroups || {}),
          // AI libraries - heavy, rarely change
          ai: {
            test: /[\\/]node_modules[\\/](openai|@google|@ai-sdk)[\\/]/,
            name: 'ai-vendors',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Chart libraries - heavy, rarely change
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3-|chart\.js)[\\/]/,
            name: 'chart-vendors',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // PDF/document libraries
          documents: {
            test: /[\\/]node_modules[\\/](pdfmake|jspdf|html2canvas)[\\/]/,
            name: 'document-vendors',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // UI framework - moderate, changes occasionally
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|lucide-react)[\\/]/,
            name: 'ui-vendors',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Date utilities
          dates: {
            test: /[\\/]node_modules[\\/](date-fns|dayjs|moment)[\\/]/,
            name: 'date-vendors',
            chunks: 'all',
            priority: 15,
            reuseExistingChunk: true,
          },
          // All other vendor code
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Common application code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // ── Headers for Caching ──
  async headers() {
    return [
      // Static assets - aggressive caching
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes - no caching by default
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      // Next.js static files
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// ── Dynamic Import Helpers ──────────────────────────────────────────────────
// These are re-exported for use in application code to code-split heavy modules

/**
 * Dynamic import for AI components
 * Reduces initial bundle by ~200KB
 */
export const dynamicImports = {
  /** AI Copilot - heavy AI interaction component */
  aiCopilot: () => import('@/components/ai/ai-copilot'),

  /** AI Action Panel */
  aiActionPanel: () => import('@/components/ai/ai-action-panel'),

  /** ExamForge Intelligence */
  examforgeIntelligence: () => import('@/components/ai/examforge-intelligence'),

  /** Chart components */
  barChart: () => import('@/components/charts/bar-chart'),

  /** Area chart */
  areaChart: () => import('@/components/charts/area-chart'),

  /** Data table - heavy table component */
  dataTable: () => import('@/components/tables/data-table'),

  /** Global search */
  globalSearch: () => import('@/components/search/global-search'),

  /** Report export toolbar */
  reportExportToolbar: () => import('@/components/reports/report-export-toolbar'),

  /** Onboarding wizard */
  onboardingWizard: () => import('@/components/onboarding/onboarding-wizard'),
};

// ── Font Optimization Configuration ─────────────────────────────────────────

export const fontConfig = {
  /** Fonts to preload for performance */
  preload: [
    { family: 'Inter', weight: 400, style: 'normal' },
    { family: 'Inter', weight: 500, style: 'normal' },
    { family: 'Inter', weight: 600, style: 'normal' },
    { family: 'Inter', weight: 700, style: 'normal' },
  ],
  /** Display swap for faster text rendering */
  display: 'swap' as const,
  /** Subset to reduce font file size */
  subsets: ['latin', 'latin-ext'] as const,
  /** Fallback fonts to reduce CLS */
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
};

// ── Export full merged config with bundle analyzer ──────────────────────────

/**
 * Get the complete performance-optimized Next.js config
 * Use: export default getPerformanceConfig()
 */
export function getPerformanceConfig(): NextConfig {
  return withBundleAnalyzer(performanceConfig);
}
