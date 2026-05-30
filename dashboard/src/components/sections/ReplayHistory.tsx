import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Gamepad2, ChevronRight } from "lucide-react";
import { Card, Badge } from "../ui";
import { useApp } from "../../context/AppContext";
import type { ReplaySummary } from "../../types";

const demoReplays: ReplaySummary[] = [
  { id: "1", replayId: "bc-1", gameMode: "3v3", mapName: "Mannfield (Night)", duration: 326, overtime: false, blueName: "Blue Team", orangeName: "Orange Team", blueGoals: 4, orangeGoals: 2, uploadedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", replayId: "bc-2", gameMode: "2v2", mapName: "DFH Stadium", duration: 298, overtime: true, blueName: "Team A", orangeName: "Team B", blueGoals: 3, orangeGoals: 3, uploadedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "3", replayId: "bc-3", gameMode: "1v1", mapName: "Urban Central", duration: 245, overtime: false, blueName: "Player 1", orangeName: "Player 2", blueGoals: 5, orangeGoals: 1, uploadedAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "4", replayId: "bc-4", gameMode: "3v3", mapName: "Champions Field", duration: 412, overtime: false, blueName: "Winners", orangeName: "Losers", blueGoals: 2, orangeGoals: 3, uploadedAt: new Date(Date.now() - 259200000).toISOString() },
];

export function ReplayHistory() {
  const { setSection, setSelectedRequestId } = useApp();
  const [replays] = useState<ReplaySummary[]>(demoReplays);

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

      {replays.length === 0 ? (
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
