import { motion } from "framer-motion";
import { TrendingUp, Target, Zap } from "lucide-react";
import { Card } from "../ui";
import { RankProgress } from "../cards/RankProgress";

const insights = [
  { icon: Target, label: "Shot Accuracy", value: "68%", change: "+12%", positive: true },
  { icon: Zap, label: "Boost Management", value: "Good", change: "Improved", positive: true },
  { icon: TrendingUp, label: "Win Rate", value: "55%", change: "+5%", positive: true },
];

export function ProgressSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Progress</h1>
        <p className="text-sm text-dark-400 mt-1">Track your improvement</p>
      </div>

      <RankProgress currentRank="Platinum" sessions={12} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <Card key={insight.label} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-indigo-400" />
                <span className="text-xs font-medium text-dark-400">{insight.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{insight.value}</p>
              <span className={`text-xs font-medium ${insight.positive ? "text-green-400" : "text-red-400"}`}>
                {insight.change}
              </span>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
