const API_BASE = "http://localhost:4000";

export async function apiRequest(path, { token, ...options } = {}) {

  // If a caller doesn't provide a token, try the saved auth in localStorage.
  if (!token) {
    try {
      const saved = JSON.parse(localStorage.getItem("splitstream-auth") || "null");
      token = saved?.accessToken || null;
    } catch (e) {
      token = null;
    }
  }

  console.log("TOKEN:", token);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}
