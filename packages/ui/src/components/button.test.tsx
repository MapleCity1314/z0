import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("applies requested variant and size classes", () => {
    const markup = renderToStaticMarkup(
      <Button variant="secondary" size="sm">Save</Button>,
    );

    expect(markup).toContain("bg-secondary");
    expect(markup).toContain("h-8");
  });
});
