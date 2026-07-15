import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  askAssistantSseStream,
  deleteAiChatThread,
  getAiChatThread,
  getAiChatThreads,
  renameAiChatThread,
} from "@/queries/ai-assistant";
import type { AiChatThreadSummary } from "@/types/ai-assistant";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  createLocalMessage,
  getAssistantErrorMessage,
  getThreadTitle,
  getVisibleAssistantText,
  type UiChatMessage,
} from "./ai-assistant.utils";
import { ChatHistoryPanel } from "./components/chat-history-panel";
import { ConversationPanel } from "./components/conversation-panel";
import { DeleteThreadDialog } from "./components/delete-thread-dialog";

const AI_THREADS_KEY = ["ai-chat-threads"] as const;
const EMPTY_THREADS: AiChatThreadSummary[] = [];

export default function AiAssistantPage() {
  const token = useAuthStore((state) => state.token);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [question, setQuestion] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deletingThread, setDeletingThread] =
    useState<AiChatThreadSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.localStorage.getItem("ai-history-collapsed") === "true",
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    data: threadData,
    isLoading: threadsLoading,
    mutate: mutateThreads,
  } = useSWR(AI_THREADS_KEY, () => getAiChatThreads(), {
    onError: (error) => setInlineError(getAssistantErrorMessage(error)),
  });
  const threads = threadData ?? EMPTY_THREADS;

  const { isLoading: threadLoading, isValidating: threadValidating } = useSWR(
    selectedThreadId ? (["ai-chat-thread", selectedThreadId] as const) : null,
    ([, threadId]) => getAiChatThread(threadId),
    {
      revalidateOnFocus: false,
      onSuccess: (thread) => {
        if (isStreaming) return;
        setMessages(
          [...thread.messages].sort((a, b) =>
            (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
          ),
        );
      },
      onError: (error) => setInlineError(getAssistantErrorMessage(error)),
    },
  );
  const isThreadLoading = threadLoading || threadValidating;

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

  useEffect(() => {
    window.localStorage.setItem(
      "ai-history-collapsed",
      String(historyCollapsed),
    );
  }, [historyCollapsed]);

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

    setMobileHistoryOpen(false);
    setSelectedThreadId(null);
    setMessages([]);
    setInlineError(null);
    setQuestion("");
    shouldAutoScrollRef.current = true;
    window.setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const loadThread = (threadId: string) => {
    if (isStreaming) return;

    setMobileHistoryOpen(false);
    setSelectedThreadId(threadId);
    setInlineError(null);
    shouldAutoScrollRef.current = true;
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
      await mutateThreads(
        (current) =>
          current?.map((thread) =>
            thread.id === threadId ? { ...thread, title: name } : thread,
          ),
        { revalidate: false },
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
      await mutateThreads(
        (current) => current?.filter((thread) => thread.id !== threadId),
        { revalidate: false },
      );
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

  const sendQuestion = async (retryQuestion?: string) => {
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

      void mutateThreads();
    } catch (error) {
      if (controller.signal.aborted) {
        updateMessage(activeAssistantMessageId, { status: "stopped" });
        void mutateThreads();
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
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl bg-border p-px">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-[calc(var(--radius-xl)-1px)] bg-white">
        <aside
          className={cn(
            "hidden min-h-0 shrink-0 overflow-hidden border-r border-border transition-[width] duration-200 motion-reduce:transition-none lg:block",
            historyCollapsed ? "w-0 border-r-0" : "w-72 xl:w-80",
          )}
          aria-hidden={historyCollapsed}
        >
          {!historyCollapsed ? (
            <div className="h-full w-72 xl:w-80">
              <ChatHistoryPanel
                className="rounded-bl-[calc(var(--radius-xl)-1px)]"
                threads={threads}
                selectedThreadId={selectedThreadId}
                loading={threadsLoading}
                disabled={isStreaming || isThreadLoading}
                renamingThreadId={renamingThreadId}
                renameValue={renameValue}
                renameLoading={renameLoading}
                onNewChat={handleNewChat}
                onSelectThread={loadThread}
                onStartRename={startRename}
                onRenameValueChange={setRenameValue}
                onCancelRename={() => setRenamingThreadId(null)}
                onSubmitRename={(threadId) => void submitRename(threadId)}
                onDelete={setDeletingThread}
              />
            </div>
          ) : null}
        </aside>

        <ConversationPanel
          className={cn(
            "rounded-b-[calc(var(--radius-xl)-1px)]",
            !historyCollapsed && "lg:rounded-bl-none",
          )}
          selectedThread={selectedThread}
          messages={messages}
          question={question}
          inlineError={inlineError}
          isStreaming={isStreaming}
          threadLoading={isThreadLoading}
          textareaRef={textareaRef}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          historyCollapsed={historyCollapsed}
          onOpenHistory={() => setMobileHistoryOpen(true)}
          onToggleHistory={() => setHistoryCollapsed((collapsed) => !collapsed)}
          onNewChat={handleNewChat}
          onQuestionChange={setQuestion}
          onSelectPrompt={(nextQuestion) => {
            setQuestion(nextQuestion);
            setInlineError(null);
            textareaRef.current?.focus();
          }}
          onSend={(retryQuestion) => void sendQuestion(retryQuestion)}
          onStop={stopStreaming}
          onMessagesScroll={handleMessagesScroll}
        />
      </div>

      <Sheet
        open={mobileHistoryOpen && !isDesktop}
        onOpenChange={setMobileHistoryOpen}
      >
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[min(88vw,320px)] gap-0 p-0 lg:hidden"
        >
          <SheetTitle className="sr-only">Chat history</SheetTitle>
          <ChatHistoryPanel
            threads={threads}
            selectedThreadId={selectedThreadId}
            loading={threadsLoading}
            disabled={isStreaming || isThreadLoading}
            renamingThreadId={renamingThreadId}
            renameValue={renameValue}
            renameLoading={renameLoading}
            onNewChat={handleNewChat}
            onSelectThread={loadThread}
            onStartRename={startRename}
            onRenameValueChange={setRenameValue}
            onCancelRename={() => setRenamingThreadId(null)}
            onSubmitRename={(threadId) => void submitRename(threadId)}
            onDelete={setDeletingThread}
            onClose={() => setMobileHistoryOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <DeleteThreadDialog
        thread={deletingThread}
        loading={deleteLoading}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeletingThread(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
