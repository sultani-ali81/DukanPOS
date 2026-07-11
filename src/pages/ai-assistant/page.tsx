import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  AiAssistantStreamError,
  askAiAssistant,
  askAssistantStream,
} from "@/queries/ai-assistant";
import { isAxiosError } from "axios";
import {
  BarChart3,
  Bot,
  Boxes,
  Loader2,
  Send,
  Sparkles,
  Square,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  tone?: "normal" | "error";
  status?: "streaming" | "stopped";
};

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

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function removeTrailingPartialThinkTag(text: string) {
  const tagPrefixes = ["<think>", "</think>"]
    .flatMap((tag) =>
      Array.from({ length: tag.length - 1 }, (_, index) =>
        tag.slice(0, index + 1),
      ),
    )
    .sort((a, b) => b.length - a.length);

  const lowerText = text.toLowerCase();
  const partialTag = tagPrefixes.find((prefix) =>
    lowerText.endsWith(prefix),
  );

  return partialTag ? text.slice(0, -partialTag.length) : text;
}

function getVisibleAssistantText(rawText: string) {
  const lowerText = rawText.toLowerCase();
  let visibleText = "";
  let cursor = 0;

  while (cursor < rawText.length) {
    const thinkStart = lowerText.indexOf("<think>", cursor);

    if (thinkStart === -1) {
      visibleText += rawText.slice(cursor);
      break;
    }

    visibleText += rawText.slice(cursor, thinkStart);

    const thinkEnd = lowerText.indexOf("</think>", thinkStart + 7);
    if (thinkEnd === -1) break;

    cursor = thinkEnd + 8;
  }

  return removeTrailingPartialThinkTag(visibleText).replace(/^\s+/, "");
}

function getAssistantErrorMessage(error: unknown) {
  if (error instanceof AiAssistantStreamError) {
    switch (error.status) {
      case 400:
        return "Question is required.";
      case 401:
      case 403:
        return "You are not authorized.";
      case 503:
        return "AI assistant is currently unavailable.";
      default:
        return "Failed to get assistant response.";
    }
  }

  if (isAxiosError(error)) {
    switch (error.response?.status) {
      case 400:
        return "Question is required.";
      case 401:
      case 403:
        return "You are not authorized.";
      case 503:
        return "AI assistant is currently unavailable.";
      default:
        return "Failed to get assistant response.";
    }
  }

  return "Failed to get assistant response.";
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isError = message.tone === "error";
  const isStopped = message.status === "stopped";
  const isStreaming = message.status === "streaming";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
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
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Stopped
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const token = useAuthStore((state) => state.token);
  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask me about sales, profit, low stock, or cashier performance. I will keep the answer practical for your store.",
    },
  ]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const updateMessage = (id: string, update: Partial<ChatMessage>) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, ...update } : message,
      ),
    );
  };

  const setMessageContent = (id: string, content: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content } : message,
      ),
    );
  };

  const sendQuestion = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (isStreaming) return;

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setInlineError("Please enter a question.");
      textareaRef.current?.focus();
      return;
    }

    if (!token) {
      setInlineError("You are not authorized.");
      return;
    }

    setInlineError(null);
    setQuestion("");

    const assistantMessageId = createMessageId();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let receivedStreamText = false;
    let rawStreamText = "";

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: "user",
        content: trimmedQuestion,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        status: "streaming",
      },
    ]);
    setIsStreaming(true);

    try {
      await askAssistantStream(
        trimmedQuestion,
        token,
        (chunk) => {
          if (!chunk) return;
          rawStreamText += chunk;
          const visibleText = getVisibleAssistantText(rawStreamText);
          receivedStreamText = visibleText.length > 0;
          setMessageContent(assistantMessageId, visibleText);
        },
        controller.signal,
      );

      updateMessage(
        assistantMessageId,
        receivedStreamText
          ? { status: undefined }
          : {
              content: "I did not receive an answer for that question.",
              status: undefined,
            },
      );
    } catch (error) {
      let responseError = error;

      if (controller.signal.aborted) {
        updateMessage(assistantMessageId, { status: "stopped" });
        return;
      }

      if (
        !receivedStreamText &&
        !(error instanceof AiAssistantStreamError && error.status)
      ) {
        try {
          const response = await askAiAssistant({ question: trimmedQuestion });
          updateMessage(assistantMessageId, {
            content:
              response.answer.trim() ||
              "I did not receive an answer for that question.",
            status: undefined,
          });
          return;
        } catch (fallbackError) {
          responseError = fallbackError;
        }
      }

      const message = getAssistantErrorMessage(responseError);
      setInlineError(message);
      updateMessage(assistantMessageId, {
        content: message,
        tone: "error",
        status: undefined,
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col pb-2">
      <PageHeader
        title="AI Assistant"
        description="A lightweight business analyst for AsanPOS."
      >
        <Badge className="gap-1.5 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <Sparkles className="size-3" />
          Store insights
        </Badge>
      </PageHeader>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="min-h-[560px] gap-0 py-0 lg:min-h-0">
          <CardHeader className="border-b border-border px-4 py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-muted-foreground" />
              AsanPOS Analyst
            </CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(event) => void sendQuestion(event)}
              className="shrink-0 border-t border-border bg-white p-4 pb-5"
            >
              {inlineError ? (
                <p className="mb-2 text-sm text-destructive">{inlineError}</p>
              ) : null}

              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about sales, profit, stock, or cashier performance..."
                  disabled={isStreaming}
                  className="max-h-32 min-h-12 resize-none bg-white"
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-lg"
                    aria-label="Stop response"
                    onClick={stopStreaming}
                  >
                    <Square className="size-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon-lg"
                    disabled={!question.trim()}
                    aria-label="Send question"
                  >
                    <Send className="size-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Ask About</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {promptStarters.map((starter) => {
                const Icon = starter.icon;

                return (
                  <Button
                    key={starter.question}
                    type="button"
                    variant="outline"
                    className="h-auto justify-start gap-3 whitespace-normal px-3 py-2 text-left"
                    disabled={isStreaming}
                    onClick={() => {
                      setQuestion(starter.question);
                      setInlineError(null);
                      textareaRef.current?.focus();
                    }}
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
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Messages</span>
                <Badge variant="secondary">{messages.length}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <Badge variant={isStreaming ? "outline" : "secondary"}>
                  {isStreaming ? "Streaming" : "Ready"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
