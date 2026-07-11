import api from "@/lib/axios";
import type {
  AiChatThreadDetail,
  AiChatThreadSummary,
  AiAssistantResponse,
  AskAiAssistantPayload,
} from "@/types/ai-assistant";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
};

type AskAssistantSseStreamOptions = {
  question: string;
  token: string;
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
  signal?: AbortSignal;
};

export const askAiAssistant = (
  payload: AskAiAssistantPayload,
): Promise<AiAssistantResponse> =>
  api
    .post<AiAssistantResponse>("/ai-assistant/ask", payload, {
      skipAuthErrorHandling: true,
    })
    .then((r) => r.data);

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

function getStreamStatusMessage(status: number) {
  if (status === 400) return "Question is required.";
  if (status === 401 || status === 403) return "You are not authorized.";
  if (status === 503) return "AI assistant is currently unavailable.";
  return "Failed to get assistant response.";
}

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split("\n");
  const eventName = lines
    .find((line) => line.startsWith("event:"))
    ?.replace("event:", "")
    .trim();
  const dataText = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace("data:", "").trimStart())
    .join("\n");

  if (!eventName || !dataText) return null;

  try {
    return {
      eventName,
      data: JSON.parse(dataText) as AssistantSseEventData,
    };
  } catch {
    return {
      eventName: "error",
      data: { message: "Failed to stream assistant response." },
    };
  }
}

export async function askAssistantSseStream({
  question,
  token,
  threadId,
  onChunk,
  onDone,
  onError,
  signal,
}: AskAssistantSseStreamOptions) {
  const response = await fetch(`${API_BASE_URL}/ai-assistant/ask/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      ...(threadId ? { threadId } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    throw new AiAssistantStreamError(
      getStreamStatusMessage(response.status),
      response.status,
    );
  }

  if (!response.body) {
    throw new AiAssistantStreamError(
      "Streaming is not supported by this browser.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processRawEvent = (rawEvent: string) => {
    const parsedEvent = parseSseEvent(rawEvent.trim());
    if (!parsedEvent) return false;

    const { eventName, data } = parsedEvent;

    if (eventName === "chunk") {
      onChunk(data.content ?? "");
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

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      const rawEvents = buffer.split("\n\n");
      buffer = rawEvents.pop() ?? "";

      for (const rawEvent of rawEvents) {
        if (processRawEvent(rawEvent)) return;
      }
    }

    buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/g, "\n");
    if (buffer.trim()) processRawEvent(buffer);
  } finally {
    reader.releaseLock();
  }
}
