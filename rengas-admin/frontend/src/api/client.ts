export const API = "/api";
export async function request(path: string, options?: RequestInit) {
  const response = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.text()) || "Request failed");
  return response.json();
}
