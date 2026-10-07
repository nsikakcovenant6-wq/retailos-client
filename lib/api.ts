import type { ApiErrorBody } from "@/lib/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code;
    this.fields = body?.error?.fields;
  }
}

type ApiInit = RequestInit & { json?: unknown };

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.json !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(API_URL + path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      body?.error?.message || body?.message || "Request failed (" + response.status + ")",
      response.status,
      body,
    );
  }

  return (body?.data ?? body) as T;
}

export const getApiUrl = () => API_URL;
