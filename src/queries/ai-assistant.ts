import api from "@/lib/axios";
import type {
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

export const askAiAssistant = (
  payload: AskAiAssistantPayload,
): Promise<AiAssistantResponse> =>
  api
    .post<AiAssistantResponse>("/ai-assistant/ask", payload, {
      skipAuthErrorHandling: true,
    })
    .then((r) => r.data);

export async function askAssistantStream(
  question: string,
  token: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`${API_BASE_URL}/ai-assistant/ask/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!response.ok) {
    throw new AiAssistantStreamError(
      `AI stream failed with status ${response.status}`,
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

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }

    const finalChunk = decoder.decode();
    if (finalChunk) onChunk(finalChunk);
  } finally {
    reader.releaseLock();
  }
}
