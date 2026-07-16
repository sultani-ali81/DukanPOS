import api from "@/lib/axios";
import { parseAiAssistantGraph } from "@/lib/ai-assistant-graph";
import { useAuthStore } from "@/lib/store";
import type {
  AiAssistantDoneEventData,
  AiAssistantErrorEventData,
  AiAssistantGraphEventData,
  AiAssistantSseEvent,
  AiAssistantToolCallEventData,
  AiAssistantToolResultEventData,
  AiChatThreadDetail,
  AiChatThreadSummary,
  DeleteAiChatThreadResponse,
  RenameAiChatThreadPayload,
} from "@/types/ai-assistant";

export class AiAssistantStreamError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiAssistantStreamError";
    this.status = status;
  }
}

type AskAssistantSseStreamOptions = {
  question: string;
  threadId?: string;
  onChunk: (content: string) => void;
  onGraph?: (data: AiAssistantGraphEventData) => void;
  onDone: (data: AiAssistantDoneEventData) => void;
  onError: (data: AiAssistantErrorEventData) => void;
  onToolCall: (data: AiAssistantToolCallEventData) => void;
  onToolResult: (data: AiAssistantToolResultEventData) => void;
  signal?: AbortSignal;
};

export const getAiChatThreads = (): Promise<AiChatThreadSummary[]> =>
  api
    .get<AiChatThreadSummary[]>("/ai-assistant/threads", {
      skipAuthErrorHandling: true,
    })
    .then((r) => r.data);

export const getAiChatThread = (
  id: string,
): Promise<AiChatThreadDetail> =>
  api
    .get<AiChatThreadDetail>(`/ai-assistant/threads/${id}`, {
      skipAuthErrorHandling: true,
    })
    .then((r) => r.data);

export const renameAiChatThread = (
  id: string,
  payload: RenameAiChatThreadPayload,
): Promise<AiChatThreadSummary> =>
  api
    .put<AiChatThreadSummary>(`/ai-assistant/threads/${id}`, payload, {
      skipAuthErrorHandling: true,
    })
    .then((r) => r.data);

export const deleteAiChatThread = (
  id: string,
): Promise<DeleteAiChatThreadResponse> =>
  api
    .delete<DeleteAiChatThreadResponse>(`/ai-assistant/threads/${id}`, {
      skipAuthErrorHandling: true,
    })
    .then((r) => r.data);

function getStreamStatusMessage(status: number) {
  if (status === 400) return "Question is required.";
  if (status === 401 || status === 403) return "You are not authorized.";
  if (status === 404) {
    return "The requested assistant conversation was not found.";
  }
  if (status === 503) return "AI assistant is currently unavailable.";
  return "Failed to get assistant response.";
}

function getBackendErrorMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!isRecord(value)) return null;

  const message = value.message;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const messages = message.filter(
      (item): item is string => typeof item === "string" && Boolean(item.trim()),
    );
    if (messages.length) return messages.join(", ");
  }

  return null;
}

async function getHttpErrorMessage(response: Response) {
  const fallback = getStreamStatusMessage(response.status);

  try {
    const responseText = await response.text();
    if (!responseText.trim()) return fallback;

    try {
      return getBackendErrorMessage(JSON.parse(responseText)) ?? fallback;
    } catch {
      return responseText.trim();
    }
  } catch {
    return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidStreamEvent(): AiAssistantSseEvent {
  return {
    event: "error",
    data: {
      threadId: "",
      userMessageId: "",
      message: "Failed to stream assistant response.",
    },
  };
}

function parseEventData(
  eventName: string,
  value: unknown,
): AiAssistantSseEvent | null {
  if (!isRecord(value)) return invalidStreamEvent();

  if (eventName === "chunk") {
    return typeof value.content === "string"
      ? { event: "chunk", data: { content: value.content } }
      : invalidStreamEvent();
  }

  if (eventName === "graph") {
    // The backend currently sends graph fields at the top level. Retain
    // support for the documented wrapper too so in-flight backend versions
    // do not break an already deployed frontend.
    const graph = parseAiAssistantGraph(
      "graph" in value ? value.graph : value,
    );
    return graph
      ? { event: "graph", data: { graph } }
      : invalidStreamEvent();
  }

  if (eventName === "tool-call") {
    return typeof value.toolCallId === "string" &&
      Boolean(value.toolCallId) &&
      typeof value.toolName === "string" &&
      Boolean(value.toolName) &&
      value.status === "started"
      ? {
          event: "tool-call",
          data: {
            toolCallId: value.toolCallId,
            toolName: value.toolName,
            status: value.status,
          },
        }
      : invalidStreamEvent();
  }

  if (eventName === "tool-result") {
    return typeof value.toolCallId === "string" &&
      Boolean(value.toolCallId) &&
      typeof value.toolName === "string" &&
      Boolean(value.toolName) &&
      (value.status === "completed" || value.status === "failed")
      ? {
          event: "tool-result",
          data: {
            toolCallId: value.toolCallId,
            toolName: value.toolName,
            status: value.status,
          },
        }
      : invalidStreamEvent();
  }

  if (eventName === "done") {
    return typeof value.content === "string" &&
      typeof value.threadId === "string" &&
      typeof value.userMessageId === "string" &&
      typeof value.assistantMessageId === "string"
      ? {
          event: "done",
          data: {
            content: value.content,
            threadId: value.threadId,
            userMessageId: value.userMessageId,
            assistantMessageId: value.assistantMessageId,
          },
        }
      : invalidStreamEvent();
  }

  if (eventName === "error") {
    return typeof value.message === "string" &&
      typeof value.threadId === "string" &&
      typeof value.userMessageId === "string"
      ? {
          event: "error",
          data: {
            message: value.message,
            threadId: value.threadId,
            userMessageId: value.userMessageId,
          },
        }
      : invalidStreamEvent();
  }

  return null;
}

export function parseAssistantSseEvent(
  rawEvent: string,
): AiAssistantSseEvent | null {
  const lines = rawEvent.split(/\r\n|\r|\n/);
  let eventName = "";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      const value = line.slice("data:".length);
      dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
    }
  }

  const dataText = dataLines.join("\n");

  if (!eventName || !dataText) return null;

  try {
    const data: unknown = JSON.parse(dataText);
    return parseEventData(eventName, data);
  } catch {
    return invalidStreamEvent();
  }
}

