export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand;
};

export type EntityId = Brand<string, "entity-id">;
export type Timestamp = string;

export type EnvironmentName = "development" | "preview" | "production";

export interface AuditFields {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Pagination {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}
