import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("keeps styling tied to Radix data-state for controlled and uncontrolled usage", () => {
    const markup = renderToStaticMarkup(<Switch defaultChecked />);

    expect(markup).toContain("data-[state=checked]:justify-end");
    expect(markup).toContain("data-[state=unchecked]:justify-start");
    expect(markup).toContain("dark:data-[state=checked]:bg-primary-foreground");
  });
});
