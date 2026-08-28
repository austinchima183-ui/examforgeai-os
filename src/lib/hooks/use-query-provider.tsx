'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ============================================================================
// ExamForge AI — TanStack Query Provider
// ============================================================================
// Creates and provides a QueryClient instance with sensible defaults
// for the ExamForge AI application. Uses useState to ensure the client
// is only created once per component lifecycle (important for SSR).
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Default QueryClient Options
// ──────────────────────────────────────────────────────────────

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 60 seconds before refetching
        staleTime: 60 * 1000,
        // Unused data is garbage collected after 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed requests up to 2 times with exponential backoff
        retry: 2,
        // Don't refetch on window focus in development (reduces noise)
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        // Use structural sharing for better performance
        structuralSharing: true,
      },
      mutations: {
        // Don't retry mutations by default (they're typically user actions)
        retry: false,
      },
    },
  })
}

// ──────────────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────────────

interface QueryProviderProps {
  children: ReactNode
}

let browserQueryClient: QueryClient | undefined

function getQueryClient(): QueryClient {
  // Server: always make a new query client
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }

  // Browser: make a new client if we don't already have one
  // This is important so we don't re-create a new client on every re-render
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }

  return browserQueryClient
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Using useState to ensure the QueryClient is created only once
  // and survives re-renders. The initial value is a function that
  // returns the QueryClient, which React will only call once.
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
