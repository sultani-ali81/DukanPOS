import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bot,
  Boxes,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UiChatMessage } from "../ai-assistant.utils";
import { AiAssistantChart } from "./ai-assistant-chart";
import { CustomerInsights } from "./customer-insights";

function ReportAttachments({
  attachments,
  generatingTitle,
}: Pick<UiChatMessage, "attachments"> & {
  generatingTitle?: string;
}) {
  const reports = attachments?.filter((attachment) =>
    attachment.mimeType.toLowerCase().includes("pdf"),
  );

  if (!generatingTitle && !reports?.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {generatingTitle ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-md border border-border/70 bg-background/70 px-2.5 py-2 text-xs text-muted-foreground"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="truncate">{generatingTitle}</span>
        </div>
      ) : null}

      {reports?.map((attachment) => (
        <div
          key={attachment.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/15 bg-background/80 px-2.5 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-foreground">
                {attachment.fileName}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                PDF report
              </span>
            </span>
          </div>

          <Button asChild variant="outline" size="xs">
            <a
              href={attachment.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open report ${attachment.fileName}`}
            >
              <ExternalLink className="size-3" />
              Open report
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}

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
  toolActivity,
}: {
  message: UiChatMessage;
  toolActivity?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const isUser = message.role === "user";
  const isError = message.status === "failed";
  const isStopped = message.status === "stopped";
  const isStreaming = message.status === "streaming";
  const hasCharts = !isUser && Boolean(message.graphs?.length);
  const customerInsights = isUser ? undefined : message.customers;
  const hasCustomerInsights = Boolean(customerInsights?.length);
  const isGeneratingReport = !isUser && message.pdf?.status === "generating";
  const hasReports = !isUser && Boolean(message.attachments?.length);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);

      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(
        () => setCopied(false),
        1500,
      );
    } catch {
      toast.error("Could not copy message");
    }
  };

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
          "group/message relative min-w-0",
          hasCharts || hasCustomerInsights || hasReports || isGeneratingReport
            ? "w-[calc(100%-2.75rem)] max-w-[960px]"
            : "max-w-[min(720px,85%)]",
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm leading-6 shadow-xs",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-muted/40 text-foreground",
            isError &&
              "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.content ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : null}

          {isStreaming ? (
            <span
              role="status"
              aria-live="polite"
              className={cn(
                "flex items-center gap-2 text-muted-foreground",
                message.content && "mt-2",
              )}
            >
              <Loader2 className="size-4 animate-spin" />
              {toolActivity ??
                (message.content ? "Writing response…" : "Preparing answer…")}
            </span>
          ) : null}

          {isStopped ? (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Stopped
            </p>
          ) : null}

          {isError ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              {message.errorMessage || "Failed to get assistant response."}
            </p>
          ) : null}

          <CustomerInsights customers={customerInsights} />

          {message.graphs?.map((graph, index) => (
            <AiAssistantChart
              key={`${graph.title}-${index}`}
              graph={graph}
            />
          ))}

          <ReportAttachments
            attachments={isUser ? undefined : message.attachments}
            generatingTitle={
              isGeneratingReport
                ? message.pdf?.title
                  ? `Generating ${message.pdf.title}…`
                  : "Generating report…"
                : undefined
            }
          />
        </div>

        {message.content ? (
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={copyMessage}
              aria-label={copied ? "Message copied" : "Copy message"}
              title={copied ? "Copied" : "Copy message"}
              className={cn(
                "text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100 focus-visible:opacity-100",
                copied && "opacity-100",
              )}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
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
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="size-5" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Ask about your store
      </h2>
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
