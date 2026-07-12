import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AiChatThreadSummary } from "@/types/ai-assistant";
import { Bot, Loader2, Send, Square } from "lucide-react";
import type { RefObject } from "react";
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
}: ConversationPanelProps) {
  return (
    <Card className="min-h-0 gap-0 border border-border py-0">
      <CardHeader className="h-[72px] shrink-0 border-b border-border px-4 py-4">
        <div className="flex h-full items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <Bot className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selectedThread ? getThreadTitle(selectedThread) : "New chat"}
            </span>
          </CardTitle>

          <Badge variant={isStreaming ? "outline" : "secondary"}>
            {isStreaming ? "Streaming" : "Ready"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div
          ref={messagesContainerRef}
          onScroll={onMessagesScroll}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5"
        >
          {threadLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
          className="shrink-0 border-t border-border bg-white p-4 pb-5"
        >
          {inlineError ? (
            <p className="mb-2 text-sm text-destructive">{inlineError}</p>
          ) : null}

          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder="Ask about sales, profit, stock, or cashier performance..."
              disabled={isStreaming || threadLoading}
              className="max-h-32 min-h-12 resize-none bg-white"
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
        </form>
      </CardContent>
    </Card>
  );
}
