import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { Badge } from "../ui";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import type { CoachingRequest } from "../../types";

export function AdminRequests() {
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.requests().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList size={20} className="text-amber-400" />
        <h1 className="text-xl font-bold text-white">All Requests</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse"><div className="h-4 bg-white/5 rounded w-1/3" /></div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-dark-400 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="text-left p-3 font-medium">Player</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Rank</th>
                <th className="text-left p-3 font-medium">Coach</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 font-medium text-white">{req.user?.name || "Unknown"}</td>
                  <td className="p-3 text-dark-300 capitalize">{req.problemType}</td>
                  <td className="p-3 text-dark-300">{req.rank}</td>
                  <td className="p-3 text-dark-300">{req.coach?.name || "—"}</td>
                  <td className="p-3"><Badge status={req.status} /></td>
                  <td className="p-3 text-dark-400 text-xs">{formatDate(req.createdAt)}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="danger" onClick={() => handleDelete(req.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
