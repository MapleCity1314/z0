import type { DomainResult } from "@z0/backend";
import type { Context } from "hono";

export function jsonResult<T>(c: Context, result: DomainResult<T>, successStatus = 200) {
  if (result.ok) {
    return c.json({ data: result.data }, { status: successStatus as 200 });
  }

  const status =
    result.error.code.endsWith("not_found") ? 404 :
    result.error.code.endsWith("forbidden") ? 403 :
    result.error.code === "validation_error" ? 400 :
    422;

  return c.json({ error: result.error }, { status: status as 400 });
}
