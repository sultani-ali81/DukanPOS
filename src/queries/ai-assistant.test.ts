import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import {
  AiAssistantStreamError,
  askAssistantSseStream,
  renameAiChatThread,
} from "@/queries/ai-assistant";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const encoder = new TextEncoder();

function sseResponse(chunks: string[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function doneEvent(content = "Finished") {
  return [
    "event: done",
    `data: ${JSON.stringify({
      content,
      threadId: "thread-1",
      userMessageId: "user-message-1",
      assistantMessageId: "assistant-message-1",
    })}`,
    "",
    "",
  ].join("\n");
}

function handlers() {
  return {
    onChunk: vi.fn(),
    onGraph: vi.fn(),
    onToolCall: vi.fn(),
    onToolResult: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
  };
}

function getCapturedRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const [input, init] = fetchMock.mock.calls[0] as [
    RequestInfo | URL,
    RequestInit | undefined,
  ];

  return input instanceof Request ? input : new Request(input, init);
}

describe("AI assistant streaming API", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: "test-jwt-token" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useAuthStore.setState({ token: null });
  });

  it("POSTs a new question with Bearer, JSON, and SSE headers and omits threadId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([doneEvent()]));
    vi.stubGlobal("fetch", fetchMock);

    await askAssistantSseStream({
      question: "How were today's sales?",
      ...handlers(),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = getCapturedRequest(fetchMock);
    expect(new URL(request.url).pathname).toBe("/ai-assistant/ask");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe(
      "Bearer test-jwt-token",
    );
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.headers.get("Accept")).toBe("text/event-stream");
    await expect(request.clone().json()).resolves.toEqual({
      question: "How were today's sales?",
    });
  });

  it("includes threadId when continuing an existing conversation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([doneEvent()]));
    vi.stubGlobal("fetch", fetchMock);

    await askAssistantSseStream({
      question: "Compare that with yesterday",
      threadId: "existing-thread-uuid",
      ...handlers(),
    });

    const request = getCapturedRequest(fetchMock);
    await expect(request.clone().json()).resolves.toEqual({
      question: "Compare that with yesterday",
      threadId: "existing-thread-uuid",
    });
  });

  it("trims the question and rejects an empty value without sending", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([doneEvent()]));
    vi.stubGlobal("fetch", fetchMock);

    await askAssistantSseStream({
      question: "  Analyze sales  ",
      ...handlers(),
    });
    const request = getCapturedRequest(fetchMock);
    await expect(request.clone().json()).resolves.toEqual({
      question: "Analyze sales",
    });

    await expect(
      askAssistantSseStream({ question: "   ", ...handlers() }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Question is required.",
        status: 400,
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses split and multiple SSE events with CRLF and multiline data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        "event: chu",
        'nk\r\ndata: {"content":"Hel',
        'lo"}\r\n\r\nevent: chunk\ndata: {"content":" world"}\n\n',
        "event: done\r\n",
        'data: {"content":"Authoritative response",\r\n',
        'data: "threadId":"thread-1",\r\n',
        'data: "userMessageId":"user-message-1",\r\n',
        'data: "assistantMessageId":"assistant-message-1"}\r\n\r\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = handlers();

    await askAssistantSseStream({
      question: "Analyze sales",
      ...callbacks,
    });

    expect(callbacks.onChunk.mock.calls).toEqual([["Hello"], [" world"]]);
    expect(callbacks.onGraph).not.toHaveBeenCalled();
    expect(callbacks.onDone).toHaveBeenCalledOnce();
    expect(callbacks.onDone).toHaveBeenCalledWith({
      content: "Authoritative response",
      threadId: "thread-1",
      userMessageId: "user-message-1",
      assistantMessageId: "assistant-message-1",
    });
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("reports tool-call and completed or failed tool-result events by toolCallId", async () => {
    const events = [
      "event: tool-call",
      'data: {"toolCallId":"tool-1","toolName":"getDashboardStats","status":"started"}',
      "",
      "event: tool-result",
      'data: {"toolCallId":"tool-1","toolName":"getDashboardStats","status":"completed"}',
      "",
      "event: tool-call",
      'data: {"toolCallId":"tool-2","toolName":"searchProducts","status":"started"}',
      "",
      "event: tool-result",
      'data: {"toolCallId":"tool-2","toolName":"searchProducts","status":"failed"}',
      "",
      doneEvent(),
    ].join("\n");
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([events]));
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = handlers();

    await askAssistantSseStream({
      question: "Check my store",
      ...callbacks,
    });

    expect(callbacks.onToolCall.mock.calls).toEqual([
      [
        {
          toolCallId: "tool-1",
          toolName: "getDashboardStats",
          status: "started",
        },
      ],
      [
        {
          toolCallId: "tool-2",
          toolName: "searchProducts",
          status: "started",
        },
      ],
    ]);
    expect(callbacks.onToolResult.mock.calls).toEqual([
      [
        {
          toolCallId: "tool-1",
          toolName: "getDashboardStats",
          status: "completed",
        },
      ],
      [
        {
          toolCallId: "tool-2",
          toolName: "searchProducts",
          status: "failed",
        },
      ],
    ]);
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(callbacks.onDone).toHaveBeenCalledOnce();
  });

  it("lets done content replace the accumulated draft as authoritative", async () => {
    const response = [
      "event: chunk",
      'data: {"content":"Draft "}',
      "",
      "event: chunk",
      'data: {"content":"answer"}',
      "",
      doneEvent("Complete authoritative answer"),
    ].join("\n");
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([response]));
    vi.stubGlobal("fetch", fetchMock);
    let renderedContent = "";
    const callbacks = handlers();
    callbacks.onChunk.mockImplementation((content: string) => {
      renderedContent += content;
    });
    callbacks.onDone.mockImplementation((data: { content: string }) => {
      renderedContent = data.content;
    });

    await askAssistantSseStream({
      question: "Give me an answer",
      ...callbacks,
    });

    expect(callbacks.onChunk.mock.calls).toEqual([["Draft "], ["answer"]]);
    expect(renderedContent).toBe("Complete authoritative answer");
  });

  it("accepts direct colorless graph payloads from the backend", async () => {
    const graph = {
      type: "line",
      title: "Sales Monthly",
      xAxisLabel: "Date",
      yAxisLabel: "Sales",
      valueFormat: "currency",
      labels: ["2026-07-01", "2026-07-02"],
      datasets: [
        {
          label: "Sales",
          data: [1250, 980],
        },
      ],
    };
    const response = [
      "event: graph",
      `data: ${JSON.stringify(graph)}`,
      "",
      "event: chunk",
      'data: {"content":"Chart summary"}',
      "",
      doneEvent("Chart complete"),
    ].join("\n");
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([response]));
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = handlers();
    const receivedEvents: string[] = [];
    callbacks.onGraph.mockImplementation(() => receivedEvents.push("graph"));
    callbacks.onChunk.mockImplementation(() => receivedEvents.push("chunk"));

    await askAssistantSseStream({
      question: "Show profit",
      ...callbacks,
    });

    expect(callbacks.onGraph).toHaveBeenCalledOnce();
    expect(callbacks.onGraph).toHaveBeenCalledWith({ graph });
    expect(callbacks.onChunk).toHaveBeenCalledWith("Chart summary");
    expect(receivedEvents).toEqual(["graph", "chunk"]);
    expect(callbacks.onDone).toHaveBeenCalledWith({
      content: "Chart complete",
      threadId: "thread-1",
      userMessageId: "user-message-1",
      assistantMessageId: "assistant-message-1",
    });
  });

  it("preserves partial content and reports a terminal SSE error", async () => {
    const response = [
      "event: chunk",
      'data: {"content":"Partial answer"}',
      "",
      "event: error",
      'data: {"threadId":"thread-1","userMessageId":"user-message-1","message":"Provider failed"}',
      "",
      "event: chunk",
      'data: {"content":"must not be delivered"}',
      "",
      doneEvent("must not complete"),
    ].join("\n");
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([response]));
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = handlers();
    let partialContent = "";
    callbacks.onChunk.mockImplementation((content: string) => {
      partialContent += content;
    });

    await askAssistantSseStream({
      question: "Start an answer",
      ...callbacks,
    });

    expect(partialContent).toBe("Partial answer");
    expect(callbacks.onError).toHaveBeenCalledOnce();
    expect(callbacks.onError).toHaveBeenCalledWith({
      threadId: "thread-1",
      userMessageId: "user-message-1",
      message: "Provider failed",
    });
    expect(callbacks.onDone).not.toHaveBeenCalled();
  });

  it("throws the backend JSON message for a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ message: "AI provider API key is unavailable" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = askAssistantSseStream({
      question: "How were today's sales?",
      ...handlers(),
    });

    await expect(promise).rejects.toEqual(
      expect.objectContaining<Partial<AiAssistantStreamError>>({
        name: "AiAssistantStreamError",
        message: "AI provider API key is unavailable",
        status: 503,
      }),
    );
  });

  it("renames a thread with the name field and returns the backend summary", async () => {
    const renamedThread = {
      id: "thread-1",
      title: "Updated conversation",
      lastMessageAt: "2026-07-15T10:00:00.000Z",
      createdAt: "2026-07-15T09:00:00.000Z",
      updatedAt: "2026-07-15T10:01:00.000Z",
    };
    const putSpy = vi.spyOn(api, "put").mockResolvedValue({
      data: renamedThread,
    });

    await expect(
      renameAiChatThread("thread-1", { name: "Updated conversation" }),
    ).resolves.toEqual(renamedThread);
    expect(putSpy).toHaveBeenCalledWith(
      "/ai-assistant/threads/thread-1",
      { name: "Updated conversation" },
      { skipAuthErrorHandling: true },
    );
  });
});
