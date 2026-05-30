import { Trophy } from "lucide-react";
import { Card } from "../ui";

const ranks = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "GC", "SSL"];

export function RankProgress({ currentRank = "Gold", sessions = 12 }: { currentRank?: string; sessions?: number }) {
  const currentIdx = ranks.indexOf(currentRank);
  const progress = currentIdx >= 0 ? ((currentIdx + 1) / ranks.length) * 100 : 0;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-amber-400" />
        <h3 className="font-semibold text-white text-sm">Rank Progress</h3>
      </div>
      <div className="flex items-center justify-between text-xs text-dark-400 mb-2">
        <span>{currentRank}</span>
        <span>{sessions} sessions</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full gradient-primary transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        {ranks.map((r, i) => (
          <span
            key={r}
            className={`text-[8px] font-medium ${i <= currentIdx ? "text-indigo-400" : "text-dark-600"}`}
          >
            {r === "Grand Champion" ? "GC" : r === "Supersonic Legend" ? "SSL" : r[0]}
          </span>
        ))}
      </div>
    </Card>
  );
}
