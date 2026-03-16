export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessPayload<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export type ApiResult<T> =
  | ApiSuccessPayload<T>
  | {
      error: ApiErrorPayload;
    };

export interface HealthcheckPayload {
  ok: true;
  service: string;
  timestamp: string;
  version?: string;
}
