import { useState, useCallback } from "react";
import { Message, WorkflowProgress, SSEEvent, ClassificationInfo } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { useSSE } from "./useSSE";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [streamURL, setStreamURL] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null);
  const [classification, setClassification] = useState<ClassificationInfo | null>(null);

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.event) {
      case "workflow_started":
        setWorkflowProgress({
          stage: "initializing",
          agent: "System",
          status: "running",
        });
        break;

      case "agent_progress":
        setWorkflowProgress({
          stage: event.data.stage,
          agent: event.data.agent,
          status: event.data.status,
        });
        break;

      case "partial_result":
        setWorkflowProgress({
          stage: event.data.stage,
          agent: event.data.agent || "Agent",
          status: event.data.status,
          content: event.data.content,
        });
        break;

      case "workflow_completed":
        setWorkflowProgress(null);
        setIsLoading(false);
        // The assistant message will be fetched or streamed separately
        break;

      case "workflow_failed":
        setWorkflowProgress(null);
        setIsLoading(false);
        setError(new Error(event.data.error || "Workflow failed"));
        break;

      case "heartbeat":
        // Keep-alive, no action needed
        break;

      default:
        console.log("Unknown SSE event:", event);
    }
  }, []);

  const { isConnected: isStreaming } = useSSE(streamURL, handleSSEEvent);

  const sendMessage = useCallback(
    async (query: string, preferences?: Record<string, any>) => {
      setIsLoading(true);
      setError(null);
      setWorkflowProgress(null);
      setClassification(null);

      // Add user message immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await apiClient.sendMessage(
          query,
          conversationId || undefined,
          preferences
        );

        setConversationId(response.conversation_id);
        setWorkflowId(response.workflow_id);
        setClassification(response.classification);

        // Start SSE streaming
        const streamUrl = apiClient.getStreamURL(response.workflow_id);
        setStreamURL(streamUrl);

        // Poll for assistant response after workflow completes
        // In production, you might want to get this via SSE or WebSocket
        setTimeout(async () => {
          try {
            // For now, we'll add a placeholder assistant message
            // In production, you'd fetch the actual message from the API
            const assistantMessage: Message = {
              id: response.message_id,
              role: "assistant",
              content: "Processing your query...",
              timestamp: new Date().toISOString(),
              metadata: {
                classification: response.classification,
                workflow_id: response.workflow_id,
              },
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } catch (err) {
            console.error("Failed to fetch assistant message:", err);
          }
        }, 1000);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to send message"));
        setIsLoading(false);
      }
    },
    [conversationId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setWorkflowId(null);
    setStreamURL(null);
    setWorkflowProgress(null);
    setClassification(null);
    setError(null);
  }, []);

  return {
    messages,
    conversationId,
    workflowId,
    isLoading,
    isStreaming,
    error,
    workflowProgress,
    classification,
    sendMessage,
    clearMessages,
  };
}
