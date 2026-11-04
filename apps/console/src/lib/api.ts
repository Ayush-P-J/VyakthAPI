/** The browser's API client. Requests stay on this origin, and the session cookie travels by itself. */
import type { components } from "./api-types";

export type Profile = components["schemas"]["Profile"];
export type ProjectOverview = components["schemas"]["ProjectOverview"];
export type SignupRequest = components["schemas"]["SignupRequest"];
export type LoginRequest = components["schemas"]["LoginRequest"];

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/console-api${path}`, {
      method: init.method ?? "GET",
      ...(init.body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(init.body) }),
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (json as components["schemas"]["ApiError"] | null)?.error;
    throw new ApiError(res.status, e?.code ?? "error", e?.message ?? "Something went wrong on our side. Try again.", e?.details);
  }
  return json as T;
}
