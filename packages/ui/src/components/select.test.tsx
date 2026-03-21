import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select, SelectTrigger, SelectValue } from "./select";

describe("SelectTrigger", () => {
  it("renders the requested size data attribute", () => {
    const markup = renderToStaticMarkup(
      <Select>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>,
    );

    expect(markup).toContain('data-size="sm"');
    expect(markup).toContain("h-8");
  });
});
