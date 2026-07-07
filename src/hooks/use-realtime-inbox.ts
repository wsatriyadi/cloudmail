"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseRealtimeInboxOptions {
  onNewEmails?: (emails: any[]) => void;
  enabled?: boolean;
}

export function useRealtimeInbox({ onNewEmails, enabled = true }: UseRealtimeInboxOptions) {
  const [connected, setConnected] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const since = new Date().toISOString();
    const es = new EventSource(`/api/dashboard/inbox/stream?since=${encodeURIComponent(since)}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          setConnected(true);
        } else if (data.type === "new_emails" && data.emails?.length > 0) {
          setNewCount((prev) => prev + data.emails.length);
          onNewEmails?.(data.emails);
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [enabled, onNewEmails]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  const resetCount = useCallback(() => setNewCount(0), []);

  return { connected, newCount, resetCount };
}
