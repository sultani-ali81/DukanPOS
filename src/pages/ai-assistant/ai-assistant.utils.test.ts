import type { AiAssistantGraph, AiChatMessage } from "@/types/ai-assistant";
import { describe, expect, it } from "vitest";
import {
  createAssistantChunkSanitizer,
  getActiveToolActivityLabel,
  getAssistantErrorMessage,
  getToolActivityLabel,
  mergeThreadMessagesWithLiveGraphs,
  stripAssistantReasoning,
  type UiChatMessage,
} from "./ai-assistant.utils";

const liveGraph: AiAssistantGraph = {
  type: "bar",
  title: "Profit Today",
  xAxisLabel: "Period",
  yAxisLabel: "Profit",
  valueFormat: "currency",
  labels: ["Today"],
  datasets: [{ label: "Profit", data: [382.29] }],
};

const liveSalesGraph: AiAssistantGraph = {
  type: "bar",
  title: "Sales Today",
  xAxisLabel: "Period",
  yAxisLabel: "Sales",
  valueFormat: "currency",
  labels: ["Today"],
  datasets: [{ label: "Sales", data: [2038] }],
};

describe("assistant response sanitization", () => {
  it("keeps split think blocks hidden throughout streaming and removes them from final content", () => {
    const chunks = [
      "Visible intro ",
      "<thi",
      "nk>private reasoning",
      "</th",
      "ink>\nVisible streamed response",
    ];
    let rawContent = "";

    const visibleContent = chunks.map((chunk) => {
      rawContent += chunk;
      return stripAssistantReasoning(rawContent);
    });

    expect(visibleContent).toEqual([
      "Visible intro ",
      "Visible intro ",
      "Visible intro ",
      "Visible intro ",
      "Visible intro \nVisible streamed response",
    ]);
    expect(
      stripAssistantReasoning(
        "<think>private final reasoning</think>\nFinal customer-facing response",
      ),
    ).toBe("\nFinal customer-facing response");
  });
});

describe("streaming assistant chunk sanitization", () => {
  it("emits ordinary visible text immediately for each pushed chunk", () => {
    const sanitizer = createAssistantChunkSanitizer();

    expect(sanitizer.push("Sales")).toBe("Sales");
    expect(sanitizer.push(" today")).toBe(" today");
    expect(sanitizer.push(" are up.")).toBe(" are up.");
  });

  it("keeps complete and split think blocks hidden while preserving visible text", () => {
    const sanitizer = createAssistantChunkSanitizer();

    expect(sanitizer.push("Visible intro <thi")).toBe("Visible intro ");
    expect(sanitizer.push("nk>private reasoning")).toBe("");
    expect(sanitizer.push("</th")).toBe("");
    expect(sanitizer.push("ink>Visible ending")).toBe("Visible ending");
  });

  it("emits visible text after a closing think tag in the same chunk", () => {
    const sanitizer = createAssistantChunkSanitizer();

    expect(
      sanitizer.push("<think>private reasoning</think>Customer-facing answer"),
    ).toBe("Customer-facing answer");
  });

  it("sanitizes the authoritative done content independently of streamed chunks", () => {
    const sanitizer = createAssistantChunkSanitizer();

    sanitizer.push("Interim visible text");

    expect(
      sanitizer.sanitizeFinal(
        "<think>private final reasoning</think>Final customer-facing answer",
      ),
    ).toBe("Final customer-facing answer");
  });
});

