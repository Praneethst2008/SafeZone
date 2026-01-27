const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export const apiFetch = (
  url: string,
  options: RequestInit = {},
  isAdmin: boolean = false
) => {
  const token = isAdmin
    ? localStorage.getItem("adminToken")
    : localStorage.getItem("token");

  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });
};
