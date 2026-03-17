import { describe, expect, it, vi } from "vitest";
import { buildAgentRunRecord, buildToolCallRecords } from "./telemetry";

describe("agent telemetry helpers", () => {
  it("builds an agent run record", () => {
    const record = buildAgentRunRecord({
      runId: "run-1",
      chatId: "chat-1",
      userId: "user-1",
      projectId: null,
      model: "z0-mini",
      isReasoning: false,
      webSearchEnabled: false,
      messageCount: 1,
      status: "completed",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      credits: 1,
      cost: 0.00123,
      startedAt: new Date("2026-01-01T00:00:00Z"),
      finishedAt: new Date("2026-01-01T00:00:05Z"),
    });

    expect(record.rootRunId).toBe("run-1");
    expect(record.cost).toBe("0.001230");
  });

  it("builds tool call records from tool calls and results", () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );

    const records = buildToolCallRecords({
      runId: "run-1",
      chatId: "chat-1",
      toolCalls: [
        {
          toolCallId: "call-1",
          toolName: "runBuild",
          input: { mode: "production" },
        },
      ],
      toolResults: [
        {
          toolCallId: "call-1",
          toolName: "runBuild",
          result: { success: true },
        },
      ],
      startedAt: new Date("2026-01-01T00:00:00Z"),
      finishedAt: new Date("2026-01-01T00:00:05Z"),
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.toolName).toBe("runBuild");
    expect(records[0]?.state).toBe("output-available");
  });
});
