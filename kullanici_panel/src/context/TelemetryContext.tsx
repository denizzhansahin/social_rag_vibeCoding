import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';
import { queueTelemetry, flushTelemetry } from '../lib/api_client';

interface ScrollMetrics {
  scrollSpeedPxSec: number;
  totalScrollDistance: number;
  fastScrollEvents: number;
}

interface ViewportEvent {
  objectId: string;
  enteredAt: string;
  exitedAt?: string;
  durationMs: number;
  wasInteracted: boolean;
  wasIgnored: boolean;
}

interface SessionTelemetry {
  sessionId: string;
  startedAt: string;
  viewportEvents: ViewportEvent[];
  scrollMetrics: ScrollMetrics;
  totalInteractions: number;
  pageTransitions: number;
}

export interface AppNotification {
  id: string;
  type: 'like' | 'event' | 'system' | 'streak' | 'badge';
  title: string;
  message: string;
  icon: string;
  createdAt: string;
  read: boolean;
}

interface TelemetryContextType {
  sessionId: string;
  trackScroll: (scrollTop: number) => void;
  trackViewportEntry: (objectId: string) => void;
  trackViewportExit: (objectId: string, wasInteracted: boolean) => void;
  trackInteraction: (objectId?: string) => void;
  trackPageTransition: (path: string) => void;
  getSessionMetrics: () => SessionTelemetry;
  flushSessionTelemetry: () => void;
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: number;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const sessionId = useRef(generateSessionId());
  const sessionStart = useRef(new Date().toISOString());
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const viewportMap = useRef<Map<string, { enteredAt: string; timeoutId: NodeJS.Timeout | null }>>(new Map());
  const interactionCount = useRef(0);
  const pageTransitionCount = useRef(0);
  const flushedEvents = useRef<Set<string>>(new Set());

  const scrollMetrics = useRef<ScrollMetrics>({
    scrollSpeedPxSec: 0,
    totalScrollDistance: 0,
    fastScrollEvents: 0,
  });

  const viewportEvents = useRef<ViewportEvent[]>([]);

  // No mock notifications - start empty
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const trackScroll = useCallback((scrollTop: number) => {
    const now = Date.now();
    const dt = now - lastScrollTime.current;
    if (dt > 0) {
      const distance = Math.abs(scrollTop - lastScrollTop.current);
      const speed = (distance / dt) * 1000;

      scrollMetrics.current.scrollSpeedPxSec = Math.round(speed);
      scrollMetrics.current.totalScrollDistance += distance;

      if (speed > 3000) {
        scrollMetrics.current.fastScrollEvents += 1;
      }
    }
    lastScrollTop.current = scrollTop;
    lastScrollTime.current = now;
  }, []);

  const trackViewportEntry = useCallback((objectId: string) => {
    const enteredAt = new Date().toISOString();
    const timeoutId = setTimeout(() => {
      const entry = viewportMap.current.get(objectId);
      if (entry) {
        // Queue "viewed" telemetry after 2s visibility
        queueTelemetry('viewport_view', {
          objectId,
          duration_ms: 2000,
          session_id: sessionId.current,
        });
      }
    }, 2000);

    viewportMap.current.set(objectId, { enteredAt, timeoutId });
  }, []);

  const trackViewportExit = useCallback((objectId: string, wasInteracted: boolean) => {
    const entry = viewportMap.current.get(objectId);
    if (entry) {
      if (entry.timeoutId) clearTimeout(entry.timeoutId);

      const exitedAt = new Date().toISOString();
      const durationMs = new Date(exitedAt).getTime() - new Date(entry.enteredAt).getTime();
      const wasIgnored = !wasInteracted && durationMs >= 2000;

      const event: ViewportEvent = {
        objectId,
        enteredAt: entry.enteredAt,
        exitedAt,
        durationMs,
        wasInteracted,
        wasIgnored,
      };

      viewportEvents.current.push(event);

      // Queue ignored content telemetry
      if (wasIgnored) {
        queueTelemetry('content_ignored', {
          objectId,
          view_duration_ms: durationMs,
          session_id: sessionId.current,
        });
      }

      viewportMap.current.delete(objectId);
    }
  }, []);

  const trackInteraction = useCallback((objectId?: string) => {
    interactionCount.current += 1;
    if (objectId) {
      queueTelemetry('interaction', {
        objectId,
        session_id: sessionId.current,
        timestamp: Date.now(),
      });
    }
  }, []);

  const trackPageTransition = useCallback((path: string) => {
    pageTransitionCount.current += 1;
    queueTelemetry('page_transition', {
      path,
      session_id: sessionId.current,
      timestamp: Date.now(),
    });
  }, []);

  const getSessionMetrics = useCallback((): SessionTelemetry => {
    return {
      sessionId: sessionId.current,
      startedAt: sessionStart.current,
      viewportEvents: viewportEvents.current,
      scrollMetrics: { ...scrollMetrics.current },
      totalInteractions: interactionCount.current,
      pageTransitions: pageTransitionCount.current,
    };
  }, []);

  // Flush session telemetry to backend
  const flushSessionTelemetry = useCallback(async () => {
    const metrics = getSessionMetrics();
    if (metrics.viewportEvents.length === 0 && metrics.totalInteractions === 0) return;

    // Queue session summary
    queueTelemetry('session_summary', {
      session_id: metrics.sessionId,
      total_interactions: metrics.totalInteractions,
      viewport_events: metrics.viewportEvents.length,
      ignored_content: metrics.viewportEvents.filter(e => e.wasIgnored).length,
      scroll_distance: metrics.scrollMetrics.totalScrollDistance,
      fast_scrolls: metrics.scrollMetrics.fastScrollEvents,
      page_transitions: metrics.pageTransitions,
      duration_ms: Date.now() - new Date(metrics.startedAt).getTime(),
    });

    // Flush immediately
    await flushTelemetry();
  }, [getSessionMetrics]);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    setNotifications(prev => [{
      ...notif,
      id: `n-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    }, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  // Flush batch session telemetry every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const metrics = getSessionMetrics();
      if (metrics.totalInteractions > 0 || metrics.viewportEvents.length > 0) {
        // Only flush new events
        const newEvents = metrics.viewportEvents.filter(
          e => !flushedEvents.current.has(e.objectId + e.enteredAt)
        );

        if (newEvents.length > 0) {
          newEvents.forEach(e => {
            flushedEvents.current.add(e.objectId + e.enteredAt);
            queueTelemetry('viewport_exit', {
              objectId: e.objectId,
              duration_ms: e.durationMs,
              was_interacted: e.wasInteracted,
              was_ignored: e.wasIgnored,
              session_id: sessionId.current,
            });
          });
          await flushTelemetry();
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [getSessionMetrics]);

  // Flush on page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      await flushSessionTelemetry();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushSessionTelemetry]);

  return (
    <TelemetryContext.Provider value={{
      sessionId: sessionId.current,
      trackScroll,
      trackViewportEntry,
      trackViewportExit,
      trackInteraction,
      trackPageTransition,
      getSessionMetrics,
      flushSessionTelemetry,
      notifications,
      addNotification,
      markNotificationRead,
      unreadCount,
    }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetryContext() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used within TelemetryProvider');
  }
  return context;
}
