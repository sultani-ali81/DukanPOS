import { describe, expect, it } from "vitest";
import {
  getActiveToolActivityLabel,
  getAssistantErrorMessage,
  getToolActivityLabel,
} from "./ai-assistant.utils";

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
    ).toBe("Checking dashboard…");
  });

  it("returns no activity after every tool has finished or failed", () => {
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
