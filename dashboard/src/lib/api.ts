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
  replays: {
    analyze: (file: File, playerName?: string, apiKey?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (playerName) formData.append("playerName", playerName);
      const headers: Record<string, string> = {};
      if (apiKey) headers["X-API-Key"] = apiKey;
      return request<any>("/replays/analyze", { method: "POST", body: formData, headers });
    },
    my: () => request<import("../types").ReplaySummary[]>("/replays"),
    get: (id: string) => request<any>(`/replays/${id}`),
    playerProfile: (name: string) => request<any>(`/replays/player/${encodeURIComponent(name)}`),
    searchPlayers: (q: string) => request<string[]>(`/replays/search/players?q=${encodeURIComponent(q)}`),
    playerProfileSearch: (name: string) => request<any>(`/replays/search/players/profile?name=${encodeURIComponent(name)}`),
  },
  roleRequests: {
    create: (reason?: string) =>
      request<import("../types").RoleRequest>("/role-requests", { method: "POST", body: JSON.stringify({ reason }) }),
    my: () => request<import("../types").RoleRequest[]>("/role-requests/my"),
    all: () => request<import("../types").RoleRequest[]>("/role-requests"),
    approve: (id: string) => request<{ message: string }>(`/role-requests/${id}/approve`, { method: "PATCH" }),
    reject: (id: string) => request<{ message: string }>(`/role-requests/${id}/reject`, { method: "PATCH" }),
  },
  admin: {
    users: () => request<import("../types").User[]>("/admin/users"),
    updateRole: (id: string, role: import("../types").Role) =>
      request<import("../types").User>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    requests: () => request<import("../types").CoachingRequest[]>("/admin/requests"),
  },
};
