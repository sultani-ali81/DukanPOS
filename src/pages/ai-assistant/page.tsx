import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  AiAssistantStreamError,
  askAssistantSseStream,
  deleteAiChatThread,
  getAiChatThread,
  getAiChatThreads,
  renameAiChatThread,
} from "@/queries/ai-assistant";
import type {
  AiChatMessage,
  AiChatRole,
  AiChatThreadSummary,
} from "@/types/ai-assistant";
import { isAxiosError } from "axios";
import {
  BarChart3,
  Bot,
  Boxes,
  Clock3,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Square,
  TrendingUp,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

type UiChatMessage = Omit<AiChatMessage, "status"> & {
  status?: "completed" | "failed" | "streaming" | "stopped";
  local?: boolean;
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
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createLocalMessage(
  role: AiChatRole,
  content: string,
  status: UiChatMessage["status"] = "completed",
): UiChatMessage {
  return {
    id: createMessageId(),
    role,
    content,
    status,
    errorMessage: null,
    model: null,
    provider: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    local: true,
  };
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
    return error.message || "Failed to get assistant response.";
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

function formatThreadTime(value?: string) {
  if (!value) return "No messages yet";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getThreadTitle(thread: AiChatThreadSummary) {
  return thread.title?.trim() || "Untitled chat";
}

function MessageBubble({
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

function EmptyChat({
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

export default function AiAssistantPage() {
  const token = useAuthStore((state) => state.token);
  const [question, setQuestion] = useState("");
  const [threads, setThreads] = useState<AiChatThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deletingThread, setDeletingThread] =
    useState<AiChatThreadSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);

    try {
      const data = await getAiChatThreads();
      setThreads(data);
    } catch (error) {
      setInlineError(getAssistantErrorMessage(error));
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadThreads();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadThreads]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const updateMessage = (id: string, update: Partial<UiChatMessage>) => {
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

  const handleNewChat = () => {
    if (isStreaming) return;

    setSelectedThreadId(null);
    setMessages([]);
    setInlineError(null);
    setQuestion("");
    shouldAutoScrollRef.current = true;
    textareaRef.current?.focus();
  };

  const loadThread = async (threadId: string) => {
    if (isStreaming) return;

    setSelectedThreadId(threadId);
    setThreadLoading(true);
    setInlineError(null);
    shouldAutoScrollRef.current = true;

    try {
      const thread = await getAiChatThread(threadId);
      setSelectedThreadId(thread.id);
      setMessages(
        [...thread.messages].sort((a, b) =>
          (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
        ),
      );
    } catch (error) {
      setInlineError(getAssistantErrorMessage(error));
    } finally {
      setThreadLoading(false);
    }
  };

  const startRename = (thread: AiChatThreadSummary) => {
    setRenamingThreadId(thread.id);
    setRenameValue(getThreadTitle(thread));
  };

  const submitRename = async (threadId: string) => {
    const name = renameValue.trim();
    if (!name || renameLoading) return;

    setRenameLoading(true);
    try {
      await renameAiChatThread(threadId, { name });
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId ? { ...thread, title: name } : thread,
        ),
      );
      setRenamingThreadId(null);
      toast.success("Conversation renamed");
    } catch (error) {
      toast.error("Could not rename conversation", {
        description: getAssistantErrorMessage(error),
      });
    } finally {
      setRenameLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingThread || deleteLoading) return;

    const threadId = deletingThread.id;
    setDeleteLoading(true);
    try {
      await deleteAiChatThread(threadId);
      setThreads((current) => current.filter((thread) => thread.id !== threadId));
      if (selectedThreadId === threadId) handleNewChat();
      setDeletingThread(null);
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Could not delete conversation", {
        description: getAssistantErrorMessage(error),
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const sendQuestion = async (
    event?: FormEvent<HTMLFormElement>,
    retryQuestion?: string,
  ) => {
    event?.preventDefault();
    if (isStreaming) return;

    const trimmedQuestion = (retryQuestion ?? question).trim();
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

    const userMessage = createLocalMessage("user", trimmedQuestion);
    const assistantMessage = createLocalMessage("assistant", "", "streaming");
    const assistantMessageId = assistantMessage.id;
    const userMessageId = userMessage.id;
    const controller = new AbortController();
    const streamThreadId = selectedThreadId;
    abortControllerRef.current = controller;

    let activeUserMessageId = userMessageId;
    let activeAssistantMessageId = assistantMessageId;
    let receivedStreamText = false;
    let rawStreamText = "";
    let streamEventFailed = false;

    setMessages((current) => [...current, userMessage, assistantMessage]);
    shouldAutoScrollRef.current = true;
    setIsStreaming(true);

    try {
      await askAssistantSseStream({
        question: trimmedQuestion,
        token,
        threadId: streamThreadId ?? undefined,
        onChunk: (chunk) => {
          if (!chunk) return;
          rawStreamText += chunk;
          const visibleText = getVisibleAssistantText(rawStreamText);
          receivedStreamText = visibleText.length > 0;
          setMessageContent(activeAssistantMessageId, visibleText);
        },
        onDone: ({
          content,
          threadId,
          userMessageId: savedUserMessageId,
          assistantMessageId: savedAssistantMessageId,
        }) => {
          const visibleText = getVisibleAssistantText(content);
          receivedStreamText = visibleText.length > 0;

          if (threadId) setSelectedThreadId(threadId);

          updateMessage(activeUserMessageId, {
            id: savedUserMessageId ?? activeUserMessageId,
            status: "completed",
            local: false,
          });
          updateMessage(activeAssistantMessageId, {
            id: savedAssistantMessageId ?? activeAssistantMessageId,
            content: visibleText,
            status: "completed",
            local: false,
          });
          activeUserMessageId = savedUserMessageId ?? activeUserMessageId;
          activeAssistantMessageId =
            savedAssistantMessageId ?? activeAssistantMessageId;
        },
        onError: ({ message, threadId, userMessageId: savedUserMessageId }) => {
          streamEventFailed = true;
          setInlineError(message);
          if (threadId) setSelectedThreadId(threadId);

          updateMessage(activeUserMessageId, {
            id: savedUserMessageId ?? activeUserMessageId,
            status: "completed",
            local: false,
          });
          updateMessage(activeAssistantMessageId, {
            ...(!receivedStreamText ? { content: message } : {}),
            status: "failed",
            errorMessage: message,
          });
          activeUserMessageId = savedUserMessageId ?? activeUserMessageId;
        },
        signal: controller.signal,
      });

      if (!streamEventFailed && !receivedStreamText) {
        updateMessage(activeAssistantMessageId, {
          content: "I did not receive an answer for that question.",
          status: "completed",
        });
      }

      void loadThreads();
    } catch (error) {
      if (controller.signal.aborted) {
        updateMessage(activeAssistantMessageId, { status: "stopped" });
        void loadThreads();
        return;
      }

      const message = getAssistantErrorMessage(error);
      setInlineError(message);
      updateMessage(activeAssistantMessageId, {
        ...(!receivedStreamText ? { content: message } : {}),
        status: "failed",
        errorMessage: message,
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

  const handleMessagesScroll = () => {
    const element = messagesContainerRef.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  };

  const selectedThread = selectedThreadId
    ? threads.find((thread) => thread.id === selectedThreadId)
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pb-2">
      <PageHeader
        title="AI Assistant"
        description="Saved business chats for AsanPOS insights."
      >
        <Badge className="gap-1.5 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <Sparkles className="size-3" />
          Store analyst
        </Badge>
      </PageHeader>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(160px,35%)_minmax(0,1fr)] gap-4 md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="min-h-0 gap-0 border border-border py-0">
          <CardHeader className="h-[72px] shrink-0 border-b border-border px-4 py-4">
            <div className="flex h-full items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-muted-foreground" />
                Chats
              </CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={handleNewChat}
                disabled={isStreaming || threadLoading}
              >
                <Plus className="size-4" />
                New
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3">
              {threadsLoading ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading chats...
                </div>
              ) : null}

              {!threadsLoading && threads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
                  No saved chats yet.
                </div>
              ) : null}

              {threads.map((thread) => {
                const active = thread.id === selectedThreadId;

                return (
                  <div
                    key={thread.id}
                    className={cn(
                      "group flex items-center rounded-lg transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted",
                      (isStreaming || threadLoading) &&
                        "cursor-not-allowed opacity-60",
                    )}
                  >
                    {renamingThreadId === thread.id ? (
                      <form
                        className="flex min-w-0 flex-1 items-center gap-1 p-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submitRename(thread.id);
                        }}
                      >
                        <Input
                          autoFocus
                          value={renameValue}
                          maxLength={120}
                          disabled={renameLoading}
                          aria-label="Conversation title"
                          className="h-8 bg-white text-foreground"
                          onChange={(event) => setRenameValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setRenamingThreadId(null);
                          }}
                          onBlur={() => {
                            if (!renameLoading) setRenamingThreadId(null);
                          }}
                        />
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isStreaming || threadLoading}
                          onClick={() => void loadThread(thread.id)}
                          className="min-w-0 flex-1 px-3 py-2 text-left"
                        >
                          <span className="block truncate text-sm font-medium">
                            {getThreadTitle(thread)}
                          </span>
                          <span
                            className={cn(
                              "mt-1 flex items-center gap-1 text-xs",
                              active
                                ? "text-primary-foreground/75"
                                : "text-muted-foreground",
                            )}
                          >
                            <Clock3 className="size-3" />
                            {formatThreadTime(thread.lastMessageAt)}
                          </span>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${getThreadTitle(thread)}`}
                              disabled={isStreaming || threadLoading}
                              className={cn(
                                "mr-1 shrink-0 opacity-70 hover:opacity-100",
                                active && "text-primary-foreground hover:bg-white/15 hover:text-primary-foreground",
                              )}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => startRename(thread)}>
                              <Pencil /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeletingThread(thread)}
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

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
              onScroll={handleMessagesScroll}
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5"
            >
              {threadLoading ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading chat...
                </div>
              ) : messages.length === 0 ? (
                <EmptyChat
                  disabled={isStreaming}
                  onSelectPrompt={(nextQuestion) => {
                    setQuestion(nextQuestion);
                    setInlineError(null);
                    textareaRef.current?.focus();
                  }}
                />
              ) : (
                messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onRetry={
                      message.status === "failed" &&
                      index > 0 &&
                      messages[index - 1]?.role === "user"
                        ? () =>
                            void sendQuestion(
                              undefined,
                              messages[index - 1].content,
                            )
                        : undefined
                    }
                  />
                ))
              )}
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
                  disabled={isStreaming || threadLoading}
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
      </div>

      <AlertDialog
        open={deletingThread !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeletingThread(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes “{deletingThread ? getThreadTitle(deletingThread) : "this conversation"}” and its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteLoading}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
