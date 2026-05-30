import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, BarChart3, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Card, Badge, Input } from "../ui";

interface PlayerStats {
  playerName: string;
  team: string;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  score: number;
  shootingPct: number;
  boostAvg: number;
  boostWastedPct: number;
  avgSpeed: number;
  percentOffensive: number;
  percentDefensive: number;
  demosInflicted: number;
  demosTaken: number;
  tips: { category: string; priority: string; message: string }[];
}

interface AnalysisResult {
  replay: { id: string; replayId: string; gameMode: string };
  gameInfo: { map: string; duration: number; blueName: string; orangeName: string; blueGoals: number; orangeGoals: number };
  players: PlayerStats[];
  userPlayer: PlayerStats | null;
  newAchievements: { key: string; name: string; description: string; icon: string }[];
}

const demoResult: AnalysisResult = {
  replay: { id: "demo-1", replayId: "ballchasing-demo-id", gameMode: "3v3" },
  gameInfo: { map: "Mannfield (Night)", duration: 326, blueName: "Blue Team", orangeName: "Orange Team", blueGoals: 4, orangeGoals: 2 },
  players: [
    { playerName: "DemoPlayer", team: "blue", goals: 2, assists: 1, saves: 3, shots: 5, score: 480, shootingPct: 40, boostAvg: 42, boostWastedPct: 18, avgSpeed: 2150, percentOffensive: 45, percentDefensive: 30, demosInflicted: 1, demosTaken: 2, tips: [{ category: "shooting", priority: "medium", message: "حاول تسدد بدقة أكبر، لا تطلق الكرة عشوائي" }, { category: "positioning", priority: "high", message: "في عدم توازن بين هجومك ودفاعك. حاول تكون متوازن أكثر" }] },
    { playerName: "Teammate1", team: "blue", goals: 1, assists: 2, saves: 1, shots: 3, score: 320, shootingPct: 33, boostAvg: 38, boostWastedPct: 22, avgSpeed: 2080, percentOffensive: 35, percentDefensive: 40, demosInflicted: 0, demosTaken: 1, tips: [] },
    { playerName: "Opponent1", team: "orange", goals: 1, assists: 0, saves: 2, shots: 4, score: 290, shootingPct: 25, boostAvg: 35, boostWastedPct: 28, avgSpeed: 1950, percentOffensive: 40, percentDefensive: 35, demosInflicted: 2, demosTaken: 0, tips: [] },
    { playerName: "Opponent2", team: "orange", goals: 0, assists: 1, saves: 1, shots: 2, score: 180, shootingPct: 0, boostAvg: 30, boostWastedPct: 32, avgSpeed: 1880, percentOffensive: 30, percentDefensive: 45, demosInflicted: 0, demosTaken: 3, tips: [] },
    { playerName: "Opponent3", team: "orange", goals: 1, assists: 0, saves: 0, shots: 3, score: 210, shootingPct: 33, boostAvg: 28, boostWastedPct: 35, avgSpeed: 1750, percentOffensive: 50, percentDefensive: 25, demosInflicted: 1, demosTaken: 1, tips: [] },
  ],
  userPlayer: { playerName: "DemoPlayer", team: "blue", goals: 2, assists: 1, saves: 3, shots: 5, score: 480, shootingPct: 40, boostAvg: 42, boostWastedPct: 18, avgSpeed: 2150, percentOffensive: 45, percentDefensive: 30, demosInflicted: 1, demosTaken: 2, tips: [{ category: "shooting", priority: "medium", message: "حاول تسدد بدقة أكبر، لا تطلق الكرة عشوائي" }, { category: "positioning", priority: "high", message: "في عدم توازن بين هجومك ودفاعك. حاول تكون متوازن أكثر" }] },
  newAchievements: [{ key: "first_replay", name: "البداية", description: "ارفع أول ريبلاي لك", icon: "upload" }],
};

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-dark-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

