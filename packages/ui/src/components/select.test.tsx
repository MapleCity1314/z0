import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelectTrigger, SelectValue } from "./select";

describe("SelectTrigger", () => {
  it("renders the requested size data attribute", () => {
    const markup = renderToStaticMarkup(
      <SelectTrigger size="sm">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>,
    );

    expect(markup).toContain('data-size="sm"');
    expect(markup).toContain("h-8");
  });
});
