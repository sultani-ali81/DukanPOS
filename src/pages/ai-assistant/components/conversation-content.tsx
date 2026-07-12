import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UiChatMessage } from "../ai-assistant.utils";
import {
  BarChart3,
  Bot,
  Boxes,
  Loader2,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";

const promptStarters = [
  {
    label: "Today sales",
    question: "How were today's sales?",
    icon: BarChart3,
  },
  {
    label: "Profit trend",
    question: "Compare this week's profit.",
    icon: TrendingUp,
  },
  {
    label: "Stock check",
    question: "Which products are low stock?",
    icon: Boxes,
  },
  {
    label: "Cashiers",
    question: "How did each cashier perform today?",
    icon: UserRoundCheck,
  },
];

export function MessageBubble({
  message,
  onRetry,
}: {
  message: UiChatMessage;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  const isError = message.status === "failed";
  const isStopped = message.status === "stopped";
  const isStreaming = message.status === "streaming";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div
          className={cn(
            "mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg",
            isError
              ? "bg-destructive/10 text-destructive"
              : "bg-primary text-primary-foreground",
          )}
        >
          <Bot className="size-4" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[min(720px,85%)] rounded-lg px-4 py-3 text-sm leading-6 shadow-xs",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-muted/40 text-foreground",
          isError && "border-destructive/30 bg-destructive/10 text-destructive",
        )}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : isStreaming ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Preparing answer...
          </span>
        ) : null}

        {isStopped ? (
          <p className="mt-2 text-xs font-medium text-muted-foreground">Stopped</p>
        ) : null}

        {isError ? (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs font-medium text-destructive">Failed</p>
            {onRetry ? (
              <Button type="button" variant="outline" size="xs" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyChat({
  disabled,
  onSelectPrompt,
}: {
  disabled: boolean;
  onSelectPrompt: (question: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="size-5" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Ask about your store</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Start a saved assistant chat for sales, profit, stock, and cashier
        performance.
      </p>

      <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {promptStarters.map((starter) => {
          const Icon = starter.icon;

          return (
            <Button
              key={starter.question}
              type="button"
              variant="outline"
              className="h-auto justify-start gap-3 whitespace-normal px-3 py-3 text-left"
              disabled={disabled}
              onClick={() => onSelectPrompt(starter.question)}
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span className="font-medium">{starter.label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {starter.question}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
