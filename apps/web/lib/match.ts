// =========================
// Utility Types
// =========================

export type Primitive = string | number | boolean | symbol | null | undefined;

export type Pattern<T> =
  | T
  | RegExp
  | ((value: T) => boolean)
  | (T extends Array<infer U> ? Pattern<U>[] : never)
  | (T extends Record<string, unknown>
      ? { [K in keyof T]?: Pattern<T[K]> }
      : never);

export type ExtractMatch<T, P> =
  // predicate
  P extends (value: infer U) => boolean
    ? U
    : // regex
    P extends RegExp
    ? T extends string
      ? string
      : never
    : // literal primitive
    P extends Primitive
    ? P
    : // array pattern
    T extends Array<infer TElem>
    ? P extends Array<infer PElem>
      ? ExtractMatch<TElem, PElem>[]
      : never
    : // object pattern
    T extends Record<string, unknown>
    ? P extends Record<string, unknown>
      ? {
          [K in keyof P & keyof T]: ExtractMatch<T[K], P[K]>;
        }
      : never
    : // fallback
      never;

export interface MatchOptions {
  strict?: boolean;
}

export type MaybePromise<T> = T | Promise<T>;


// =========================
// Type Guard Helpers
// =========================

function isPlainObject(obj: unknown): obj is object {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Object.getPrototypeOf(obj) === Object.prototype
  );
}

function isMatch<T>(pattern: Pattern<T>, value: T): boolean {
  if (typeof pattern === "function") {
    return (pattern as (v: T) => boolean)(value);
  }

  if (pattern instanceof RegExp) {
    return typeof value === "string" && pattern.test(value);
  }

  if (
    typeof pattern !== "object" ||
    pattern === null ||
    typeof value !== "object" ||
    value === null
  ) {
    return Object.is(pattern, value);
  }

  if (Array.isArray(pattern) && Array.isArray(value)) {
    if (pattern.length > value.length) return false;
    for (let i = 0; i < pattern.length; i++) {
      if (!isMatch(pattern[i], value[i])) return false;
    }
    return true;
  }

  if (isPlainObject(pattern) && isPlainObject(value)) {
    const p = pattern as Record<string, unknown>;
    const v = value as Record<string, unknown>;

    for (const key of Object.keys(p)) {
      if (!(key in v)) return false;
      if (!isMatch(p[key] as Pattern<unknown>, v[key] as unknown)) return false;
    }
    return true;
  }

  return false;
}


// =========================
// Unified Sync/Async MatchBuilder
// =========================

export class UnifiedMatchBuilder<T, R> {
  private cases: Array<{
    pattern: Pattern<T>;
    action: (value: T) => MaybePromise<R>;
  }> = [];

  private value: T;
  private opts: MatchOptions;

  constructor(value: T, opts: MatchOptions = {}) {
    this.value = value;
    this.opts = opts;
  }

  with<P extends Pattern<T>>(
    pattern: P,
    action: (value: ExtractMatch<T, P>) => MaybePromise<R>
  ): this {
    this.cases.push({
      pattern,
      action: action as unknown as (value: T) => MaybePromise<R>
    });
    return this;
  }

  otherwise(
    action: (value: T) => MaybePromise<R>
  ): MaybePromise<R> {
    for (const { pattern, action: act } of this.cases) {
      if (isMatch(pattern, this.value)) {
        return act(this.value);
      }
    }

    if (this.opts.strict) {
      throw new Error("match error: no pattern matched and strict mode is on");
    }

    return action(this.value);
  }
}


// =========================
// Exported API 
// =========================

export function match<T, R = T>(value: T, opts: MatchOptions = {}) {
  return new UnifiedMatchBuilder<T, R>(value, opts);
}
