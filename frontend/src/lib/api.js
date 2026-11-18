export const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// getToken comes from Clerk's useAuth(). Tokens are short-lived (~60s),
// so fetch a fresh one per request instead of storing it.
export async function apiFetch(getToken, path, opts = {}) {
  const token = await getToken();
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(!isFormData && opts.body ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

// Browsers can't set headers on WebSockets, so the token goes in the query string.
export async function openMarketSocket(getToken) {
  const token = await getToken();
  return new WebSocket(`${API.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`);
}
