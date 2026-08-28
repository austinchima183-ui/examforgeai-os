'use client';

// ============================================================================
// ExamForge AI — AI Copilot Provider
// ============================================================================
// A wrapper component that provides React Context for the AI Copilot,
// allowing any component in the tree to trigger copilot actions via
// the `useAiCopilot()` hook.
// ============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { AiCopilot } from '@/components/ai/ai-copilot';

// ──────────────────────────────────────────────────────────────
// Context Types
// ──────────────────────────────────────────────────────────────

interface AiCopilotContextValue {
  /** Whether the copilot panel is currently open */
  isOpen: boolean;
  /** Open the copilot panel */
  openCopilot: () => void;
  /** Close the copilot panel */
  closeCopilot: () => void;
  /** Toggle the copilot panel */
  toggleCopilot: () => void;
  /** Send a message directly to the copilot (opens it if closed) */
  sendMessage: (text: string) => void;
  /** Ask a question on a specific topic (opens the copilot if closed) */
  askQuestion: (topic: string) => void;
}

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

const AiCopilotContext = createContext<AiCopilotContextValue | null>(null);

// ──────────────────────────────────────────────────────────────
// Provider Props
// ──────────────────────────────────────────────────────────────

interface AiCopilotProviderProps {
  children: ReactNode;
  /** Whether to show the copilot for unauthenticated users (default: false) */
  showForAnonymous?: boolean;
}

// ──────────────────────────────────────────────────────────────
// Provider Component
// ──────────────────────────────────────────────────────────────

export function AiCopilotProvider({
  children,
  showForAnonymous = false,
}: AiCopilotProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const pendingMessageRef = useRef<string | null>(null);

  // ── Open / Close / Toggle ──
  const openCopilot = useCallback(() => setIsOpen(true), []);
  const closeCopilot = useCallback(() => setIsOpen(false), []);
  const toggleCopilot = useCallback(() => setIsOpen((prev) => !prev), []);

  // ── Send message ──
  // Since we can't directly inject messages into the AiCopilot's internal
  // state from outside, we use a pending message pattern: set a ref, open
  // the copilot, and the copilot reads the ref on mount. The copilot component
  // itself handles the actual send via its internal chat state.
  const sendMessage = useCallback(
    (text: string) => {
      pendingMessageRef.current = text;
      setIsOpen(true);
    },
    []
  );

  // ── Ask question on a topic ──
  const askQuestion = useCallback(
    (topic: string) => {
      const question = `Tell me about ${topic}`;
      pendingMessageRef.current = question;
      setIsOpen(true);
    },
    []
  );

  // ── Auto-send pending message when copilot opens ──
  // We use a custom event to communicate with the AiCopilot component
  useEffect(() => {
    if (isOpen && pendingMessageRef.current) {
      const message = pendingMessageRef.current;
      pendingMessageRef.current = null;

      // Dispatch a custom event that the AiCopilot can listen to
      // This is a clean pattern for cross-component communication
      // without prop drilling
      const event = new CustomEvent('examforge:copilot:send', {
        detail: { message },
      });
      window.dispatchEvent(event);
    }
  }, [isOpen]);

  // ── Determine if copilot should be shown ──
  const shouldShowCopilot = isAuthenticated || showForAnonymous;

  // ── Context value ──
  const contextValue: AiCopilotContextValue = {
    isOpen,
    openCopilot,
    closeCopilot,
    toggleCopilot,
    sendMessage,
    askQuestion,
  };

  return (
    <AiCopilotContext.Provider value={contextValue}>
      {children}
      {shouldShowCopilot && (
        <AiCopilot isOpen={isOpen} onOpenChange={setIsOpen} />
      )}
    </AiCopilotContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

/**
 * Access the AI Copilot context from any component within the provider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { openCopilot, sendMessage, askQuestion } = useAiCopilot();
 *
 *   return (
 *     <div>
 *       <button onClick={openCopilot}>Open AI</button>
 *       <button onClick={() => sendMessage('Help me study')}>Quick Study</button>
 *       <button onClick={() => askQuestion('quadratic equations')}>Learn</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAiCopilot(): AiCopilotContextValue {
  const context = useContext(AiCopilotContext);

  if (!context) {
    throw new Error(
      'useAiCopilot must be used within an <AiCopilotProvider>. ' +
        'Wrap your app or layout with <AiCopilotProvider> to enable the AI Copilot.'
    );
  }

  return context;
}

// ──────────────────────────────────────────────────────────────
// Safe Hook (returns null context outside provider)
// ──────────────────────────────────────────────────────────────

/**
 * Safe version of useAiCopilot that returns null instead of throwing
 * when used outside the provider. Useful for optional integration.
 */
export function useAiCopilotSafe(): AiCopilotContextValue | null {
  return useContext(AiCopilotContext);
}

export default AiCopilotProvider;
