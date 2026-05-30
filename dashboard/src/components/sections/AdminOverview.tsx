import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge, Card, Button } from "../ui";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import type { CoachingRequest } from "../../types";

export function AdminOverview() {
  const { setSection } = useApp();
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.requests.all().catch(() => []),
    ]).then(([reqs]) => {
      setRequests(reqs);
    }).finally(() => setLoading(false));
  }, []);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    completed: requests.filter((r) => r.status === "completed").length,
    completionRate: requests.length > 0 ? Math.round((requests.filter((r) => r.status === "completed").length / requests.length) * 100) : 0,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-white">Admin Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center space-y-1">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-dark-400">Total Requests</p>
        </Card>
        <Card className="text-center space-y-1">
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-dark-400">Pending</p>
        </Card>
        <Card className="text-center space-y-1">
          <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          <p className="text-xs text-dark-400">Completed</p>
        </Card>
        <Card className="text-center space-y-1">
          <p className="text-2xl font-bold text-indigo-400">{stats.completionRate}%</p>
          <p className="text-xs text-dark-400">Completion Rate</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button size="sm" variant="secondary" onClick={() => setSection("admin-users")}>Manage Users</Button>
        <Button size="sm" variant="secondary" onClick={() => setSection("admin-requests")}>All Requests</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse"><div className="h-4 bg-white/5 rounded w-1/2" /></div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {requests.slice(0, 5).map((req) => (
            <Card key={req.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white capitalize">{req.problemType}</p>
                <p className="text-xs text-dark-400">{req.user?.name || "Unknown"} · {req.rank}</p>
              </div>
              <Badge status={req.status} />
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
