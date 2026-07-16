import { extractError } from "@/lib/error";
import { parseAiAssistantGraph } from "@/lib/ai-assistant-graph";
import { AiAssistantStreamError } from "@/queries/ai-assistant";
import type {
  AiAssistantGraph,
  AiAssistantToolEventData,
  AiChatMessage,
  AiChatRole,
  AiChatThreadSummary,
} from "@/types/ai-assistant";
import { isAxiosError } from "axios";

export type UiChatMessage = Omit<AiChatMessage, "status"> & {
  status?: "completed" | "failed" | "streaming" | "stopped";
  local?: boolean;
  graphs?: AiAssistantGraph[];
};

const assistantReasoningPattern = /<think\b[^>]*>[\s\S]*?(?:<\/think\s*>|$)/gi;
const unterminatedReasoningStartPattern = /<think\b[^>]*$/i;
const thinkOpeningTag = "<think";
const thinkClosingTagPattern = /<\/think\s*>/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripNonDisplayControlCharacters(content: string) {
  return Array.from(content)
    .filter((character) => {
      const codePoint = character.codePointAt(0);

      return (
        codePoint === undefined ||
        codePoint === 9 ||
        codePoint === 10 ||
        codePoint === 13 ||
        (codePoint >= 32 && codePoint !== 127)
      );
    })
    .join("");
}

function getTrailingTagPrefix(content: string, marker: string) {
  const normalizedContent = content.toLowerCase();

  for (
    let length = Math.min(marker.length - 1, content.length);
    length > 0;
    length -= 1
  ) {
    if (normalizedContent.endsWith(marker.slice(0, length))) {
      return content.slice(-length);
    }
  }

  return "";
}

function getPendingClosingThinkTag(content: string) {
  const normalizedContent = content.toLowerCase();
  const completeTagStart = normalizedContent.lastIndexOf("</think");

  if (completeTagStart !== -1) {
    const possibleTag = content.slice(completeTagStart);
    if (/^<\/think\s*$/i.test(possibleTag)) return possibleTag;
  }

  return getTrailingTagPrefix(content, "</think");
}

function findThinkOpeningTag(content: string) {
  const normalizedContent = content.toLowerCase();
  let index = normalizedContent.indexOf(thinkOpeningTag);

  while (index !== -1) {
    const followingCharacter = content[index + thinkOpeningTag.length];
    if (
      followingCharacter === undefined ||
      !/[a-z0-9_]/i.test(followingCharacter)
    ) {
      return index;
    }

    index = normalizedContent.indexOf(thinkOpeningTag, index + 1);
  }

  return -1;
}

/**
 * Internal reasoning is not part of the customer-facing assistant response.
 * Applying this to the accumulated stream keeps a block hidden even before
 * its closing tag arrives in a later SSE chunk.
 */
export function stripAssistantReasoning(content: string) {
  const withoutReasoning = content
    .replace(assistantReasoningPattern, "")
    .replace(unterminatedReasoningStartPattern, "");

  const trailingTagPrefix = getTrailingTagPrefix(
    withoutReasoning,
    thinkOpeningTag,
  );

  return stripNonDisplayControlCharacters(
    withoutReasoning.slice(
      0,
      withoutReasoning.length - trailingTagPrefix.length,
    ),
  );
}

/**
 * Filters streamed chunks incrementally. It never releases internal thinking
 * tags or their content, but releases ordinary assistant text as soon as the
 * corresponding chunk arrives.
 */
export function createAssistantChunkSanitizer() {
  let pendingTagFragment = "";
  let isInsideThinkingBlock = false;

  return {
    push(chunk: string) {
      let remainingContent = pendingTagFragment + chunk;
      let visibleContent = "";
      pendingTagFragment = "";

      while (remainingContent) {
        if (isInsideThinkingBlock) {
          const closingTag = thinkClosingTagPattern.exec(remainingContent);

          if (!closingTag || closingTag.index === undefined) {
            pendingTagFragment = getPendingClosingThinkTag(remainingContent);
            break;
          }

          remainingContent = remainingContent.slice(
            closingTag.index + closingTag[0].length,
          );
          isInsideThinkingBlock = false;
          continue;
        }

        const openingTagIndex = findThinkOpeningTag(remainingContent);

        if (openingTagIndex === -1) {
          const trailingTagPrefix = getTrailingTagPrefix(
            remainingContent,
            thinkOpeningTag,
          );
          const visibleLength =
            remainingContent.length - trailingTagPrefix.length;
          visibleContent += remainingContent.slice(0, visibleLength);
          pendingTagFragment = trailingTagPrefix;
          break;
        }

        visibleContent += remainingContent.slice(0, openingTagIndex);
        const openingTagEnd = remainingContent.indexOf(
          ">",
          openingTagIndex + thinkOpeningTag.length,
        );

        if (openingTagEnd === -1) {
          pendingTagFragment = remainingContent.slice(openingTagIndex);
          break;
        }

        isInsideThinkingBlock = true;
        remainingContent = remainingContent.slice(openingTagEnd + 1);
      }

      return stripNonDisplayControlCharacters(visibleContent);
    },
    sanitizeFinal(content: string) {
      return stripAssistantReasoning(content);
    },
  };
}

function getMetadataGraphs(metadata: AiChatMessage["metadata"]) {
  if (!isRecord(metadata)) return undefined;

  if (Array.isArray(metadata.graphs)) {
    const graphs = metadata.graphs
      .map(parseAiAssistantGraph)
      .filter((graph): graph is AiAssistantGraph => graph !== null);

    if (graphs.length) return graphs;
  }

  const graph =
    parseAiAssistantGraph(metadata.graph) ?? parseAiAssistantGraph(metadata);
  return graph ? [graph] : undefined;
}

/**
 * Preserves live graphs through a history refresh and, for an explicit
 * historical-thread load, hydrates valid graphs persisted in message metadata.
 */
export function mergeThreadMessagesWithLiveGraphs(
  currentMessages: UiChatMessage[],
  threadMessages: AiChatMessage[],
  hydrateMetadataGraphs = true,
): UiChatMessage[] {
  const graphsByMessageId = new Map<string, AiAssistantGraph[]>();

  currentMessages.forEach((message) => {
    if (message.role === "assistant" && message.graphs?.length) {
      graphsByMessageId.set(message.id, message.graphs);
    }
  });

  return threadMessages.map((message) => {
    const liveGraphs =
      message.role === "assistant"
        ? graphsByMessageId.get(message.id)
        : undefined;
    const metadataGraphs =
      message.role === "assistant" && hydrateMetadataGraphs
        ? getMetadataGraphs(message.metadata)
        : undefined;
    const graphs = liveGraphs ?? metadataGraphs;

    return {
      ...message,
      content:
        message.role === "assistant"
          ? stripAssistantReasoning(message.content)
          : message.content,
      ...(graphs ? { graphs } : {}),
    };
  });
}

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
      return "Analyzing store data…";
    }
  }

  if (toolActivities.some((activity) => activity.status === "failed")) {
    return "A store data check failed. Continuing…";
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
