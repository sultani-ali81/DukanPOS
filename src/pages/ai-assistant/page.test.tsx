import { useAuthStore } from "@/lib/store";
import type {
  AiChatMessage,
  AiChatThreadDetail,
  AiChatThreadSummary,
} from "@/types/ai-assistant";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChangeEvent, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";
import type { UiChatMessage } from "./ai-assistant.utils";
import AiAssistantPage from "./page";

const queryMocks = vi.hoisted(() => ({
  askAssistantSseStream: vi.fn(),
  deleteAiChatThread: vi.fn(),
  getAiChatThread: vi.fn(),
  getAiChatThreads: vi.fn(),
  renameAiChatThread: vi.fn(),
}));

vi.mock("@/queries/ai-assistant", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/queries/ai-assistant")
  >();

  return {
    ...original,
    ...queryMocks,
  };
});

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => true,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

type ConversationHarnessProps = {
  messages: UiChatMessage[];
  question: string;
  inlineError: string | null;
  isStreaming: boolean;
  toolActivity: string | null;
  selectedThread?: AiChatThreadSummary;
  onQuestionChange: (question: string) => void;
  onSend: () => void;
  onStop: () => void;
  onNewChat: () => void;
};

vi.mock("./components/conversation-panel", () => ({
  ConversationPanel: ({
    messages,
    question,
    inlineError,
    isStreaming,
    toolActivity,
    selectedThread,
    onQuestionChange,
    onSend,
    onStop,
    onNewChat,
  }: ConversationHarnessProps) => (
    <section>
      <output data-testid="selected-thread">
        {selectedThread?.id ?? "new-chat"}
      </output>
      <textarea
        aria-label="Ask the AI assistant"
        value={question}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onQuestionChange(event.target.value)
        }
      />
      <button type="button" onClick={onSend}>
        Send question
      </button>
      <button
        type="button"
        onClick={() => {
          onSend();
          onSend();
        }}
      >
        Send twice synchronously
      </button>
      <button type="button" onClick={onStop}>
        Stop response
      </button>
      <button type="button" onClick={onNewChat}>
        New conversation
      </button>
      {inlineError ? <div role="alert">{inlineError}</div> : null}
      {toolActivity ? <div role="status">{toolActivity}</div> : null}
      <div aria-label="Rendered messages">
        {messages.map((message) => (
          <article
            key={message.id}
            data-testid={`${message.role}-message`}
            data-message-id={message.id}
            data-status={message.status}
          >
            {message.content}
            {message.errorMessage ? (
              <span data-testid="message-error">{message.errorMessage}</span>
            ) : null}
          </article>
        ))}
      </div>
      <output data-testid="streaming-state">
        {isStreaming ? "streaming" : "idle"}
      </output>
    </section>
  ),
}));

type HistoryHarnessProps = {
  threads: AiChatThreadSummary[];
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
};

vi.mock("./components/chat-history-panel", () => ({
  ChatHistoryPanel: ({
    threads,
    onSelectThread,
    onNewChat,
  }: HistoryHarnessProps) => (
    <nav aria-label="Test chat history">
      <button type="button" onClick={onNewChat}>
        History new chat
      </button>
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelectThread(thread.id)}
        >
          Open {thread.id}
        </button>
      ))}
    </nav>
  ),
}));

vi.mock("./components/delete-thread-dialog", () => ({
  DeleteThreadDialog: () => null,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: () => null,
  SheetContent: ({ children }: { children?: ReactNode }) => children,
  SheetTitle: ({ children }: { children?: ReactNode }) => children,
}));

type StreamOptions = Parameters<
  typeof import("@/queries/ai-assistant").askAssistantSseStream
>[0];

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function threadDetail(
  id: string,
  messages: AiChatMessage[] = [],
): AiChatThreadDetail {
  return {
    id,
    title: `Thread ${id}`,
    messages,
  };
}

function renderPage() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }}
    >
      <AiAssistantPage />
    </SWRConfig>,
  );
}

