import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodeBlock, highlightCode } from "@/components/ai-elements/code-block";

describe("CodeBlock", () => {
  it("does not override Shiki pre colors in dark mode", () => {
    globalThis.React = React;

    const markup = renderToStaticMarkup(
      React.createElement(CodeBlock, {
        code: "const answer = 42;",
        language: "typescript",
      })
    );

    expect(markup).toContain("[&amp;&gt;pre]:bg-muted!");
    expect(markup).toContain("[&amp;&gt;pre]:bg-zinc-900!");
    expect(markup).not.toContain("text-foreground!");
    expect(markup).toContain("[&amp;&gt;pre]:overflow-x-auto");
  });

  it("strips Shiki block background styles so the app theme controls the surface", async () => {
    const [, darkHtml] = await highlightCode("const answer = 42;", "typescript");

    expect(darkHtml).not.toContain("background-color:");
    expect(darkHtml).not.toContain("background:");
  });
});
