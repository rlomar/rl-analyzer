import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Gamepad2, Users } from "lucide-react";
import { Card, Badge } from "../ui";
import { useApp } from "../../context/AppContext";

const demoReplay = {
  id: "1",
  replayId: "bc-1",
  gameMode: "3v3",
  mapName: "Mannfield (Night)",
  duration: 326,
  overtime: false,
  playlist: "Ranked Doubles",
  blueName: "Blue Team",
  orangeName: "Orange Team",
  blueGoals: 4,
  orangeGoals: 2,
  uploadedAt: new Date().toISOString(),
  playerStats: [
    { id: "ps1", playerName: "DemoPlayer", team: "blue", goals: 2, assists: 1, saves: 3, shots: 5, score: 480, shootingPct: 40, boostAvg: 42, boostWastedPct: 18, avgSpeed: 2150, percentOffensive: 45, percentDefensive: 30, percentNeutral: 25, demosInflicted: 1, demosTaken: 2, distBall: 3200, distMates: 1800 },
    { id: "ps2", playerName: "Teammate1", team: "blue", goals: 1, assists: 2, saves: 1, shots: 3, score: 320, shootingPct: 33, boostAvg: 38, boostWastedPct: 22, avgSpeed: 2080, percentOffensive: 35, percentDefensive: 40, percentNeutral: 25, demosInflicted: 0, demosTaken: 1, distBall: 3800, distMates: 2100 },
    { id: "ps3", playerName: "Teammate2", team: "blue", goals: 1, assists: 1, saves: 2, shots: 4, score: 350, shootingPct: 25, boostAvg: 36, boostWastedPct: 25, avgSpeed: 1950, percentOffensive: 40, percentDefensive: 35, percentNeutral: 25, demosInflicted: 2, demosTaken: 0, distBall: 3500, distMates: 1900 },
    { id: "ps4", playerName: "Opponent1", team: "orange", goals: 1, assists: 0, saves: 2, shots: 4, score: 290, shootingPct: 25, boostAvg: 35, boostWastedPct: 28, avgSpeed: 1950, percentOffensive: 40, percentDefensive: 35, percentNeutral: 25, demosInflicted: 2, demosTaken: 0, distBall: 3600, distMates: 2000 },
    { id: "ps5", playerName: "Opponent2", team: "orange", goals: 0, assists: 1, saves: 1, shots: 2, score: 180, shootingPct: 0, boostAvg: 30, boostWastedPct: 32, avgSpeed: 1880, percentOffensive: 30, percentDefensive: 45, percentNeutral: 25, demosInflicted: 0, demosTaken: 3, distBall: 4200, distMates: 2400 },
    { id: "ps6", playerName: "Opponent3", team: "orange", goals: 1, assists: 0, saves: 0, shots: 3, score: 210, shootingPct: 33, boostAvg: 28, boostWastedPct: 35, avgSpeed: 1750, percentOffensive: 50, percentDefensive: 25, percentNeutral: 25, demosInflicted: 1, demosTaken: 1, distBall: 2800, distMates: 1700 },
  ],
};

function StatRow({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm border-b border-white/5 last:border-0">
      <span className="text-dark-400">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}

export function ReplayDetail() {
  const { setSection } = useApp();
  const [replay] = useState(demoReplay);

  const bluePlayers = replay.playerStats.filter((p) => p.team === "blue");
  const orangePlayers = replay.playerStats.filter((p) => p.team === "orange");

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setSection("replay-history")} className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to History
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{replay.mapName}</h1>
          <div className="flex items-center gap-3 text-sm text-dark-400 mt-1">
            <span className="flex items-center gap-1"><Gamepad2 size={14} /> {replay.gameMode}</span>
            <span className="flex items-center gap-1"><MapPin size={14} /> {Math.floor((replay.duration || 0) / 60)}:{String((replay.duration || 0) % 60).padStart(2, "0")}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {new Date(replay.uploadedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <Badge variant="primary">{replay.playlist || "Ranked"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className={`p-4 border-l-4 border-l-blue-500`}>
          <div className="text-xs text-blue-400 font-medium mb-1">{replay.blueName}</div>
          <div className="text-4xl font-bold text-white">{replay.blueGoals}</div>
        </Card>
        <Card className={`p-4 border-l-4 border-l-orange-500`}>
          <div className="text-xs text-orange-400 font-medium mb-1">{replay.orangeName}</div>
          <div className="text-4xl font-bold text-white">{replay.orangeGoals}</div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Users size={18} /> Blue Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bluePlayers.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="font-medium text-white mb-2 text-sm">{p.playerName}</div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div><div className="text-lg font-bold text-white">{p.goals}</div><div className="text-[10px] text-dark-500">G</div></div>
                <div><div className="text-lg font-bold text-white">{p.assists}</div><div className="text-[10px] text-dark-500">A</div></div>
                <div><div className="text-lg font-bold text-white">{p.saves}</div><div className="text-[10px] text-dark-500">S</div></div>
              </div>
              <div className="text-xs space-y-0.5">
                <StatRow label="Score" value={p.score} />
                <StatRow label="Shooting %" value={`${p.shootingPct}%`} color={p.shootingPct >= 40 ? "text-emerald-400" : "text-amber-400"} />
                <StatRow label="Boost Avg" value={p.boostAvg.toFixed(1)} />
                <StatRow label="Speed" value={Math.round(p.avgSpeed)} />
                <StatRow label="Boost Waste" value={`${p.boostWastedPct}%`} color={p.boostWastedPct > 25 ? "text-red-400" : "text-emerald-400"} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Users size={18} /> Orange Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orangePlayers.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="font-medium text-white mb-2 text-sm">{p.playerName}</div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div><div className="text-lg font-bold text-white">{p.goals}</div><div className="text-[10px] text-dark-500">G</div></div>
                <div><div className="text-lg font-bold text-white">{p.assists}</div><div className="text-[10px] text-dark-500">A</div></div>
                <div><div className="text-lg font-bold text-white">{p.saves}</div><div className="text-[10px] text-dark-500">S</div></div>
              </div>
              <div className="text-xs space-y-0.5">
                <StatRow label="Score" value={p.score} />
                <StatRow label="Shooting %" value={`${p.shootingPct}%`} />
                <StatRow label="Boost Avg" value={p.boostAvg.toFixed(1)} />
                <StatRow label="Speed" value={Math.round(p.avgSpeed)} />
                <StatRow label="Boost Waste" value={`${p.boostWastedPct}%`} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
