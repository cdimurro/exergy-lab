"use client";

import { useChat } from "@/hooks/useChat";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { AgentProgress } from "./AgentProgress";

export function ChatInterface() {
  const {
    messages,
    isLoading,
    workflowProgress,
    classification,
    error,
    sendMessage,
    clearMessages,
  } = useChat();

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto">
      <header className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Exergy Lab</h1>
            <p className="text-sm text-muted-foreground">
              Multi-agent platform for clean energy R&D
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 text-sm">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <MessageList messages={messages} />

      <AgentProgress progress={workflowProgress} classification={classification} />

      <MessageInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={
          isLoading
            ? "Processing your query..."
            : "Ask about clean energy research..."
        }
      />
    </div>
  );
}