describe("thread history graph merging", () => {
  it("hydrates a single persisted graph from assistant metadata.graph", () => {
    const threadMessages: AiChatMessage[] = [
      {
        id: "saved-user-id",
        role: "user",
        content: "Show profit",
      },
      {
        id: "saved-assistant-id",
        role: "assistant",
        content: "Saved profit response",
        metadata: { graph: liveGraph },
      },
    ];

    const mergedMessages = mergeThreadMessagesWithLiveGraphs(
      [],
      threadMessages,
    );

    expect(mergedMessages[1]).toMatchObject({
      id: "saved-assistant-id",
      graphs: [liveGraph],
      metadata: { graph: liveGraph, graphs: [liveGraph] },
    });
  });

  it("hydrates every persisted graph from assistant metadata.graphs", () => {
    const threadMessages: AiChatMessage[] = [
      {
        id: "saved-user-id",
        role: "user",
        content: "Compare sales and profit",
      },
      {
        id: "saved-assistant-id",
        role: "assistant",
        content: "Saved comparison response",
        metadata: { graphs: [liveSalesGraph, liveGraph] },
      },
    ];

    const mergedMessages = mergeThreadMessagesWithLiveGraphs(
      [],
      threadMessages,
    );

    expect(mergedMessages[1]).toMatchObject({
      id: "saved-assistant-id",
      graphs: [liveSalesGraph, liveGraph],
      metadata: { graphs: [liveSalesGraph, liveGraph] },
    });
  });

  it("preserves every matching live graph when revalidated history is text-only", () => {
    const currentMessages: UiChatMessage[] = [
      {
        id: "saved-user-id",
        role: "user",
        content: "Show profit",
      },
      {
        id: "saved-assistant-id",
        role: "assistant",
        content: "Live response",
        graphs: [liveSalesGraph, liveGraph],
      },
    ];
    const threadMessages: AiChatMessage[] = [
      {
        id: "saved-user-id",
        role: "user",
        content: "Show profit",
      },
      {
        id: "saved-assistant-id",
        role: "assistant",
        content: "Saved text-only response",
      },
    ];

    const mergedMessages = mergeThreadMessagesWithLiveGraphs(
      currentMessages,
      threadMessages,
    );

    expect(mergedMessages[1]).toMatchObject({
      id: "saved-assistant-id",
      content: "Saved text-only response",
      graphs: [liveSalesGraph, liveGraph],
      metadata: { graphs: [liveSalesGraph, liveGraph] },
    });
  });

});

describe("AI assistant tool activity labels", () => {
  it.each([
    ["getDashboardStats", "Checking dashboard…"],
    ["searchProducts", "Searching products…"],
    ["check_inventory_levels", "Searching products…"],
    ["analyzeSales", "Analyzing sales…"],
    ["getCashierPerformance", "Analyzing sales…"],
    ["futureToolName", "Analyzing store data…"],
  ])("maps %s to a useful activity label", (toolName, expectedLabel) => {
    expect(getToolActivityLabel(toolName)).toBe(expectedLabel);
  });

  it("uses the most recent still-running tool and ignores completed tools", () => {
    expect(
      getActiveToolActivityLabel({
        dashboard: {
          toolCallId: "dashboard",
          toolName: "getDashboardStats",
          status: "started",
        },
        products: {
          toolCallId: "products",
          toolName: "searchProducts",
          status: "completed",
        },
      }),
    ).toBe("Analyzing store data…");
  });

  it("shows a generic failure notice when a tool failed but no tool is running", () => {
    expect(
      getActiveToolActivityLabel({
        completed: {
          toolCallId: "completed",
          toolName: "getDashboardStats",
          status: "completed",
        },
        failed: {
          toolCallId: "failed",
          toolName: "futureToolName",
          status: "failed",
        },
      }),
    ).toBe("A store data check failed. Continuing…");
  });

  it("returns no activity after every tool has finished successfully", () => {
    expect(
      getActiveToolActivityLabel({
        completed: {
          toolCallId: "completed",
          toolName: "getDashboardStats",
          status: "completed",
        },
      }),
    ).toBeNull();
  });
});

describe("getAssistantErrorMessage", () => {
  it("prefers the backend message from an Axios response", () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 404,
        data: { message: "Employee not found" },
      },
    };

    expect(getAssistantErrorMessage(error)).toBe("Employee not found");
  });

  it("supports backend validation message arrays", () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { message: ["question must be a string", "question is required"] },
      },
    };

    expect(getAssistantErrorMessage(error)).toBe(
      "question must be a string, question is required",
    );
  });

  it("uses the status-specific fallback when the backend has no message", () => {
    const error = {
      isAxiosError: true,
      response: { status: 503, data: {} },
    };

    expect(getAssistantErrorMessage(error)).toBe(
      "AI assistant is currently unavailable.",
    );
  });
});
