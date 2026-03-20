"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { flushSync } from "react-dom";
import { Button } from "@z0/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const onToggleTheme = React.useCallback(() => {
    const nextTheme = isDark ? "light" : "dark";

    const applyTheme = () => {
      setTheme(nextTheme);
    };

    if (
      typeof document === "undefined" ||
      !("startViewTransition" in document) ||
      !buttonRef.current
    ) {
      applyTheme();
      return;
    }

    const transition = (
      document as Document & {
        startViewTransition: (callback: () => void) => { ready: Promise<void> };
      }
    ).startViewTransition(() => {
      flushSync(applyTheme);
    });

    transition.ready.then(() => {
      const button = buttonRef.current;
      if (!button) return;

      const { top, left, width, height } = button.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;

      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top),
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 400,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }, [isDark, setTheme]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
        <Sun className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="sm"
      className="h-8 w-8 rounded-full p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
      onClick={onToggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
