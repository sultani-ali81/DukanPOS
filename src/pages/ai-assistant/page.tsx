import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import {
  askAssistantSseStream,
  deleteAiChatThread,
  getAiChatThread,
  getAiChatThreads,
  renameAiChatThread,
} from "@/queries/ai-assistant";
import type { AiChatThreadSummary } from "@/types/ai-assistant";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
        <ChatHistoryPanel
          threads={threads}
          selectedThreadId={selectedThreadId}
          loading={threadsLoading}
          disabled={isStreaming || threadLoading}
          renamingThreadId={renamingThreadId}
          renameValue={renameValue}
          renameLoading={renameLoading}
          onNewChat={handleNewChat}
          onSelectThread={(threadId) => void loadThread(threadId)}
          onStartRename={startRename}
          onRenameValueChange={setRenameValue}
          onCancelRename={() => setRenamingThreadId(null)}
          onSubmitRename={(threadId) => void submitRename(threadId)}
          onDelete={setDeletingThread}
        />

        <ConversationPanel
          selectedThread={selectedThread}
          messages={messages}
          question={question}
          inlineError={inlineError}
          isStreaming={isStreaming}
          threadLoading={threadLoading}
          textareaRef={textareaRef}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
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
