import type { ApiError } from "@/lib/domain"

export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "ClientApiError"
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Request failed." }))) as ApiError
    throw new ClientApiError(payload.error || "Request failed.", response.status, payload.code, payload.details)
  }
  return response.json() as Promise<T>
}
