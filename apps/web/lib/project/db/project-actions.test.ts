import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuth = vi.fn();
const apiFetch = vi.fn();

vi.mock("@/lib/session", () => ({
  requireAuth,
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

describe("project db actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      role: "user",
    });
  });

  it("creates projects through the api and uploads initial files", async () => {
    apiFetch
      .mockResolvedValueOnce({
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Demo",
        type: "react",
      })
      .mockResolvedValueOnce({
        id: "550e8400-e29b-41d4-a716-446655440001",
      });

    const { createProjectAction } = await import("./project-actions");
    const result = await createProjectAction({
      name: "Demo",
      type: "react",
      description: "Sandboxed project",
      files: {
        "src/App.tsx": "export default function App() { return null; }",
      },
    });

    expect(result).toEqual({
      success: true,
      data: {
        projectId: "550e8400-e29b-41d4-a716-446655440001",
        name: "Demo",
        type: "react",
      },
    });
    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      "/v1/projects",
      expect.objectContaining({
        method: "POST",
      }),
      {
        actor: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          role: "user",
        },
      },
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      "/v1/projects/550e8400-e29b-41d4-a716-446655440001/files",
      expect.objectContaining({
        method: "PATCH",
      }),
      expect.any(Object),
    );
  });

  it("sends the edited file snapshot directly to the api", async () => {
    apiFetch.mockResolvedValueOnce({
      id: "550e8400-e29b-41d4-a716-446655440001",
    });

    const { updateProjectFilesAction } = await import("./project-actions");
    const result = await updateProjectFilesAction(
      "550e8400-e29b-41d4-a716-446655440001",
      {
        "src/App.tsx": "new",
      },
    );

    expect(result).toEqual({
      success: true,
      data: {
        projectId: "550e8400-e29b-41d4-a716-446655440001",
        filesUpdated: 1,
      },
    });
    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      "/v1/projects/550e8400-e29b-41d4-a716-446655440001/files",
      {
        method: "PATCH",
        body: JSON.stringify({
          files: {
            "src/App.tsx": "new",
          },
        }),
      },
      {
        actor: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          role: "user",
        },
      },
    );
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("validates project ids before issuing api calls", async () => {
    const { getProjectInfoAction } = await import("./project-actions");
    const result = await getProjectInfoAction("not-a-uuid");

    expect(result).toEqual({
      success: false,
      error: "Invalid project input",
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
