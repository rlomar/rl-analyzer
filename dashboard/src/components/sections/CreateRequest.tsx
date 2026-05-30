import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button, Select, Card } from "../ui";
import { Badge } from "../ui/Badge";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import type { CoachingRequest } from "../../types";

const problemTypes = [
  { value: "mechanics", label: "Mechanics" },
  { value: "rotation", label: "Rotation" },
  { value: "game-sense", label: "Game Sense" },
  { value: "defense", label: "Defense" },
  { value: "aerials", label: "Aerials" },
];

const ranks = [
  { value: "Bronze", label: "Bronze" },
  { value: "Silver", label: "Silver" },
  { value: "Gold", label: "Gold" },
  { value: "Platinum", label: "Platinum" },
  { value: "Diamond", label: "Diamond" },
  { value: "Champion", label: "Champion" },
  { value: "Grand Champion", label: "Grand Champion" },
  { value: "Supersonic Legend", label: "Supersonic Legend" },
];

export function CreateRequest() {
  const { setSection } = useApp();
  const [rank, setRank] = useState("");
  const [problemType, setProblemType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CoachingRequest | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const req = await api.requests.create({ rank, problemType, description });
      setCreated(req);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 lg:p-6 max-w-2xl mx-auto">
        <Card className="text-center space-y-4 p-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white">Request Submitted!</h2>
          <p className="text-dark-300 text-sm">A coach will review your request shortly.</p>
          <div className="flex items-center justify-center gap-2 text-xs text-dark-400">
            <Badge status={created.status} />
            <span>{created.rank}</span>
            <span className="capitalize">{created.problemType}</span>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setCreated(null)}>Submit Another</Button>
            <Button onClick={() => setSection("my-requests")}>View My Requests</Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">New Coaching Request</h1>
        <p className="text-sm text-dark-400 mt-1">Tell us what you need help with</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select label="Your Rank" options={ranks} value={rank} onChange={(e) => setRank(e.target.value)} required />
          <Select label="Problem Type" options={problemTypes} value={problemType} onChange={(e) => setProblemType(e.target.value)} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-dark-300">Description</label>
            <textarea
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all min-h-[120px] resize-y"
              placeholder="Describe what you're struggling with..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
            />
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
