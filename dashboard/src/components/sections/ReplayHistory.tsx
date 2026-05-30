import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Gamepad2, ChevronRight } from "lucide-react";
import { Card, Badge } from "../ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import type { ReplaySummary } from "../../types";

export function ReplayHistory() {
  const { setSection, setSelectedRequestId } = useApp();
  const [replays, setReplays] = useState<ReplaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.replays.my()
      .then(setReplays)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const modeIcon = (mode: string) => {
    switch (mode) {
      case "1v1": return "1v1";
      case "2v2": return "2v2";
      case "3v3": return "3v3";
      default: return "?";
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Replay History</h1>
        <p className="text-sm text-dark-400 mt-1">Your uploaded replays and analysis results</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse"><div className="h-4 bg-white/5 rounded w-1/2" /></div>
          ))}
        </div>
      ) : replays.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock size={40} className="mx-auto text-dark-500 mb-3" />
          <p className="text-dark-400">No replays analyzed yet</p>
          <button onClick={() => setSection("analyze-replay")} className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 font-medium">Upload your first replay</button>
        </Card>
      ) : (
        <div className="space-y-3">
          {replays.map((replay, i) => (
            <motion.div
              key={replay.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => { setSelectedRequestId(replay.id); setSection("replay-detail"); }}
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white">
                  {modeIcon(replay.gameMode)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{replay.mapName || "Unknown Map"}</span>
                    <Badge variant={replay.gameMode === "1v1" ? "danger" : replay.gameMode === "2v2" ? "warning" : "primary"}>{replay.gameMode}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dark-400 mt-1">
                    <span className="flex items-center gap-1"><Gamepad2 size={12} /> {replay.blueGoals} - {replay.orangeGoals}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {Math.floor((replay.duration || 0) / 60)}m</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(replay.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-dark-500 flex-shrink-0" />
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
