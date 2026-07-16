import type { AiAssistantGraph } from "@/types/ai-assistant";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UiChatMessage } from "../ai-assistant.utils";
import { MessageBubble } from "./conversation-content";

vi.mock("./ai-assistant-chart", () => ({
  AiAssistantChart: ({ graph }: { graph: AiAssistantGraph }) => (
    <div data-testid="message-chart">{graph.title}</div>
  ),
}));

const salesGraph: AiAssistantGraph = {
  type: "bar",
  title: "Sales Today",
  xAxisLabel: "Period",
  yAxisLabel: "Sales",
  valueFormat: "currency",
  labels: ["Today"],
  datasets: [{ label: "Sales", data: [2038] }],
};

const profitGraph: AiAssistantGraph = {
  type: "bar",
  title: "Profit Today",
  xAxisLabel: "Period",
  yAxisLabel: "Profit",
  valueFormat: "currency",
  labels: ["Today"],
  datasets: [{ label: "Profit", data: [382.29] }],
};

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

  it("renders every graph attached to the same assistant message", () => {
    render(
      <MessageBubble
        message={assistantMessage({
          content: "Today's charts",
          graphs: [salesGraph, profitGraph],
        })}
      />,
    );

    expect(
      screen
        .getAllByTestId("message-chart")
        .map((chart) => chart.textContent),
    ).toEqual(["Sales Today", "Profit Today"]);
  });
});
