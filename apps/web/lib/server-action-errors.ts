import { z } from "zod";
import { getActionErrorMessage } from "@/lib/auth-errors";

type ServerActionErrorOptions = {
  fallback: string;
  invalidInputMessage?: string;
};

export function getServerActionErrorMessage(
  error: unknown,
  options: ServerActionErrorOptions,
) {
  if (error instanceof z.ZodError) {
    return options.invalidInputMessage ?? "Invalid request input";
  }

  return getActionErrorMessage(error, options.fallback);
}
