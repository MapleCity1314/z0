"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../lib/cn";

function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const isControlled = typeof checked === "boolean";
  const [visualChecked, setVisualChecked] = React.useState(
    typeof checked === "boolean"
      ? checked
      : typeof defaultChecked === "boolean"
        ? defaultChecked
        : false,
  );

  React.useEffect(() => {
    if (isControlled) {
      setVisualChecked(checked);
    }
  }, [checked, isControlled]);

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        visualChecked
          ? "bg-primary dark:bg-primary"
          : "bg-input dark:bg-input/80",
        className,
      )}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={(nextChecked) => {
        if (!isControlled) {
          setVisualChecked(nextChecked);
        } else {
          setVisualChecked(nextChecked);
        }
        onCheckedChange?.(nextChecked);
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-[transform,background-color]",
          visualChecked
            ? "translate-x-[calc(100%-2px)] bg-background dark:bg-primary-foreground"
            : "translate-x-0 bg-background dark:bg-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
