export type Role = "user" | "coach" | "admin";

export type RequestStatus = "pending" | "accepted" | "rejected" | "completed";

export type RoleRequestStatus = "pending" | "approved" | "rejected";

export interface RoleRequest {
  id: string;
  userId: string;
  reason: string | null;
  status: RoleRequestStatus;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; role: Role };
}

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

export interface PlayerStat {
  id: string;
  replayId: string;
  playerName: string;
  team: string;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  score: number;
  shootingPct: number | null;
  boostAvg: number | null;
  boostCollected: number | null;
  boostStolen: number | null;
  bigPads: number | null;
  smallPads: number | null;
  boostWastedPct: number | null;
  overfillPct: number | null;
  percentZeroBoost: number | null;
  percentFullBoost: number | null;
  avgSpeed: number | null;
  totalDistance: number | null;
  percentSupersonic: number | null;
  timeSlowSpeed: number | null;
  groundPct: number | null;
  airPct: number | null;
  percentOffensive: number | null;
  percentDefensive: number | null;
  percentNeutral: number | null;
  distBall: number | null;
  distMates: number | null;
  timeBehindBall: number | null;
  timeInfrontBall: number | null;
  goalsAgainstLastDefender: number;
  demosInflicted: number;
  demosTaken: number;
  countPowerslide: number;
}

export interface ReplaySummary {
  id: string;
  replayId: string;
  gameMode: string;
  mapName: string | null;
  duration: number | null;
  overtime: boolean;
  blueName: string | null;
  orangeName: string | null;
  blueGoals: number | null;
  orangeGoals: number | null;
  uploadedAt: string;
  playerStats?: PlayerStat[];
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
  | "admin-requests"
  | "admin-role-requests"
  | "analyze-replay"
  | "replay-history"
  | "player-profile"
  | "replay-detail";
