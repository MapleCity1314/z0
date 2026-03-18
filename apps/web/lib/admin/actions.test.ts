import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateAdminVersionInput } from "@/lib/admin/contracts";

class MockApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

const revalidatePath = vi.fn();
const redirect = vi.fn();
const unstableRethrow = vi.fn();

const client = vi.hoisted(() => ({
  updateFeedbackStatus: vi.fn(),
  addFeedbackResponse: vi.fn(),
  createVersion: vi.fn(),
  publishVersion: vi.fn(),
  archiveVersion: vi.fn(),
  deleteVersion: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
  unstable_rethrow: unstableRethrow,
}));

vi.mock("@/lib/auth-errors", () => ({
  getActionErrorMessage: vi.fn(
    (error: unknown, fallback: string) =>
      error instanceof Error && error.message ? error.message : fallback,
  ),
}));

vi.mock("@/lib/admin/client", () => client);

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates feedback status through the admin api client", async () => {
    const { updateFeedbackStatusAction } = await import("./actions");

    const result = await updateFeedbackStatusAction("fb-1", "planned");

    expect(result).toEqual({
      success: true,
      message: "Feedback status updated.",
    });
    expect(client.updateFeedbackStatus).toHaveBeenCalledWith("fb-1", "planned");
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/admin/feedback/fb-1");
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/admin/feedback");
  });

  it("submits feedback response through the admin api client", async () => {
    const { addFeedbackResponseAction } = await import("./actions");

    const result = await addFeedbackResponseAction("fb-2", "Working on this");

    expect(result).toEqual({
      success: true,
      message: "Feedback response added.",
    });
    expect(client.addFeedbackResponse).toHaveBeenCalledWith(
      "fb-2",
      "Working on this",
    );
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/admin/feedback/fb-2");
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/admin/feedback");
  });

  it("creates a version through the admin api client and redirects", async () => {
    const { createVersionAction } = await import("./actions");
    const input: CreateAdminVersionInput = {
      version: "1.2.0",
      title: "Spring release",
      description: "Faster admin pipeline",
      type: "minor",
    };

    await createVersionAction(input);

    expect(client.createVersion).toHaveBeenCalledWith(input);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/versions");
    expect(redirect).toHaveBeenCalledWith("/admin/versions");
  });

  it("publishes and archives versions through the admin api client", async () => {
    const { publishVersionAction, archiveVersionAction } = await import(
      "./actions"
    );

    await expect(publishVersionAction("ver-1")).resolves.toEqual({
      success: true,
      message: "Version published.",
    });
    await expect(archiveVersionAction("ver-2")).resolves.toEqual({
      success: true,
      message: "Version archived.",
    });

    expect(client.publishVersion).toHaveBeenCalledWith("ver-1");
    expect(client.archiveVersion).toHaveBeenCalledWith("ver-2");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/versions/ver-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/versions/ver-2");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/versions");
  });

  it("deletes versions through the admin api client and redirects", async () => {
    const { deleteVersionAction } = await import("./actions");

    await deleteVersionAction("ver-3");

    expect(client.deleteVersion).toHaveBeenCalledWith("ver-3");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/versions");
    expect(redirect).toHaveBeenCalledWith("/admin/versions");
  });

  it("returns a structured failure without revalidating on api errors", async () => {
    client.publishVersion.mockRejectedValueOnce(
      new MockApiClientError(403, "You do not have access to this resource."),
    );

    const { publishVersionAction } = await import("./actions");
    const result = await publishVersionAction("ver-9");

    expect(result).toEqual({
      success: false,
      message: "You do not have access to this resource.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
