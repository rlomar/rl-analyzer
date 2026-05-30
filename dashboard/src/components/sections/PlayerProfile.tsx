import { useState } from "react";
import { motion } from "framer-motion";
import { Search, User, Target, Zap, Shield, Activity } from "lucide-react";
import { Button, Card, Input } from "../ui";

interface PlayerAverages {
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  score: number;
  shootingPct: number;
  boostAvg: number;
  avgSpeed: number;
  demosInflicted: number;
}

const demoProfile = {
  playerName: "DemoPlayer",
  totalReplays: 42,
  averages: {
    goals: 1.8,
    assists: 1.2,
    saves: 2.1,
    shots: 4.5,
    score: 380,
    shootingPct: 35.2,
    boostAvg: 38.5,
    avgSpeed: 2050,
    demosInflicted: 1.3,
  } as PlayerAverages,
  recentReplays: [
    { id: "1", mapName: "Mannfield (Night)", gameMode: "3v3", goals: 2, assists: 1, saves: 3, score: 480, uploadedAt: new Date().toISOString() },
    { id: "2", mapName: "DFH Stadium", gameMode: "2v2", goals: 1, assists: 2, saves: 1, score: 320, uploadedAt: new Date(Date.now() - 86400000).toISOString() },
  ],
};

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <Card className="p-4 text-center">
      <Icon size={20} className="mx-auto text-indigo-400 mb-2" />
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-dark-400">{label}</div>
      {sub && <div className="text-[10px] text-dark-500 mt-0.5">{sub}</div>}
    </Card>
  );
}

export function PlayerProfile() {
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<typeof demoProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!search.trim() || search.length < 2) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setProfile(demoProfile);
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Player Profile</h1>
        <p className="text-sm text-dark-400 mt-1">Search for a player and view their stats across all replays</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search player name..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleSearch()} />
          </div>
          <Button onClick={handleSearch} disabled={loading || search.length < 2}>
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />}
            Search
          </Button>
        </div>
      </Card>

      {profile && (
        <>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-xl">DP</div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile.playerName}</h2>
              <p className="text-sm text-dark-400">{profile.totalReplays} replays analyzed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Goals/Game" value={profile.averages.goals.toFixed(1)} icon={Target} />
            <StatCard label="Saves/Game" value={profile.averages.saves.toFixed(1)} icon={Shield} />
            <StatCard label="Score/Game" value={profile.averages.score} icon={Activity} sub={`${profile.averages.shots.toFixed(1)} shots`} />
            <StatCard label="Shooting %" value={`${profile.averages.shootingPct.toFixed(1)}%`} icon={Target} />
            <StatCard label="Boost Avg" value={profile.averages.boostAvg.toFixed(1)} icon={Zap} />
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Replays</h3>
            <div className="space-y-2">
              {profile.recentReplays.map((replay) => (
                <div key={replay.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-dark-400 bg-white/5 px-2 py-0.5 rounded">{replay.gameMode}</span>
                    <span className="text-white">{replay.mapName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dark-400">
                    <span>{replay.goals}G</span>
                    <span>{replay.assists}A</span>
                    <span>{replay.saves}S</span>
                    <span className="text-white">{replay.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!profile && (
        <Card className="p-12 text-center">
          <User size={40} className="mx-auto text-dark-500 mb-3" />
          <p className="text-dark-400">Search for a player to see their stats</p>
        </Card>
      )}
    </motion.div>
  );
}