function latestStreamOptions() {
  const calls = queryMocks.askAssistantSseStream.mock.calls;
  return calls[calls.length - 1]?.[0] as StreamOptions;
}

function lastMessage(role: "user" | "assistant") {
  const messages = screen.getAllByTestId(`${role}-message`);
  return messages[messages.length - 1];
}

const existingThread: AiChatThreadSummary = {
  id: "thread-existing",
  title: "Existing conversation",
};

describe("AI assistant page streaming flow", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: "test-token" });
    Object.values(queryMocks).forEach((mock) => mock.mockReset());
    queryMocks.deleteAiChatThread.mockResolvedValue({
      id: "thread-existing",
      message: "Deleted",
    });
    queryMocks.renameAiChatThread.mockResolvedValue(existingThread);
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState({ token: null });
  });

  it("starts a new chat without threadId and applies authoritative done data", async () => {
    const stream = deferred<void>();
    const savedMessages: AiChatMessage[] = [
      {
        id: "saved-user-id",
        role: "user",
        content: "How are sales?",
        status: "completed",
      },
      {
        id: "saved-assistant-id",
        role: "assistant",
        content: "Authoritative answer",
        status: "completed",
      },
    ];

    queryMocks.getAiChatThreads
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        { id: "thread-new", title: "Sales conversation" },
      ]);
    queryMocks.getAiChatThread.mockResolvedValue(
      threadDetail("thread-new", savedMessages),
    );
    queryMocks.askAssistantSseStream.mockImplementation(
      () => stream.promise,
    );

    renderPage();
    await waitFor(() => expect(queryMocks.getAiChatThreads).toHaveBeenCalled());
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Ask the AI assistant"),
      "How are sales?",
    );
    await user.click(screen.getByText("Send question"));

    expect(queryMocks.askAssistantSseStream).toHaveBeenCalledTimes(1);
    const streamOptions = latestStreamOptions();
    expect(streamOptions.question).toBe("How are sales?");
    expect(streamOptions.threadId).toBeUndefined();

    await act(async () => {
      streamOptions.onChunk("Draft response");
    });
    expect(lastMessage("assistant").textContent).toContain("Draft response");

    await act(async () => {
      streamOptions.onDone({
        content: "Authoritative answer",
        threadId: "thread-new",
        userMessageId: "saved-user-id",
        assistantMessageId: "saved-assistant-id",
      });
    });

    expect(lastMessage("assistant").textContent).toContain(
      "Authoritative answer",
    );
    expect(lastMessage("assistant").textContent).not.toContain(
      "Draft response",
    );
    expect(lastMessage("assistant").getAttribute("data-message-id")).toBe(
      "saved-assistant-id",
    );
    expect(lastMessage("user").getAttribute("data-message-id")).toBe(
      "saved-user-id",
    );

    await act(async () => {
      stream.resolve();
      await stream.promise;
    });

    await waitFor(() => {
      expect(queryMocks.getAiChatThreads.mock.calls.length).toBeGreaterThan(1);
      expect(queryMocks.getAiChatThread).toHaveBeenCalledWith("thread-new");
    });
    await waitFor(() =>
      expect(screen.getByTestId("selected-thread").textContent).toBe(
        "thread-new",
      ),
    );
  });

  it("includes the selected threadId when continuing a conversation", async () => {
    const stream = deferred<void>();
    queryMocks.getAiChatThreads.mockResolvedValue([existingThread]);
    queryMocks.getAiChatThread.mockResolvedValue(
      threadDetail("thread-existing", [
        {
          id: "old-assistant",
          role: "assistant",
          content: "Previous answer",
          status: "completed",
        },
      ]),
    );
    queryMocks.askAssistantSseStream.mockImplementation(
      () => stream.promise,
    );

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Open thread-existing"));
    await waitFor(() =>
      expect(queryMocks.getAiChatThread).toHaveBeenCalledWith(
        "thread-existing",
      ),
    );
    await user.type(
      screen.getByLabelText("Ask the AI assistant"),
      "Compare with yesterday",
    );
    await user.click(screen.getByText("Send question"));

    expect(latestStreamOptions().threadId).toBe("thread-existing");
    expect(latestStreamOptions().question).toBe("Compare with yesterday");

    await act(async () => {
      latestStreamOptions().onDone({
        content: "Comparison complete",
        threadId: "thread-existing",
        userMessageId: "continued-user",
        assistantMessageId: "continued-assistant",
      });
      stream.resolve();
      await stream.promise;
    });
  });

  it("blocks two sends invoked synchronously", async () => {
    const stream = deferred<void>();
    queryMocks.getAiChatThreads.mockResolvedValue([]);
    queryMocks.askAssistantSseStream.mockImplementation(
      () => stream.promise,
    );

    renderPage();
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Ask the AI assistant"),
      "Only send once",
    );
    await user.click(screen.getByText("Send twice synchronously"));

    expect(queryMocks.askAssistantSseStream).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("user-message")).toHaveLength(1);

    await act(async () => {
      latestStreamOptions().onDone({
        content: "One answer",
        threadId: "one-thread",
        userMessageId: "one-user",
        assistantMessageId: "one-assistant",
      });
      stream.resolve();
      await stream.promise;
    });
  });

  it("preserves partial text on an SSE error and revalidates list and detail", async () => {
    const stream = deferred<void>();
    const pendingDetail = deferred<AiChatThreadDetail>();
    queryMocks.getAiChatThreads.mockResolvedValue([existingThread]);
    queryMocks.getAiChatThread
      .mockResolvedValueOnce(threadDetail("thread-existing"))
      .mockImplementation(() => pendingDetail.promise);
    queryMocks.askAssistantSseStream.mockImplementation(
      () => stream.promise,
    );

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Open thread-existing"));
    await waitFor(() =>
      expect(queryMocks.getAiChatThread).toHaveBeenCalledTimes(1),
    );
    await user.type(
      screen.getByLabelText("Ask the AI assistant"),
      "Analyze inventory",
    );
    await user.click(screen.getByText("Send question"));
    const streamOptions = latestStreamOptions();

    await act(async () => {
      streamOptions.onChunk("Partial but useful answer");
      streamOptions.onError({
        message: "Provider interrupted the response",
        threadId: "thread-existing",
        userMessageId: "saved-error-user",
      });
    });

    expect(lastMessage("assistant").textContent).toContain(
      "Partial but useful answer",
    );
    expect(lastMessage("assistant").getAttribute("data-status")).toBe(
      "failed",
    );
    expect(lastMessage("user").getAttribute("data-message-id")).toBe(
      "saved-error-user",
    );
    expect(screen.getAllByText("Provider interrupted the response").length).toBeGreaterThan(0);

    await act(async () => {
      stream.resolve();
      await stream.promise;
    });

    await waitFor(() => {
      expect(queryMocks.getAiChatThreads.mock.calls.length).toBeGreaterThan(1);
      expect(queryMocks.getAiChatThread.mock.calls.length).toBeGreaterThan(1);
    });
    expect(lastMessage("assistant").textContent).toContain(
      "Partial but useful answer",
    );
  });

  it("aborts Stop without issuing or retrying another request", async () => {
    let capturedSignal: AbortSignal | undefined;
    queryMocks.getAiChatThreads.mockResolvedValue([]);
    queryMocks.askAssistantSseStream.mockImplementation(
      ({ signal }: StreamOptions) => {
        capturedSignal = signal;
        return new Promise<void>((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
      },
    );

    renderPage();
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Ask the AI assistant"),
      "Stop this response",
    );
    await user.click(screen.getByText("Send question"));
    expect(queryMocks.askAssistantSseStream).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText("Stop response"));

    await waitFor(() =>
      expect(lastMessage("assistant").getAttribute("data-status")).toBe(
        "stopped",
      ),
    );
    expect(capturedSignal?.aborted).toBe(true);
    await act(async () => Promise.resolve());
    expect(queryMocks.askAssistantSseStream).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("streaming-state").textContent).toBe("idle");
  });
});
