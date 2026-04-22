import React, { useRef, useCallback, useEffect } from 'react';
import { queueTelemetry, submitEngagement } from '../lib/api_client';

interface TelemetryMetrics {
  seenAt: string | null;
  interactedAt: string | null;
  decisionTimeMs: number | null;
  changedMindCount: number;
  hoverDurationMs: number;
  totalKeystrokes: number;
  backspaceCount: number;
  hesitationPausesGt2s: number;
  totalTypingTimeMs: number | null;
}

export function useTelemetryTracker(objectId: string, objectType: string) {
  const metrics = useRef<TelemetryMetrics>({
    seenAt: null,
    interactedAt: null,
    decisionTimeMs: null,
    changedMindCount: 0,
    hoverDurationMs: 0,
    totalKeystrokes: 0,
    backspaceCount: 0,
    hesitationPausesGt2s: 0,
    totalTypingTimeMs: null,
  });

  const hoverStartTime = useRef<number | null>(null);
  const lastTypingTime = useRef<number | null>(null);
  const typingStartTime = useRef<number | null>(null);

  // Intersection Observer for 'seenAt'
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !metrics.current.seenAt) {
            metrics.current.seenAt = new Date().toISOString();
            console.log(`[Telemetry] Object ${objectId} seen at ${metrics.current.seenAt}`);
          }
        });
      },
      { threshold: 0.8 } // 80% visible
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [objectId]);

  const trackInteraction = useCallback(() => {
    if (!metrics.current.interactedAt) {
      metrics.current.interactedAt = new Date().toISOString();
      if (metrics.current.seenAt) {
        metrics.current.decisionTimeMs = 
          new Date(metrics.current.interactedAt).getTime() - new Date(metrics.current.seenAt).getTime();
      }
    }
  }, []);

  const trackChangeMind = useCallback(() => {
    metrics.current.changedMindCount += 1;
  }, []);

  const onMouseEnter = useCallback(() => {
    hoverStartTime.current = Date.now();
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hoverStartTime.current) {
      metrics.current.hoverDurationMs += Date.now() - hoverStartTime.current;
      hoverStartTime.current = null;
    }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();
    
    if (!typingStartTime.current) {
      typingStartTime.current = now;
    }

    metrics.current.totalKeystrokes += 1;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      metrics.current.backspaceCount += 1;
    }

    if (lastTypingTime.current && (now - lastTypingTime.current > 2000)) {
      metrics.current.hesitationPausesGt2s += 1;
    }

    lastTypingTime.current = now;
  }, []);

  const submitTelemetry = useCallback((action: string, responseData: any, userId?: string) => {
    trackInteraction();
    
    if (typingStartTime.current) {
      metrics.current.totalTypingTimeMs = Date.now() - typingStartTime.current;
    }

    const storedUserId = (() => {
      try {
        return JSON.parse(localStorage.getItem('v_rag_user') || '{}').id || null;
      } catch {
        return null;
      }
    })();

    const input = {
      userId: userId || storedUserId || 'anonymous',
      objectId,
      objectType,
      nature: action === 'ignored' ? 'implicit' : 'explicit',
      action,
      seenAt: metrics.current.seenAt,
      interactedAt: metrics.current.interactedAt,
      responseData,
      behavioralMetrics: {
        decision_time_ms: metrics.current.decisionTimeMs,
        changed_mind_count: metrics.current.changedMindCount,
        hover_duration_ms: metrics.current.hoverDurationMs,
        total_keystrokes: metrics.current.totalKeystrokes,
        backspace_count: metrics.current.backspaceCount,
        hesitation_pauses_gt_2s: metrics.current.hesitationPausesGt2s,
        total_typing_time_ms: metrics.current.totalTypingTimeMs,
      }
    };

    // Production: Submit via API (with offline fallback)
    submitEngagement(input).catch(() => {
      // If submitEngagement fails, queue as telemetry event using a legal Enum
      queueTelemetry('click_reflex', input);
    });

    console.log('[Telemetry] Submitted:', action, objectId);
  }, [objectId, objectType, trackInteraction]);

  return {
    containerRef,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
    trackChangeMind,
    trackInteraction,
    submitTelemetry,
    metrics: metrics.current
  };
}
