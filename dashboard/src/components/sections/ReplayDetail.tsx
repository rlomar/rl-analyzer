import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Gamepad2, Users } from "lucide-react";
import { Card, Badge } from "../ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

function StatRow({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm border-b border-white/5 last:border-0">
      <span className="text-dark-400">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}

export function ReplayDetail() {
  const { setSection, selectedRequestId } = useApp();
  const [replay, setReplay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedRequestId) {
      setLoading(false);
      return;
    }
    api.replays.get(selectedRequestId)
      .then(setReplay)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedRequestId]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 max-w-5xl mx-auto">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-white/5 rounded w-1/3" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
          <div className="h-24 bg-white/5 rounded" />
        </div>
      </motion.div>
    );
  }

  if (error || !replay) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 max-w-5xl mx-auto">
        <button onClick={() => setSection("replay-history")} className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={16} /> Back to History
        </button>
        <Card className="p-12 text-center">
          <p className="text-dark-400">{error || "Replay not found"}</p>
        </Card>
      </motion.div>
    );
  }

  const bluePlayers = replay.playerStats?.filter((p: any) => p.team === "blue") || [];
  const orangePlayers = replay.playerStats?.filter((p: any) => p.team === "orange") || [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setSection("replay-history")} className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to History
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{replay.mapName || "Unknown Map"}</h1>
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
          <div className="text-xs text-blue-400 font-medium mb-1">{replay.blueName || "Blue"}</div>
          <div className="text-4xl font-bold text-white">{replay.blueGoals ?? 0}</div>
        </Card>
        <Card className={`p-4 border-l-4 border-l-orange-500`}>
          <div className="text-xs text-orange-400 font-medium mb-1">{replay.orangeName || "Orange"}</div>
          <div className="text-4xl font-bold text-white">{replay.orangeGoals ?? 0}</div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Users size={18} /> Blue Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bluePlayers.map((p: any) => (
            <Card key={p.id} className="p-4">
              <div className="font-medium text-white mb-2 text-sm">{p.playerName}</div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div><div className="text-lg font-bold text-white">{p.goals}</div><div className="text-[10px] text-dark-500">G</div></div>
                <div><div className="text-lg font-bold text-white">{p.assists}</div><div className="text-[10px] text-dark-500">A</div></div>
                <div><div className="text-lg font-bold text-white">{p.saves}</div><div className="text-[10px] text-dark-500">S</div></div>
              </div>
              <div className="text-xs space-y-0.5">
                <StatRow label="Score" value={p.score} />
                <StatRow label="Shooting %" value={`${p.shootingPct ?? 0}%`} color={(p.shootingPct ?? 0) >= 40 ? "text-emerald-400" : "text-amber-400"} />
                <StatRow label="Boost Avg" value={(p.boostAvg ?? 0).toFixed(1)} />
                <StatRow label="Speed" value={Math.round(p.avgSpeed || 0)} />
                <StatRow label="Boost Waste" value={`${p.boostWastedPct ?? 0}%`} color={(p.boostWastedPct ?? 0) > 25 ? "text-red-400" : "text-emerald-400"} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Users size={18} /> Orange Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orangePlayers.map((p: any) => (
            <Card key={p.id} className="p-4">
              <div className="font-medium text-white mb-2 text-sm">{p.playerName}</div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div><div className="text-lg font-bold text-white">{p.goals}</div><div className="text-[10px] text-dark-500">G</div></div>
                <div><div className="text-lg font-bold text-white">{p.assists}</div><div className="text-[10px] text-dark-500">A</div></div>
                <div><div className="text-lg font-bold text-white">{p.saves}</div><div className="text-[10px] text-dark-500">S</div></div>
              </div>
              <div className="text-xs space-y-0.5">
                <StatRow label="Score" value={p.score} />
                <StatRow label="Shooting %" value={`${p.shootingPct ?? 0}%`} />
                <StatRow label="Boost Avg" value={(p.boostAvg ?? 0).toFixed(1)} />
                <StatRow label="Speed" value={Math.round(p.avgSpeed || 0)} />
                <StatRow label="Boost Waste" value={`${p.boostWastedPct ?? 0}%`} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
