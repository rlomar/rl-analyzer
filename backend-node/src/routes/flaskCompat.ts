import { Router, Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { uploadReplayBuffer, pollReplay, extractPlayerStats } from "../services/ballchasing";
import { analyzePlayers, generateAnalysisResult, type AnalyzedPlayer } from "../services/analyzer";
import { computeTeamAnalysis } from "../services/trends";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function getApiKey(req: Request): string {
  return (req.headers["x-api-key"] as string) || "";
}

function toFlaskPlayer(p: AnalyzedPlayer) {
  return {
    name: p.playerName,
    team_key: p.team,
    stats: {
      goals: p.goals,
      assists: p.assists,
      saves: p.saves,
      shots: p.shots,
      shooting_pct: p.shootingPct,
      score: p.score,
      boost_avg: p.boostAvg,
      boost_collected: p.boostCollected,
      boost_stolen: p.boostStolen,
      count_big_pads: p.bigPads,
      count_small_pads: p.smallPads,
      boost_wasted_pct: p.boostWastedPct,
      percent_zero_boost: p.percentZeroBoost,
      percent_full_boost: p.percentFullBoost,
      overfill_pct: p.overfillPct,
      avg_speed: p.avgSpeed,
      total_distance: p.totalDistance,
      time_supersonic_speed_pct: p.percentSupersonic,
      time_slow_speed_pct: p.timeSlowSpeed,
      ground_pct: p.groundPct,
      air_pct: p.airPct,
      percent_offensive: p.percentOffensive,
      percent_defensive: p.percentDefensive,
      percent_neutral: p.percentNeutral,
      avg_distance_ball: p.distBall,
      avg_distance_mates: p.distMates,
      time_behind_ball: p.timeBehindBall,
      time_infront_ball: p.timeInfrontBall,
      demos_inflicted: p.demosInflicted,
      demos_taken: p.demosTaken,
      count_powerslide: p.countPowerslide,
      goals_against_last_defender: p.goalsAgainstLastDefender,
    },
    tips: (p.tips || []).map((t) => ({
      title: t.category || "",
      advice: t.message || "",
      priority: t.priority || "low",
    })),
  };
}

export default function flaskCompatRoutes(prisma: PrismaClient) {
  router.post("/analyze", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const apiKey = getApiKey(req);
      if (!apiKey) {
        res.status(400).json({ error: "API key, first" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "ما رفعت ملف" });
        return;
      }

      const { replay_id } = await uploadReplayBuffer(req.file.buffer, apiKey);

      const data = await pollReplay(replay_id, apiKey);

      const { players: rawPlayers, gameMode, blueName, orangeName } = extractPlayerStats(data);

      const analyzed = analyzePlayers(rawPlayers, blueName, orangeName, gameMode);
      const result = generateAnalysisResult(analyzed, data);

      const game_info = {
        map: result.mapName,
        duration: result.duration,
        overtime: result.overtime,
        playlist: result.playlist,
        blue_name: result.blueName,
        orange_name: result.orangeName,
        blue_goals: result.blueGoals,
        orange_goals: result.orangeGoals,
      };

      const players = analyzed.map(toFlaskPlayer);

      let team_analysis = null;
      if (gameMode === "3v3" || gameMode === "2v2" || gameMode === "scrim") {
        const bluePlayers = analyzed.filter((p) => p.team === "blue");
        const orangePlayers = analyzed.filter((p) => p.team === "orange");
        const ta = computeTeamAnalysis(bluePlayers, orangePlayers);
        team_analysis = {
          blue: {
            name: result.blueName,
            goals: ta.blue.goals,
            opponent_goals: ta.orange.goals,
            avg_speed: ta.blue.avgSpeed,
            avg_boost: Math.round(bluePlayers.reduce((s, p) => s + p.boostAvg, 0) / (bluePlayers.length || 1)),
            total_shots: ta.blue.shots,
            total_saves: ta.blue.saves,
            total_assists: ta.blue.assists,
            demos_inflicted: ta.blue.demosInflicted,
            avg_distance_ball: Math.round(bluePlayers.reduce((s, p) => s + p.distBall, 0) / (bluePlayers.length || 1)),
            avg_distance_mates: Math.round(bluePlayers.reduce((s, p) => s + p.distMates, 0) / (bluePlayers.length || 1)),
            total_score: ta.blue.score,
            tips: [],
          },
          orange: {
            name: result.orangeName,
            goals: ta.orange.goals,
            opponent_goals: ta.blue.goals,
            avg_speed: ta.orange.avgSpeed,
            avg_boost: Math.round(orangePlayers.reduce((s, p) => s + p.boostAvg, 0) / (orangePlayers.length || 1)),
            total_shots: ta.orange.shots,
            total_saves: ta.orange.saves,
            total_assists: ta.orange.assists,
            demos_inflicted: ta.orange.demosInflicted,
            avg_distance_ball: Math.round(orangePlayers.reduce((s, p) => s + p.distBall, 0) / (orangePlayers.length || 1)),
            avg_distance_mates: Math.round(orangePlayers.reduce((s, p) => s + p.distMates, 0) / (orangePlayers.length || 1)),
            total_score: ta.orange.score,
            tips: [],
          },
        };
      }

      res.json({
        success: true,
        replay_id,
        game_info,
        players,
        trends: {},
        team_analysis,
        new_achievements: [],
      });
    } catch (error: any) {
      console.error("Flask compat analyze error:", error);
      res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });

  router.get("/me", (_req: Request, res: Response) => {
    res.json({ user: null, user_id: null });
  });

  router.get("/user/profile", (_req: Request, res: Response) => {
    res.json({ error: "Not authenticated" });
  });
  router.get("/user/history", (_req: Request, res: Response) => {
    res.json({ history: [] });
  });
  router.get("/user/settings", (_req: Request, res: Response) => {
    res.json({ settings: {} });
  });
  router.post("/user/settings", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.post("/user/link-player", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.post("/user/update-profile", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.get("/user/achievements", (_req: Request, res: Response) => {
    res.json({ achievements: [] });
  });
  router.get("/user/radar", (_req: Request, res: Response) => {
    res.json({ radar: null });
  });

  router.get("/history/:playerName", (_req: Request, res: Response) => {
    res.json({ history: [] });
  });
  router.get("/players/search", (_req: Request, res: Response) => {
    res.json({ players: [] });
  });
  router.get("/players/profile/:playerName", (_req: Request, res: Response) => {
    res.json({ error: "Player not found" });
  });
  router.get("/players", (_req: Request, res: Response) => {
    res.json({ players: [] });
  });
  router.post("/user/follow", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.post("/user/unfollow", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.get("/user/followers", (_req: Request, res: Response) => {
    res.json({ followers: [] });
  });
  router.get("/user/following", (_req: Request, res: Response) => {
    res.json({ following: [] });
  });
  router.get("/user/online-status", (_req: Request, res: Response) => {
    res.json({ online: false });
  });
  router.post("/user/block", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.post("/user/unblock", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.get("/user/blocked", (_req: Request, res: Response) => {
    res.json({ blocked: [] });
  });
  router.get("/trends/:playerName", (_req: Request, res: Response) => {
    res.json({ error: "No info", games: 0 });
  });

  return router;
}
