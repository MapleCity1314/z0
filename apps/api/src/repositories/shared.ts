import { and, type SQL } from "drizzle-orm";
import { getDb } from "@z0/backend";

export const db = getDb();

export function withPredicates<T>(
  predicates: SQL<unknown>[],
  callback: (clause?: SQL<unknown>) => T,
) {
  return callback(predicates.length > 0 ? and(...predicates) : undefined);
}
