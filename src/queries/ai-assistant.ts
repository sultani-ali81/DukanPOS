import api from "@/lib/axios";
import { parseAiAssistantGraph } from "@/lib/ai-assistant-graph";
import { useAuthStore } from "@/lib/store";
import type {
  AiAssistantCustomerInsight,
  AiAssistantCustomerInsightsData,
  AiAssistantDoneEventData,
  AiAssistantErrorEventData,
  AiAssistantAttachment,
  AiAssistantGraphEventData,
  AiAssistantPdfEventData,
  AiAssistantSseEvent,
  AiAssistantToolEventData,
  AiAssistantToolCallEventData,
  AiAssistantToolResultEventData,
  AiAssistantToolStatus,
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
  /** PDF-generation progress and ready report attachments. */
  onPdf?: (data: AiAssistantPdfEventData) => void;
  /** Latest backend progress event (`event: tool`). */
  onTool?: (data: AiAssistantToolEventData) => void;
  /**
   * Normalized customer tool results, whether they arrive with a tool or
   * final assistant event.
   */
  onCustomerInsights?: (data: AiAssistantCustomerInsightsData) => void;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSafeSignedUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function getOptionalText(value: Record<string, unknown>) {
  return isNonEmptyString(value.message)
    ? value.message
    : isNonEmptyString(value.content)
      ? value.content
      : undefined;
}

function getOptionalTotalCount(value: Record<string, unknown>) {
  return typeof value.totalCount === "number" &&
    Number.isInteger(value.totalCount) &&
    value.totalCount >= 0
    ? value.totalCount
    : undefined;
}

/**
 * Validates a stored report attachment before it is exposed to the chat UI.
 * This is also exported for history metadata, which is untyped at runtime.
 */
export function parseAiAssistantAttachment(
  value: unknown,
): AiAssistantAttachment | null {
  if (!isRecord(value)) return null;

  const { id, fileName, mimeType, signedUrl } = value;
  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(fileName) ||
    !isNonEmptyString(mimeType) ||
    !isNonEmptyString(signedUrl) ||
    !isSafeSignedUrl(signedUrl)
  ) {
    return null;
  }

  return { id, fileName, mimeType, signedUrl };
}

/**
 * Returns `null` for malformed attachment collections so callers never render
 * unvalidated URLs from persisted assistant-message metadata.
 */
export function parseAiAssistantAttachments(
  value: unknown,
): AiAssistantAttachment[] | null {
  if (!Array.isArray(value)) return null;

  const attachments = value.map(parseAiAssistantAttachment);
  return attachments.some((attachment) => attachment === null)
    ? null
    : (attachments as AiAssistantAttachment[]);
}

/**
 * Validates one detailed customer response before exposing it to the message
 * UI. We deliberately require the complete documented base shape so a random
 * object in a tool payload cannot be rendered as a customer card.
 */
export function parseAiAssistantCustomerInsight(
  value: unknown,
): AiAssistantCustomerInsight | null {
  if (!isRecord(value)) return null;

  const id = value.id;
  const name = value.name;
  const phone = value.phone;
  const address = value.address;
  const createdAt = value.createdAt;
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof phone !== "string" ||
    typeof address !== "string" ||
    typeof createdAt !== "string"
  ) {
    return null;
  }

  const saleCount = value.saleCount;
  const salesTotal = value.salesTotal;
  const paidSales = value.paidSales;
  const salesBalance = value.salesBalance;
  const purchaseCount = value.purchaseCount;
  const purchaseTotal = value.purchaseTotal;
  const paidPurchases = value.paidPurchases;
  const purchaseBalance = value.purchaseBalance;
  if (
    !isFiniteNumber(saleCount) ||
    !isFiniteNumber(salesTotal) ||
    !isFiniteNumber(paidSales) ||
    !isFiniteNumber(salesBalance) ||
    !isFiniteNumber(purchaseCount) ||
    !isFiniteNumber(purchaseTotal) ||
    !isFiniteNumber(paidPurchases) ||
    !isFiniteNumber(purchaseBalance)
  ) {
    return null;
  }

  if (value.profit !== undefined && !isFiniteNumber(value.profit)) return null;

  return {
    id,
    name,
    phone,
    address,
    saleCount,
    salesTotal,
    paidSales,
    salesBalance,
    purchaseCount,
    purchaseTotal,
    paidPurchases,
    purchaseBalance,
    ...(isFiniteNumber(value.profit) ? { profit: value.profit } : {}),
    createdAt,
  };
}

function parseCustomerCollection(
  value: unknown,
  totalCount?: number,
): AiAssistantCustomerInsightsData | null {
  if (Array.isArray(value)) {
    const customers = value.map(parseAiAssistantCustomerInsight);
    if (customers.some((customer) => customer === null)) return null;

    return {
      customers: customers as AiAssistantCustomerInsight[],
      ...(totalCount !== undefined ? { totalCount } : {}),
    };
  }

  const customer = parseAiAssistantCustomerInsight(value);
  return customer
    ? {
        customers: [customer],
        ...(totalCount !== undefined ? { totalCount } : {}),
      }
    : null;
}

const CUSTOMER_INSIGHT_KEYS = [
  "customerInsights",
  "customerInsight",
  "customers",
  "customer",
] as const;

const CUSTOMER_INSIGHT_WRAPPER_KEYS = [
  "output",
  "result",
  "data",
  "payload",
  "toolResult",
  "metadata",
] as const;