function createSseEventBuffer() {
  let textBuffer = "";
  let eventLines: string[] = [];

  const dispatchBufferedEvent = (events: string[]) => {
    if (!eventLines.length) return;
    events.push(eventLines.join("\n"));
    eventLines = [];
  };

  return {
    push(text: string, flush = false) {
      textBuffer += text;
      const events: string[] = [];

      while (textBuffer.length) {
        let lineEnd = -1;
        let terminatorLength = 0;

        for (let index = 0; index < textBuffer.length; index += 1) {
          const character = textBuffer[index];
          if (character === "\n") {
            lineEnd = index;
            terminatorLength = 1;
            break;
          }

          if (character === "\r") {
            if (index === textBuffer.length - 1 && !flush) break;
            lineEnd = index;
            terminatorLength = textBuffer[index + 1] === "\n" ? 2 : 1;
            break;
          }
        }

        if (lineEnd === -1) break;

        const line = textBuffer.slice(0, lineEnd);
        textBuffer = textBuffer.slice(lineEnd + terminatorLength);

        if (line === "") dispatchBufferedEvent(events);
        else eventLines.push(line);
      }

      if (flush) {
        if (textBuffer) eventLines.push(textBuffer);
        textBuffer = "";
        dispatchBufferedEvent(events);
      }

      return events;
    },
  };
}

export async function askAssistantSseStream({
  question,
  threadId,
  onChunk,
  onGraph,
  onDone,
  onError,
  onToolCall,
  onToolResult,
  signal,
}: AskAssistantSseStreamOptions) {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    throw new AiAssistantStreamError("Question is required.", 400);
  }

  const token = useAuthStore.getState().token;
  if (!token) throw new AiAssistantStreamError("You are not authorized.", 401);

  const response = await fetch(api.getUri({ url: "/ai-assistant/ask" }), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      question: normalizedQuestion,
      ...(threadId ? { threadId } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    throw new AiAssistantStreamError(
      await getHttpErrorMessage(response),
      response.status,
    );
  }

  const stream = response.body;

  if (!stream || typeof stream.getReader !== "function") {
    throw new AiAssistantStreamError(
      "Streaming is not supported by this browser.",
    );
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const eventBuffer = createSseEventBuffer();

  const processRawEvent = (rawEvent: string) => {
    const parsedEvent = parseAssistantSseEvent(rawEvent.trim());
    if (!parsedEvent) return false;

    const { event, data } = parsedEvent;

    if (event === "chunk") {
      onChunk(data.content);
      return false;
    }

    if (event === "graph") {
      onGraph?.(data);
      return false;
    }

    if (event === "tool-call") {
      onToolCall(data);
      return false;
    }

    if (event === "tool-result") {
      onToolResult(data);
      return false;
    }

    if (event === "done") {
      onDone(data);
      return true;
    }

    if (event === "error") {
      onError(data);
      return true;
    }

    return false;
  };

  const processEvents = async (rawEvents: string[]) => {
    for (const rawEvent of rawEvents) {
      if (processRawEvent(rawEvent)) {
        try {
          await reader.cancel();
        } catch {
          // The stream may already be closed by the server.
        }
        return true;
      }
    }

    return false;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const rawEvents = eventBuffer.push(
        decoder.decode(value, { stream: true }),
      );
      if (await processEvents(rawEvents)) return;
    }

    const remainingEvents = eventBuffer.push(decoder.decode(), true);
    if (await processEvents(remainingEvents)) return;

    throw new AiAssistantStreamError(
      "The assistant connection ended before the response completed.",
    );
  } finally {
    reader.releaseLock();
  }
}
