const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("rl_coach_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request<{ token: string; user: import("../types").User }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: import("../types").User }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request<import("../types").User>("/auth/me"),
  },
  requests: {
    create: (body: { rank: string; problemType: string; description: string }) =>
      request<import("../types").CoachingRequest>("/requests", { method: "POST", body: JSON.stringify(body) }),
    my: () => request<import("../types").CoachingRequest[]>("/requests/my"),
    incoming: () => request<import("../types").CoachingRequest[]>("/requests/incoming"),
    accept: (id: string) => request<import("../types").CoachingRequest>(`/requests/${id}/accept`, { method: "POST" }),
    reject: (id: string) => request<import("../types").CoachingRequest>(`/requests/${id}/reject`, { method: "POST" }),
    complete: (id: string) => request<import("../types").CoachingRequest>(`/requests/${id}/complete`, { method: "POST" }),
    notes: (id: string, coachNotes: string) =>
      request<import("../types").CoachingRequest>(`/requests/${id}/notes`, { method: "POST", body: JSON.stringify({ coachNotes }) }),
    all: () => request<import("../types").CoachingRequest[]>("/requests"),
  },
  admin: {
    users: () => request<import("../types").User[]>("/admin/users"),
    updateRole: (id: string, role: import("../types").Role) =>
      request<import("../types").User>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    requests: () => request<import("../types").CoachingRequest[]>("/admin/requests"),
  },
};
