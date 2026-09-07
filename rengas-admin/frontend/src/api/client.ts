export const API = "/api";
export async function request(path: string, options?: RequestInit) {
  const response = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!response.ok) {
    const hint = response.status === 401 ? "Session expired. Log out and sign in again."
      : response.status === 403 ? "Access denied for this account."
      : response.status === 502 || response.status === 503 ? "Backend unavailable. Check the backend terminal and proxy URL."
      : response.status >= 500 ? "Server error. Check the backend terminal for the database or API error."
      : "Request failed.";
    throw new Error("HTTP " + response.status + ". " + hint);
  }
  return response.json();
}