function PlayerCard({ player, isUser }: { player: PlayerStats; isUser: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className={`p-4 ${isUser ? "ring-1 ring-indigo-500/40" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${player.team === "blue" ? "bg-blue-500" : "bg-orange-500"}`} />
          <span className="font-medium text-white text-sm">{player.playerName}</span>
          {isUser && <Badge variant="primary">أنت</Badge>}
        </div>
        <span className="text-xs text-dark-400">{player.goals}G / {player.assists}A / {player.saves}S</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-lg font-bold text-white">{player.score}</div>
          <div className="text-[10px] text-dark-500">Score</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-lg font-bold text-white">{player.shootingPct}%</div>
          <div className="text-[10px] text-dark-500">Shooting</div>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <StatBar label="Boost Avg" value={Math.round(player.boostAvg)} max={100} color="bg-emerald-500" />
        <StatBar label="Speed" value={Math.round(player.avgSpeed)} max={2500} color="bg-violet-500" />
        <StatBar label="Offensive" value={Math.round(player.percentOffensive)} max={100} color="bg-amber-500" />
        <StatBar label="Defensive" value={Math.round(player.percentDefensive)} max={100} color="bg-cyan-500" />
      </div>
      {player.tips.length > 0 && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {player.tips.length} tips
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-1.5 mt-2 pt-2 border-t border-white/5">
                  {player.tips.map((tip, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${tip.priority === "high" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>
                      <span>{tip.priority === "high" ? "!" : "i"}</span>
                      <span>{tip.message}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Card>
  );
}

export function AnalyzeReplay() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".replay")) setFile(f);
    else setError("Please upload a .replay file");
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      setResult(demoResult);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analysis Results</h1>
            <p className="text-sm text-dark-400 mt-1">{result.gameInfo.map} · {Math.floor(result.gameInfo.duration / 60)}:{String(result.gameInfo.duration % 60).padStart(2, "0")} · {result.gameInfo.blueGoals} - {result.gameInfo.orangeGoals}</p>
          </div>
          <Button variant="ghost" onClick={() => { setResult(null); setFile(null); }}>
            <X size={16} /> New Analysis
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border-blue-500/20">
            <div className="text-xs text-blue-400 font-medium mb-1">{result.gameInfo.blueName}</div>
            <div className="text-3xl font-bold text-white">{result.gameInfo.blueGoals}</div>
          </Card>
          <Card className="p-4 border-orange-500/20">
            <div className="text-xs text-orange-400 font-medium mb-1">{result.gameInfo.orangeName}</div>
            <div className="text-3xl font-bold text-white">{result.gameInfo.orangeGoals}</div>
          </Card>
        </div>

        {result.newAchievements.length > 0 && (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-2"><CheckCircle size={16} /> إنجازات جديدة!</div>
            {result.newAchievements.map((ach) => (
              <div key={ach.key} className="text-sm text-white">🏆 {ach.name} — {ach.description}</div>
            ))}
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Players</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.players.map((p) => (
              <PlayerCard key={p.playerName} player={p} isUser={p.playerName === result.userPlayer?.playerName} />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyze Replay</h1>
        <p className="text-sm text-dark-400 mt-1">Upload a Rocket League replay file to get detailed stats and coaching tips</p>
      </div>

      <Card className="p-8">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver ? "border-indigo-500 bg-indigo-500/5" : file ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-white/20"
          }`}
        >
          <input ref={inputRef} type="file" accept=".replay" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          {file ? (
            <div className="space-y-2">
              <FileText size={32} className="mx-auto text-emerald-400" />
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-xs text-dark-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={32} className="mx-auto text-dark-400" />
              <p className="text-white font-medium">Drop your .replay file here</p>
              <p className="text-xs text-dark-400">or click to browse</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Input label="Ballchasing API Key (optional)" type="password" placeholder="Paste your API key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <p className="text-[10px] text-dark-500 mt-1">Get your key at ballchasing.com — if empty, demo mode is used</p>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mt-4">{error}</p>}

        <Button onClick={handleUpload} disabled={!file || loading} className="w-full mt-4">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BarChart3 size={16} />}
          {loading ? "Analyzing..." : "Analyze Replay"}
        </Button>
      </Card>
    </motion.div>
  );
}
