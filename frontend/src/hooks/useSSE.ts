import { useEffect, useRef, useState } from "react";
import { SSEEvent } from "@/lib/types";

export function useSSE(url: string | null, onEvent?: (event: SSEEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setError(new Error("SSE connection failed"));
      setIsConnected(false);
    };

    // Handle all event types
    const eventTypes = [
      "workflow_started",
      "agent_progress",
      "partial_result",
      "workflow_completed",
      "workflow_failed",
      "heartbeat",
      "error",
    ];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (onEvent) {
            onEvent({ event: eventType, data });
          }
        } catch (err) {
          console.error(`Failed to parse ${eventType} event:`, err);
        }
      });
    });

    // Cleanup on unmount or URL change
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [url, onEvent]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  return { isConnected, error, disconnect };
}
