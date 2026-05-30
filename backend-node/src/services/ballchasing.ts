const BALLCHASING_API = "https://ballchasing.com/api";

interface BallchasingReplay {
  id: string;
  link: string;
  created: string;
  status: string;
  title?: string;
  map_name?: string;
  duration?: number;
  overtime?: boolean;
  playlist_name?: string;
  playlist_id?: string;
  blue?: TeamData;
  orange?: TeamData;
  blue_goals?: number;
  orange_goals?: number;
}

interface TeamData {
  name?: string;
  players: PlayerRaw[];
  stats?: TeamStatsRaw;
}

interface PlayerRaw {
  id?: { platform: { label: string } };
  name: string;
  stats: {
    core: { goals: number; assists: number; saves: number; shots: number; score: number; shooting_percentage: number };
    boost: { boost_avg: number; boost_collected: number; boost_stolen: number; num_pads_big: number; num_pads_small: number; amount_collected_big: number; amount_collected_small: number; amount_stolen_big: number; amount_stolen_small: number; boost_usage: number; wasted_collection: number; wasted_usage: number; wasted_bottom: number; time_zero_boost: number; time_full_boost: number; percent_zero_boost: number; percent_full_boost: number };
    movement: { avg_speed: number; total_distance: number; time_supersonic_speed: number; time_boost_speed: number; time_slow_speed: number; percent_slow_speed: number; percent_boost_speed: number; percent_supersonic_speed: number };
    positioning: { avg_distance_to_ball: number; avg_distance_to_mates: number; time_defensive_third: number; time_neutral_third: number; time_offensive_third: number; time_behind_ball: number; time_infront_ball: number; percent_defensive_third: number; percent_neutral_third: number; percent_offensive_third: number; most_back: string; most_forward: string; closest_to_ball: string; farthest_from_ball: string };
    demo: { demos_inflicted: number; demos_taken: number };
    ball: { goals_against_while_last_defender: number };
  };
  count_powerslide?: number;
}

interface TeamStatsRaw {
  ball: { possession_time: number; time_in_defensive_half: number; time_in_midfield: number; time_in_offensive_half: number };
  core: { goals: number; assists: number; saves: number; shots: number; score: number };
  boost: { boost_collected: number; boost_stolen: number };
  movement: { avg_speed: number; total_distance: number };
  demo: { demos_inflicted: number; demos_taken: number };
}

function detectPlaylist(playlistName?: string, blue?: TeamData, orange?: TeamData): string {
  if (!playlistName) return "3v3";
  const lower = playlistName.toLowerCase();
  if (lower.includes("duel")) return "1v1";
  if (lower.includes("double")) return "2v2";
  if (lower.includes("standard")) return "3v3";
  if (lower.includes("chaos")) return "4v4";
  const blueCount = blue?.players?.length ?? 0;
  const orangeCount = orange?.players?.length ?? 0;
  if (blueCount <= 1 && orangeCount <= 1) return "1v1";
  if (blueCount <= 2 && orangeCount <= 2) return "2v2";
  return "3v3";
}

export async function uploadReplay(file: File | Buffer, filename: string, apiKey: string): Promise<{ replay_id: string }> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file, filename);
  }

  const res = await fetch(`${BALLCHASING_API}/v2/upload`, {
    method: "POST",
    headers: { Authorization: apiKey },
    body: file instanceof File ? formData : undefined,
  });

  if (res.status === 409) {
    const data: any = await res.json();
    return { replay_id: data.id || data.replay_id };
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ballchasing upload failed (${res.status}): ${err}`);
  }

  const data: any = await res.json();
  return { replay_id: data.id };
}

export async function uploadReplayBuffer(buffer: Buffer, apiKey: string): Promise<{ replay_id: string }> {
  const res = await fetch(`${BALLCHASING_API}/v2/upload`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
    },
    body: buffer,
  });

  if (res.status === 409) {
    const data: any = await res.json();
    return { replay_id: data.id || data.replay_id };
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ballchasing upload failed (${res.status}): ${err}`);
  }

  const data: any = await res.json();
  return { replay_id: data.id };
}

export async function pollReplay(replayId: string, apiKey: string, maxAttempts = 15): Promise<BallchasingReplay> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BALLCHASING_API}/replays/${replayId}`, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      if (res.status === 404 && i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw new Error(`Ballchasing fetch failed: ${res.status}`);
    }

    const rawData: any = await res.json();
    const data = rawData as BallchasingReplay;

    if (data.status === "ok" && data.blue?.players?.length && data.orange?.players?.length) {
      return data;
    }

    if (data.blue_goals !== undefined && data.orange_goals !== undefined) {
      return data;
    }

    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  throw new Error("Replay analysis timed out");
}

export function extractPlayerStats(data: BallchasingReplay): {
  players: PlayerRaw[];
  gameMode: string;
  blueName: string;
  orangeName: string;
} {
  const gameMode = detectPlaylist(data.playlist_name, data.blue, data.orange);
  const blueName = data.blue?.name || data.blue?.players?.[0]?.name || "Blue";
  const orangeName = data.orange?.name || data.orange?.players?.[0]?.name || "Orange";

  const bluePlayers = (data.blue?.players || []).map((p) => ({ ...p, team: "blue" as const }));
  const orangePlayers = (data.orange?.players || []).map((p) => ({ ...p, team: "orange" as const }));

  return {
    players: [...bluePlayers, ...orangePlayers] as any,
    gameMode,
    blueName,
    orangeName,
  };
}

export type { BallchasingReplay, PlayerRaw, TeamStatsRaw };
