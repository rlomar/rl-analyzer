export type Role = "user" | "coach" | "admin";

export type RequestStatus = "pending" | "accepted" | "rejected" | "completed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface CoachingRequest {
  id: string;
  userId: string;
  coachId: string | null;
  rank: string;
  problemType: string;
  description: string;
  status: RequestStatus;
  coachNotes: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  coach?: { id: string; name: string; email: string } | null;
}

export type Section =
  | "login"
  | "register"
  | "dashboard"
  | "my-requests"
  | "create-request"
  | "request-detail"
  | "coaches"
  | "messages"
  | "progress"
  | "settings"
  | "incoming-requests"
  | "sessions"
  | "admin-overview"
  | "admin-users"
  | "admin-requests";
