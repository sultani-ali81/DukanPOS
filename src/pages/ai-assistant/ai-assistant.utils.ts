import { extractError } from "@/lib/error";
import { AiAssistantStreamError } from "@/queries/ai-assistant";
import type {
  AiAssistantToolEventData,
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

export function getAssistantErrorMessage(error: unknown) {
  if (error instanceof AiAssistantStreamError) {
    return error.message || "Failed to get assistant response.";
  }

  if (isAxiosError(error)) {
    let fallback = "Failed to get assistant response.";

    switch (error.response?.status) {
      case 400:
        fallback = "Question is required.";
        break;
      case 401:
      case 403:
        fallback = "You are not authorized.";
        break;
      case 404:
        fallback = "The requested assistant conversation was not found.";
        break;
      case 503:
        fallback = "AI assistant is currently unavailable.";
        break;
    }

    return extractError(error, fallback);
  }

  return extractError(error, "Failed to get assistant response.");
}

export function getToolActivityLabel(toolName: string) {
  const normalizedName = toolName.toLowerCase();

  if (normalizedName.includes("dashboard")) return "Checking dashboard…";
  if (
    normalizedName.includes("product") ||
    normalizedName.includes("inventory") ||
    normalizedName.includes("stock")
  ) {
    return "Searching products…";
  }
  if (
    normalizedName.includes("sale") ||
    normalizedName.includes("profit") ||
    normalizedName.includes("revenue") ||
    normalizedName.includes("cashier") ||
    normalizedName.includes("payment") ||
    normalizedName.includes("order")
  ) {
    return "Analyzing sales…";
  }

  return "Analyzing store data…";
}

export function getActiveToolActivityLabel(
  activities: Record<string, AiAssistantToolEventData>,
) {
  const toolActivities = Object.values(activities);

  for (let index = toolActivities.length - 1; index >= 0; index -= 1) {
    const activity = toolActivities[index];
    if (activity.status === "started") {
      return getToolActivityLabel(activity.toolName);
    }
  }

  return null;
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
