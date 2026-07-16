export interface AskAiAssistantPayload {
  question: string;
  threadId?: string;
}

export type AiAssistantGraphType = "line" | "bar" | "pie" | "doughnut";

export type AiAssistantGraphValueFormat = "currency" | "number";

export interface AiAssistantGraphDataset {
  label: string;
  data: number[];
  /**
   * Optional because the current AI Assistant SSE graph payload does not
   * include presentation colors. The chart renderer supplies a stable
   * frontend palette when it is absent.
   */
  color?: string;
}

export interface AiAssistantGraph {
  type: AiAssistantGraphType;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  valueFormat: AiAssistantGraphValueFormat;
  labels: string[];
  datasets: AiAssistantGraphDataset[];
}

export type AiAssistantToolStatus = "started" | "completed" | "failed";

export interface AiAssistantToolEventData {
  toolCallId: string;
  toolName: string;
  status: AiAssistantToolStatus;
}

export interface AiAssistantToolCallEventData
  extends AiAssistantToolEventData {
  status: "started";
}

export interface AiAssistantToolResultEventData
  extends AiAssistantToolEventData {
  status: "completed" | "failed";
}

export interface AiAssistantChunkEventData {
  content: string;
}

export interface AiAssistantGraphEventData {
  graph: AiAssistantGraph;
}

export interface AiAssistantDoneEventData {
  content: string;
  threadId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export interface AiAssistantErrorEventData {
  threadId: string;
  userMessageId: string;
  message: string;
}

export type AiAssistantSseEvent =
  | { event: "tool-call"; data: AiAssistantToolCallEventData }
  | { event: "tool-result"; data: AiAssistantToolResultEventData }
  | { event: "chunk"; data: AiAssistantChunkEventData }
  | { event: "graph"; data: AiAssistantGraphEventData }
  | { event: "done"; data: AiAssistantDoneEventData }
  | { event: "error"; data: AiAssistantErrorEventData };

export interface RenameAiChatThreadPayload {
  name: string;
}

export interface DeleteAiChatThreadResponse {
  message: string;
  id: string;
}

export type AiChatRole = "user" | "assistant";

export interface AiChatThreadSummary {
  id: string;
  title?: string;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  status?: "completed" | "failed";
  errorMessage?: string | null;
  model?: string | null;
  provider?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiChatThreadDetail extends AiChatThreadSummary {
  messages: AiChatMessage[];
}
