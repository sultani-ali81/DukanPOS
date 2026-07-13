import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiChatThreadSummary } from "@/types/ai-assistant";
import {
  Bot,
  History,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { getThreadTitle, type UiChatMessage } from "../ai-assistant.utils";
import { EmptyChat, MessageBubble } from "./conversation-content";

type ConversationPanelProps = {
  selectedThread?: AiChatThreadSummary;
  messages: UiChatMessage[];
  question: string;
  inlineError: string | null;
  isStreaming: boolean;
  threadLoading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onQuestionChange: (question: string) => void;
  onSelectPrompt: (question: string) => void;
  onSend: (question?: string) => void;
  onStop: () => void;
  onMessagesScroll: () => void;
  onOpenHistory: () => void;
  onToggleHistory: () => void;
  onNewChat: () => void;
  historyCollapsed: boolean;
  className?: string;
};

export function ConversationPanel({
  selectedThread,
  messages,
  question,
  inlineError,
  isStreaming,
  threadLoading,
  textareaRef,
  messagesContainerRef,
  messagesEndRef,
  onQuestionChange,
  onSelectPrompt,
  onSend,
  onStop,
  onMessagesScroll,
  onOpenHistory,
  onToggleHistory,
  onNewChat,
  historyCollapsed,
  className,
}: ConversationPanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onOpenHistory}
            aria-label="Open chat history"
          >
            <History className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={onToggleHistory}
            aria-label={
              historyCollapsed ? "Show chat history" : "Hide chat history"
            }
            aria-expanded={!historyCollapsed}
          >
            {historyCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                AI Assistant
              </p>
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                {selectedThread ? getThreadTitle(selectedThread) : "New chat"}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={isStreaming ? "outline" : "secondary"}
            className="hidden gap-1.5 sm:inline-flex"
          >
            <Sparkles className="size-3" />
            {isStreaming ? "Streaming" : "Ready"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isStreaming || threadLoading}
            onClick={onNewChat}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </div>
      </header>

      <div
        ref={messagesContainerRef}
        onScroll={onMessagesScroll}
        aria-busy={threadLoading || isStreaming}
        aria-label="Conversation messages"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-5"
      >
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-5">
          {threadLoading ? (
            <div
              role="status"
              className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <EmptyChat disabled={isStreaming} onSelectPrompt={onSelectPrompt} />
          ) : (
            messages.map((message, index) => {
              const previousMessage = messages[index - 1];
              const retryQuestion =
                message.status === "failed" && previousMessage?.role === "user"
                  ? previousMessage.content
                  : undefined;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onRetry={
                    retryQuestion ? () => onSend(retryQuestion) : undefined
                  }
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
        className="shrink-0 overflow-hidden rounded-b-[inherit] border-t border-border bg-background px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4"
      >
        <div className="mx-auto w-full max-w-4xl">
          {inlineError ? (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {inlineError}
            </p>
          ) : null}

          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  onSend();
                }
              }}
              aria-label="Ask the AI assistant"
              placeholder="Ask about sales, profit, stock, or cashier performance..."
              disabled={isStreaming || threadLoading}
              className="max-h-32 min-h-12 resize-none rounded-xl bg-background"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="destructive"
                size="icon-lg"
                aria-label="Stop response"
                onClick={onStop}
              >
                <Square className="size-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-lg"
                disabled={!question.trim() || threadLoading}
                aria-label="Send question"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
