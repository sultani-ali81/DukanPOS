export interface AiAssistantResponse {
  answer: string;
}

export interface AskAiAssistantPayload {
  question: string;
  threadId?: string;
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
