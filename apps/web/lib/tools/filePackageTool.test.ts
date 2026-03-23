import { describe, expect, it, vi } from "vitest";
import { saveFileTool } from "./filePackageTool";

describe("saveFileTool", () => {
  it("fails cleanly when filename is missing", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = await saveFileTool.execute?.(
      {
        content: "hello",
      } as unknown as Parameters<NonNullable<typeof saveFileTool.execute>>[0],
      {} as never,
    );

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("filename"),
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
