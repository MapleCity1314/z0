import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateAdminVersionInput } from "@/lib/admin/contracts";

const revalidatePath = vi.fn();
const redirect = vi.fn();

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
}));

vi.mock("@/lib/admin/client", () => client);

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates feedback status through the admin api client", async () => {
    const { updateFeedbackStatusAction } = await import("./actions");

    await updateFeedbackStatusAction("fb-1", "planned");

    expect(client.updateFeedbackStatus).toHaveBeenCalledWith("fb-1", "planned");
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/admin/feedback/fb-1");
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/admin/feedback");
  });

  it("submits feedback response through the admin api client", async () => {
    const { addFeedbackResponseAction } = await import("./actions");

    await addFeedbackResponseAction("fb-2", "Working on this");

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

    await publishVersionAction("ver-1");
    await archiveVersionAction("ver-2");

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
});
