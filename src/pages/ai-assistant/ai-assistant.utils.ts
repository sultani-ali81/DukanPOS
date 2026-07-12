import { AiAssistantStreamError } from "@/queries/ai-assistant";
import type {
  AiChatMessage,
  AiChatRole,
  AiChatThreadSummary,
} from "@/types/ai-assistant";
import { isAxiosError } from "axios";

export type UiChatMessage = Omit<AiChatMessage, "status"> & {
  status?: "completed" | "failed" | "streaming" | "stopped";
  local?: boolean;
};

function createMessageId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createLocalMessage(
  role: AiChatRole,
  content: string,
  status: UiChatMessage["status"] = "completed",
): UiChatMessage {
  const timestamp = new Date().toISOString();

  return {
    id: createMessageId(),
    role,
    content,
    status,
    errorMessage: null,
    model: null,
    provider: null,
    metadata: null,
    createdAt: timestamp,
    updatedAt: timestamp,
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

export function getVisibleAssistantText(rawText: string) {
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

export function getAssistantErrorMessage(error: unknown) {
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

export function formatThreadTime(value?: string) {
  if (!value) return "No messages yet";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getThreadTitle(thread: AiChatThreadSummary) {
  return thread.title?.trim() || "Untitled chat";
}
