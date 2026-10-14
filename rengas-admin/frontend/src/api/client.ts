export const API = "/api";
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
export async function request(path: string, options?: RequestInit) {
  const response = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      try {
        const body: unknown = await response.json();
        const value = body && typeof body === "object" && "message" in body ? body.message : undefined;
        const message = typeof value === "string" ? value : Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string").join(" ") : "";
        if (message.trim()) throw new ApiError(response.status, message);
      } catch (error) {
        if (error instanceof ApiError) throw error;
      }
    }
    const hint = response.status === 401 ? "Session expired. Log out and sign in again."
      : response.status === 403 ? "Access denied for this account."
      : response.status === 502 || response.status === 503 ? "Backend unavailable. Check the backend terminal and proxy URL."
      : response.status >= 500 ? "Server error. Check the backend terminal for the database or API error."
      : "Request failed.";
    throw new ApiError(response.status, "HTTP " + response.status + ". " + hint);
  }
  return response.json();
}
