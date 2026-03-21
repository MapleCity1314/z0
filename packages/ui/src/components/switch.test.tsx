import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders checked visual classes for uncontrolled usage", () => {
    const markup = renderToStaticMarkup(<Switch defaultChecked />);

    expect(markup).toContain("bg-primary");
    expect(markup).toContain("translate-x-[calc(100%-2px)]");
    expect(markup).toContain("dark:bg-primary-foreground");
  });

  it("renders unchecked visual classes for controlled usage", () => {
    const markup = renderToStaticMarkup(<Switch checked={false} />);

    expect(markup).toContain("bg-input");
    expect(markup).toContain("translate-x-0");
    expect(markup).toContain("dark:bg-foreground");
  });
});
