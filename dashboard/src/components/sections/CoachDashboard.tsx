import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ClipboardList } from "lucide-react";
import { StatsCard } from "../cards/StatsCard";
import { IncomingRequestCard } from "../cards/IncomingRequestCard";
import { Card } from "../ui";
import { api } from "../../lib/api";
import type { CoachingRequest } from "../../types";

export function CoachDashboard() {
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.requests.incoming().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id: string) => {
    try {
      const updated = await api.requests.accept(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {}
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await api.requests.reject(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Coach Dashboard</h1>
          <p className="text-sm text-dark-400 mt-1">Manage incoming requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={ClipboardList} label="Incoming" value={requests.filter((r) => r.status === "pending").length} />
        <StatsCard icon={ClipboardList} label="Active" value={requests.filter((r) => r.status === "accepted").length} />
        <StatsCard icon={Users} label="Completed" value={requests.filter((r) => r.status === "completed").length} />
      </div>

      <h2 className="text-sm font-semibold text-dark-200 uppercase tracking-wider">Incoming Requests</h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/4 mb-3" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-dark-400">No requests yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <IncomingRequestCard key={req.id} request={req} onAccept={handleAccept} onReject={handleReject} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
