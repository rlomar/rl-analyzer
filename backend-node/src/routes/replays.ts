import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth";
import { uploadReplayBuffer, pollReplay, extractPlayerStats } from "../services/ballchasing";
import { analyzePlayers, generateAnalysisResult, type AnalyzedPlayer } from "../services/analyzer";
import { computeTrend, computeTeamAnalysis } from "../services/trends";
import { checkAchievements } from "../services/achievements";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

interface BallchasingApiKeyRequest extends AuthRequest {
  apiKey?: string;
}

function getApiKey(req: AuthRequest): string {
  return req.headers["x-api-key"] as string || process.env.BALLCHASING_API_KEY || "";
}

export default function replayRoutes(prisma: PrismaClient) {
  router.post("/analyze", authenticate, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const apiKey = getApiKey(req);
      if (!apiKey) return res.status(400).json({ error: "Ballchasing API key required. Set via X-API-Key header" });

      if (!req.file) return res.status(400).json({ error: "No replay file uploaded" });

      const { replay_id } = await uploadReplayBuffer(req.file.buffer, apiKey);

      const data = await pollReplay(replay_id, apiKey);

      const { players, gameMode, blueName, orangeName } = extractPlayerStats(data);

      const analyzed = analyzePlayers(players, blueName, orangeName, gameMode);

      const result = generateAnalysisResult(analyzed, data);

      const userPlayerName = req.body.playerName || players[0]?.name || "Unknown";
      const userPlayer = analyzed.find((p) => p.playerName === userPlayerName);

      const replay = await prisma.replay.create({
        data: {
          replayId: replay_id,
          gameMode: gameMode as any,
          mapName: result.mapName,
          duration: result.duration,
          overtime: result.overtime,
          playlist: result.playlist,
          blueName: result.blueName,
          orangeName: result.orangeName,
          blueGoals: result.blueGoals,
          orangeGoals: result.orangeGoals,
          userId: req.userId!,
          userPlayerName,
        },
      });

      const playerStatsData = analyzed.map((p) => ({
        replayId: replay.id,
        playerName: p.playerName,
        team: p.team,
        goals: p.goals,
        assists: p.assists,
        saves: p.saves,
        shots: p.shots,
        score: p.score,
        shootingPct: p.shootingPct || null,
        boostAvg: p.boostAvg || null,
        boostCollected: p.boostCollected || null,
        boostStolen: p.boostStolen || null,
        bigPads: p.bigPads || null,
        smallPads: p.smallPads || null,
        boostWastedPct: p.boostWastedPct || null,
        overfillPct: p.overfillPct || null,
        percentZeroBoost: p.percentZeroBoost || null,
        percentFullBoost: p.percentFullBoost || null,
        avgSpeed: p.avgSpeed || null,
        totalDistance: p.totalDistance || null,
        percentSupersonic: p.percentSupersonic || null,
        timeSlowSpeed: p.timeSlowSpeed || null,
        groundPct: p.groundPct || null,
        airPct: p.airPct || null,
        percentOffensive: p.percentOffensive || null,
        percentDefensive: p.percentDefensive || null,
        percentNeutral: p.percentNeutral || null,
        distBall: p.distBall || null,
        distMates: p.distMates || null,
        timeBehindBall: p.timeBehindBall || null,
        timeInfrontBall: p.timeInfrontBall || null,
        goalsAgainstLastDefender: p.goalsAgainstLastDefender,
        demosInflicted: p.demosInflicted,
        demosTaken: p.demosTaken,
        countPowerslide: p.countPowerslide,
      }));

      for (const statData of playerStatsData) {
        await prisma.playerStat.create({ data: statData });
      }

      if (result.gameMode === "3v3" || result.gameMode === "scrim") {
        const bluePlayers = analyzed.filter((p) => p.team === "blue");
        const orangePlayers = analyzed.filter((p) => p.team === "orange");
        const teamAnalysis = computeTeamAnalysis(bluePlayers, orangePlayers);

        await prisma.teamStat.create({
          data: {
            replayId: replay.id,
            team: "blue",
            shots: teamAnalysis.blue.shots,
            goals: teamAnalysis.blue.goals,
            saves: teamAnalysis.blue.saves,
            assists: teamAnalysis.blue.assists,
            score: teamAnalysis.blue.score,
            boostCollected: teamAnalysis.blue.boostCollected,
            avgSpeed: teamAnalysis.blue.avgSpeed,
            demosInflicted: teamAnalysis.blue.demosInflicted,
            demosTaken: teamAnalysis.blue.demosTaken,
          },
        });

        await prisma.teamStat.create({
          data: {
            replayId: replay.id,
            team: "orange",
            shots: teamAnalysis.orange.shots,
            goals: teamAnalysis.orange.goals,
            saves: teamAnalysis.orange.saves,
            assists: teamAnalysis.orange.assists,
            score: teamAnalysis.orange.score,
            boostCollected: teamAnalysis.orange.boostCollected,
            avgSpeed: teamAnalysis.orange.avgSpeed,
            demosInflicted: teamAnalysis.orange.demosInflicted,
            demosTaken: teamAnalysis.orange.demosTaken,
          },
        });
      }

      const existingAchievements = await prisma.userAchievement.findMany({
        where: { userId: req.userId },
        select: { achievement: { select: { key: true } } },
      });
      const existingKeys = existingAchievements.map((a) => a.achievement.key);

      const newKeys = checkAchievements(analyzed, userPlayerName, existingKeys);

      for (const key of newKeys) {
        const ach = await prisma.achievement.findUnique({ where: { key } });
        if (ach) {
          await prisma.userAchievement.create({
            data: { userId: req.userId!, achievementId: ach.id },
          });
        }
      }

      const newAchievements = await prisma.achievement.findMany({
        where: { key: { in: newKeys } },
      });

      const userPlayerStats = analyzed.find((p) => p.playerName === userPlayerName) || null;

      res.json({
        replay: { id: replay.id, replayId: replay_id, gameMode: result.gameMode },
        gameInfo: {
          map: result.mapName,
          duration: result.duration,
          overtime: result.overtime,
          blueName: result.blueName,
          orangeName: result.orangeName,
          blueGoals: result.blueGoals,
          orangeGoals: result.orangeGoals,
        },
        players: analyzed,
        userPlayer: userPlayerStats,
        newAchievements,
      });
    } catch (error: any) {
      console.error("Analyze error:", error);
      res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });

  router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const replays = await prisma.replay.findMany({
        where: { userId: req.userId },
        orderBy: { uploadedAt: "desc" },
        include: {
          playerStats: {
            take: 1,
          },
        },
      });
      res.json(replays);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/all", authenticate, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
    try {
      const replays = await prisma.replay.findMany({
        orderBy: { uploadedAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      res.json(replays);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const replay = await prisma.replay.findUnique({
        where: { id: req.params.id },
        include: { playerStats: true, teamStats: true },
      });
      if (!replay) return res.status(404).json({ error: "Replay not found" });
      if (replay.userId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      res.json(replay);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/player/:playerName", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const playerName = req.params.playerName;
      const replays = await prisma.replay.findMany({
        where: {
          playerStats: { some: { playerName } },
        },
        orderBy: { uploadedAt: "desc" },
        include: { playerStats: { where: { playerName } } },
      });

      const allStats: AnalyzedPlayer[] = [];
      for (const replay of replays) {
        for (const stat of replay.playerStats) {
          allStats.push(stat as any);
        }
      }

      const recentStats = allStats.slice(0, 10);
      const averages = recentStats.length > 0 ? {
        shootingPct: recentStats.reduce((s, p) => s + (p.shootingPct || 0), 0) / recentStats.length,
        boostAvg: recentStats.reduce((s, p) => s + (p.boostAvg || 0), 0) / recentStats.length,
        avgSpeed: recentStats.reduce((s, p) => s + (p.avgSpeed || 0), 0) / recentStats.length,
        goals: Math.round(recentStats.reduce((s, p) => s + p.goals, 0) / recentStats.length),
        saves: Math.round(recentStats.reduce((s, p) => s + p.saves, 0) / recentStats.length),
        assists: Math.round(recentStats.reduce((s, p) => s + p.assists, 0) / recentStats.length),
        demosInflicted: Math.round(recentStats.reduce((s, p) => s + p.demosInflicted, 0) / recentStats.length),
        boostWastedPct: recentStats.reduce((s, p) => s + (p.boostWastedPct || 0), 0) / recentStats.length,
      } : null;

      res.json({ playerName, replays, averages, totalReplays: replays.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id/trends", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const replayId = req.params.id;
      const replay = await prisma.replay.findUnique({
        where: { id: replayId },
        include: { playerStats: true },
      });
      if (!replay) return res.status(404).json({ error: "Replay not found" });

      const trends = await prisma.trend.findMany({
        where: { replayId },
      });

      res.json({ trends, playerStats: replay.playerStats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/search/players", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      if (q.length < 2) return res.json([]);

      const stats = await prisma.playerStat.findMany({
        where: { playerName: { contains: q, mode: "insensitive" } },
        select: { playerName: true },
        distinct: ["playerName"],
        take: 20,
      });
      res.json(stats.map((s) => s.playerName));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/search/players/profile", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const name = req.query.name as string;
      if (!name) return res.status(400).json({ error: "Player name required" });

      const replays = await prisma.replay.findMany({
        where: { playerStats: { some: { playerName: name } } },
        orderBy: { uploadedAt: "desc" },
        include: { playerStats: { where: { playerName: name } } },
        take: 20,
      });

      const allStats: any[] = [];
      for (const replay of replays) {
        for (const stat of replay.playerStats) {
          allStats.push({ ...stat, mapName: replay.mapName, gameMode: replay.gameMode, uploadedAt: replay.uploadedAt });
        }
      }

      const statsRecent = allStats.slice(0, 10);
      const avg = (field: string) => statsRecent.length > 0 ? statsRecent.reduce((s: number, p: any) => s + (p[field] || 0), 0) / statsRecent.length : 0;

      res.json({
        playerName: name,
        totalReplays: allStats.length,
        averages: {
          goals: Math.round(avg("goals")),
          assists: Math.round(avg("assists")),
          saves: Math.round(avg("saves")),
          shots: Math.round(avg("shots")),
          score: Math.round(avg("score")),
          shootingPct: Math.round(avg("shootingPct") * 100) / 100,
          boostAvg: Math.round(avg("boostAvg") * 100) / 100,
          avgSpeed: Math.round(avg("avgSpeed")),
          demosInflicted: Math.round(avg("demosInflicted")),
        },
        recentReplays: allStats,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
