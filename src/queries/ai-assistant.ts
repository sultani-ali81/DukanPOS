import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import type {
  AiAssistantToolEventData,
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

type AssistantSseEventData = {
  content?: string;
  message?: string;
  threadId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  toolCallId?: string;
  toolName?: string;
  status?: "started" | "completed" | "failed";
};

type AskAssistantSseStreamOptions = {
  question: string;
  threadId?: string;
  onChunk: (content: string) => void;
  onDone: (data: {
    content: string;
    threadId?: string;
    userMessageId?: string;
    assistantMessageId?: string;
  }) => void;
  onError: (data: {
    message: string;
    threadId?: string;
    userMessageId?: string;
  }) => void;
  onToolCall: (data: AiAssistantToolEventData) => void;
  onToolResult: (data: AiAssistantToolEventData) => void;
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
  if (!value || typeof value !== "object") return null;

  const message = (value as Record<string, unknown>).message;
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

export function parseAssistantSseEvent(rawEvent: string) {
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
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid SSE data");
    }

    return {
      eventName,
      data: data as AssistantSseEventData,
    };
  } catch {
    return {
      eventName: "error",
      data: { message: "Failed to stream assistant response." },
    };
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

function isToolEventData(
  data: AssistantSseEventData,
): data is AiAssistantToolEventData {
  return (
    typeof data.toolCallId === "string" &&
    Boolean(data.toolCallId) &&
    typeof data.toolName === "string" &&
    Boolean(data.toolName) &&
    (data.status === "started" ||
      data.status === "completed" ||
      data.status === "failed")
  );
}

export async function askAssistantSseStream({
  question,
  threadId,
  onChunk,
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

    const { eventName, data } = parsedEvent;

    if (eventName === "chunk") {
      onChunk(data.content ?? "");
      return false;
    }

    if (eventName === "tool-call" && isToolEventData(data)) {
      onToolCall(data);
      return false;
    }

    if (eventName === "tool-result" && isToolEventData(data)) {
      onToolResult(data);
      return false;
    }

    if (eventName === "done") {
      onDone({
        content: data.content ?? "",
        threadId: data.threadId,
        userMessageId: data.userMessageId,
        assistantMessageId: data.assistantMessageId,
      });
      return true;
    }

    if (eventName === "error") {
      onError({
        message: data.message ?? "Failed to stream assistant response.",
        threadId: data.threadId,
        userMessageId: data.userMessageId,
      });
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
