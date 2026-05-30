import { useState } from "react";
import { motion } from "framer-motion";
import { Search, User, Target, Zap, Shield, Activity } from "lucide-react";
import { Button, Card, Input } from "../ui";
import { api } from "../../lib/api";

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
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!search.trim() || search.length < 2) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.replays.playerProfileSearch(search.trim());
      setProfile(res);
    } catch (err: any) {
      setError(err.message || "Player not found");
      setProfile(null);
    } finally {
      setLoading(false);
    }
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
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </Card>

      {profile && (
        <>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-xl">{profile.playerName.charAt(0).toUpperCase()}</div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile.playerName}</h2>
              <p className="text-sm text-dark-400">{profile.totalReplays} replays analyzed</p>
            </div>
          </div>

          {profile.averages && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Goals/Game" value={profile.averages.goals?.toFixed(1) || "0"} icon={Target} />
              <StatCard label="Saves/Game" value={profile.averages.saves?.toFixed(1) || "0"} icon={Shield} />
              <StatCard label="Score/Game" value={profile.averages.score || 0} icon={Activity} sub={`${profile.averages.shots?.toFixed(1) || "0"} shots`} />
              <StatCard label="Shooting %" value={profile.averages.shootingPct ? `${profile.averages.shootingPct.toFixed(1)}%` : "0%"} icon={Target} />
              <StatCard label="Boost Avg" value={profile.averages.boostAvg?.toFixed(1) || "0"} icon={Zap} />
            </div>
          )}

          {profile.recentReplays?.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Replays</h3>
              <div className="space-y-2">
                {profile.recentReplays.map((replay: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] text-sm">
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
          )}
        </>
      )}

      {!profile && !error && (
        <Card className="p-12 text-center">
          <User size={40} className="mx-auto text-dark-500 mb-3" />
          <p className="text-dark-400">Search for a player to see their stats</p>
        </Card>
      )}
    </motion.div>
  );
}
