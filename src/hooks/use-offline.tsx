'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OfflineState {
  /** Whether the user is currently offline */
  isOffline: boolean;
  /** Timestamp of when the user was last online */
  lastOnlineAt: Date | null;
  /** Whether the user was offline at any point during this session */
  wasOffline: boolean;
  /** Timestamp of when the user came back online (null if still offline or never went offline) */
  backOnlineAt: Date | null;
}

export interface OfflineReturn extends OfflineState {
  /** Manually check online status */
  checkOnline: () => boolean;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export const OFFLINE_EVENTS = {
  STATUS_CHANGED: 'examforge:offline:status-changed',
  BACK_ONLINE: 'examforge:offline:back-online',
  WENT_OFFLINE: 'examforge:offline:went-offline',
} as const;

// ─── useOffline Hook ─────────────────────────────────────────────────────────

export function useOffline(): OfflineReturn {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return !navigator.onLine;
  });

  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(() => {
    if (typeof navigator === 'undefined' || !navigator.onLine) return null;
    return new Date();
  });

  const [wasOffline, setWasOffline] = useState(false);
  const [backOnlineAt, setBackOnlineAt] = useState<Date | null>(null);

  const prevStateRef = useRef(isOffline);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      setLastOnlineAt(new Date());
      setBackOnlineAt(new Date());
      setWasOffline(true);

      // Dispatch custom events for other parts of the app
      window.dispatchEvent(new CustomEvent(OFFLINE_EVENTS.BACK_ONLINE, {
        detail: { timestamp: new Date() },
      }));
      window.dispatchEvent(new CustomEvent(OFFLINE_EVENTS.STATUS_CHANGED, {
        detail: { isOffline: false, timestamp: new Date() },
      }));

      // Trigger sync event for service worker / data sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC',
          timestamp: Date.now(),
        });
      }
    }

    function handleOffline() {
      setIsOffline(true);
      setWasOffline(true);
      setBackOnlineAt(null);

      window.dispatchEvent(new CustomEvent(OFFLINE_EVENTS.WENT_OFFLINE, {
        detail: { timestamp: new Date() },
      }));
      window.dispatchEvent(new CustomEvent(OFFLINE_EVENTS.STATUS_CHANGED, {
        detail: { isOffline: true, timestamp: new Date() },
      }));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Track previous state for transitions
  useEffect(() => {
    prevStateRef.current = isOffline;
  }, [isOffline]);

  const checkOnline = useCallback(() => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOffline(!online);
    return online;
  }, []);

  return {
    isOffline,
    lastOnlineAt,
    wasOffline,
    backOnlineAt,
    checkOnline,
  };
}

// ─── OfflineBanner Component ─────────────────────────────────────────────────

export interface OfflineBannerProps {
  className?: string;
  /** Custom message to show when offline */
  message?: string;
  /** Custom message when back online */
  backOnlineMessage?: string;
  /** How long to show the "back online" message in ms (default: 3000) */
  backOnlineDuration?: number;
}

export function OfflineBanner({
  className,
  message = 'You are offline. Changes will be saved locally and synced when you reconnect.',
  backOnlineMessage = 'Back online! Syncing your changes...',
  backOnlineDuration = 3000,
}: OfflineBannerProps) {
  const { isOffline, backOnlineAt } = useOffline();
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (backOnlineAt) {
      // Schedule via microtask to avoid sync setState in effect
      const timer = setTimeout(() => {
        setShowBackOnline(true);
      }, 0);
      const hideTimer = setTimeout(() => {
        setShowBackOnline(false);
      }, backOnlineDuration);
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [backOnlineAt, backOnlineDuration]);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all ${
        isOffline
          ? 'bg-yellow-500 text-yellow-950'
          : 'bg-green-500 text-green-950'
      } ${className ?? ''}`}
      role="alert"
      aria-live="polite"
    >
      {isOffline ? message : backOnlineMessage}
    </div>
  );
}
