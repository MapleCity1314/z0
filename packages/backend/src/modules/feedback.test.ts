import { describe, expect, it, vi } from "vitest";
import {
  FeedbackService,
  type FeedbackRecord,
  type FeedbackRepository,
} from "./feedback";

function makeFeedback(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    type: "bug",
    category: null,
    title: "Broken",
    content: "Something broke",
    status: "pending",
    priority: "medium",
    metadata: null,
    attachments: [],
    adminResponse: null,
    respondedBy: null,
    respondedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeRepository(): FeedbackRepository {
  return {
    create: vi.fn(async (input) => makeFeedback(input)),
    findById: vi.fn(async () => makeFeedback()),
    listByUserId: vi.fn(async () => [makeFeedback()]),
    listAll: vi.fn(async () => [makeFeedback()]),
    updateStatus: vi.fn(async (_id, status) => makeFeedback({ status })),
    addResponse: vi.fn(async (_id, adminId, response) =>
      makeFeedback({
        adminResponse: response,
        respondedBy: adminId,
        respondedAt: new Date(),
      }),
    ),
    delete: vi.fn(async () => true),
  };
}

describe("FeedbackService", () => {
  it("returns the current user's feedback item", async () => {
    const service = new FeedbackService(makeRepository());
    const result = await service.getOne(
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );

    expect(result.ok).toBe(true);
  });

  it("rejects deleting someone else's feedback", async () => {
    const service = new FeedbackService(makeRepository());
    const result = await service.remove(
      "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("feedback_forbidden");
    }
  });

  it("requires a non-empty admin response", async () => {
    const service = new FeedbackService(makeRepository());
    const result = await service.respond(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "   ",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
    }
  });
});
