import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { UiChatMessage } from "../ai-assistant.utils";
import { MessageBubble } from "./conversation-content";

function assistantMessage(
  overrides: Partial<UiChatMessage> = {},
): UiChatMessage {
  return {
    id: "assistant-message",
    role: "assistant",
    content: "",
    status: "completed",
    errorMessage: null,
    ...overrides,
  };
}

describe("MessageBubble", () => {
  afterEach(cleanup);

  it("shows active tool activity without appending it to assistant content", () => {
    render(
      <MessageBubble
        message={assistantMessage({
          content: "Sales are up",
          status: "streaming",
        })}
        toolActivity="Checking dashboard…"
      />,
    );

    expect(screen.getByText("Sales are up")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Checking dashboard…",
    );
  });

  it("renders a persisted failure message while preserving partial content", () => {
    render(
      <MessageBubble
        message={assistantMessage({
          content: "I found today's sales, but",
          status: "failed",
          errorMessage: "AI provider became unavailable",
          local: false,
        })}
      />,
    );

    expect(screen.getByText("I found today's sales, but")).toBeTruthy();
    expect(screen.getByText("AI provider became unavailable")).toBeTruthy();
  });
});
