import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("keeps styling tied to Radix data-state for controlled and uncontrolled usage", () => {
    const markup = renderToStaticMarkup(<Switch defaultChecked />);

    expect(markup).toContain("data-[state=checked]:bg-primary");
    expect(markup).toContain("data-[state=checked]:translate-x-3");
    expect(markup).toContain("data-[state=unchecked]:translate-x-0");
    expect(markup).toContain("dark:data-[state=checked]:bg-primary-foreground");
  });
});