/**
 * Extracts documented customer-tool data and a small set of intentional
 * compatibility wrappers. It does not perform an unbounded deep search, so
 * unrelated nested objects cannot accidentally become customer insights.
 */
export function extractAiAssistantCustomerInsights(
  value: unknown,
): AiAssistantCustomerInsightsData | undefined {
  const findInsights = (
    candidate: unknown,
    inheritedTotalCount?: number,
    depth = 0,
  ): AiAssistantCustomerInsightsData | undefined => {
    if (!isRecord(candidate) || depth > 2) return undefined;

    const totalCount = getOptionalTotalCount(candidate) ?? inheritedTotalCount;

    for (const key of CUSTOMER_INSIGHT_KEYS) {
      if (!(key in candidate)) continue;
      const parsed = parseCustomerCollection(candidate[key], totalCount);
      if (parsed) return parsed;

      // Some compatible payloads use `customerInsights: { customers, ... }`.
      if (isRecord(candidate[key])) {
        const nested = findInsights(candidate[key], totalCount, depth + 1);
        if (nested) return nested;
      }
    }

    for (const key of CUSTOMER_INSIGHT_WRAPPER_KEYS) {
      if (!(key in candidate)) continue;
      const nested = findInsights(candidate[key], totalCount, depth + 1);
      if (nested) return nested;
    }

    return undefined;
  };

  return findInsights(value);
}

function parseToolStatus(value: unknown): AiAssistantToolStatus | null {
  return value === "started" || value === "completed" || value === "failed"
    ? value
    : null;
}

function parseAiAssistantPdfEvent(
  value: Record<string, unknown>,
): AiAssistantPdfEventData | null {
  if (value.status !== "generating" && value.status !== "ready") return null;

  const title = isNonEmptyString(value.title) ? value.title : undefined;

  if (value.status === "generating") {
    return {
      status: "generating",
      ...(title ? { title } : {}),
    };
  }

  const attachment = parseAiAssistantAttachment(value.attachment);
  return attachment
    ? {
        status: "ready",
        ...(title ? { title } : {}),
        attachment,
      }
    : null;
}

function getToolEventData(
  value: Record<string, unknown>,
  options: { requireCallId: boolean; status?: AiAssistantToolStatus },
): AiAssistantToolEventData | null {
  const toolName = isNonEmptyString(value.toolName)
    ? value.toolName
    : isNonEmptyString(value.name)
      ? value.name
      : null;
  const toolCallId = isNonEmptyString(value.toolCallId)
    ? value.toolCallId
    : options.requireCallId
      ? null
      : toolName;
  const status = parseToolStatus(value.status);

  if (
    !toolName ||
    !toolCallId ||
    !status ||
    (options.status !== undefined && status !== options.status)
  ) {
    return null;
  }

  const message = getOptionalText(value);
  const customerInsights = extractAiAssistantCustomerInsights(value);
  return {
    toolCallId,
    toolName,
    status,
    ...(message ? { message } : {}),
    ...(customerInsights ? { customerInsights } : {}),
  };
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

  if (eventName === "pdf") {
    const data = parseAiAssistantPdfEvent(value);
    return data ? { event: "pdf", data } : invalidStreamEvent();
  }

  if (eventName === "tool") {
    const data = getToolEventData(value, { requireCallId: false });
    return data ? { event: "tool", data } : invalidStreamEvent();
  }

  if (eventName === "tool-call") {
    const data = getToolEventData(value, {
      requireCallId: true,
      status: "started",
    });
    return data?.status === "started"
      ? { event: "tool-call", data: { ...data, status: "started" } }
      : invalidStreamEvent();
  }

  if (eventName === "tool-result") {
    const data = getToolEventData(value, { requireCallId: true });
    if (data?.status === "completed" || data?.status === "failed") {
      return { event: "tool-result", data: { ...data, status: data.status } };
    }

    return invalidStreamEvent();
  }

  if (eventName === "done") {
    const customerInsights = extractAiAssistantCustomerInsights(value);
    const attachments =
      value.attachments === undefined
        ? undefined
        : parseAiAssistantAttachments(value.attachments);
    return typeof value.content === "string" &&
      typeof value.threadId === "string" &&
      typeof value.userMessageId === "string" &&
      typeof value.assistantMessageId === "string" &&
      attachments !== null
      ? {
          event: "done",
          data: {
            content: value.content,
            threadId: value.threadId,
            userMessageId: value.userMessageId,
            assistantMessageId: value.assistantMessageId,
            ...(attachments !== undefined ? { attachments } : {}),
            ...(customerInsights ? { customerInsights } : {}),
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
  onPdf,
  onTool,
  onCustomerInsights,
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

    if (event === "pdf") {
      onPdf?.(data);
      return false;
    }

    if (event === "tool") {
      onTool?.(data);
      if (data.customerInsights) onCustomerInsights?.(data.customerInsights);
      return false;
    }

    if (event === "tool-call") {
      onToolCall(data);
      if (data.customerInsights) onCustomerInsights?.(data.customerInsights);
      return false;
    }

    if (event === "tool-result") {
      onToolResult(data);
      if (data.customerInsights) onCustomerInsights?.(data.customerInsights);
      return false;
    }

    if (event === "done") {
      if (data.customerInsights) onCustomerInsights?.(data.customerInsights);
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
