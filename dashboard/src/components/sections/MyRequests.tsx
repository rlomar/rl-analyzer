import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/api";
import { Card, Badge, Button } from "../ui";
import { useApp } from "../../context/AppContext";
import type { CoachingRequest } from "../../types";

export function MyRequests() {
  const { setSection, setSelectedRequestId } = useApp();
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.requests.my().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">My Requests</h1>
          <p className="text-sm text-dark-400 mt-1">Track your coaching requests</p>
        </div>
        <Button size="sm" onClick={() => setSection("create-request")}>+ New Request</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-dark-400">No requests yet.</p>
          <Button variant="secondary" size="sm" onClick={() => setSection("create-request")} className="mt-4">
            Create your first request
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white text-sm capitalize">{req.problemType}</h3>
                  <Badge status={req.status} />
                </div>
                <p className="text-xs text-dark-400 mb-1">{req.rank}</p>
                <p className="text-sm text-dark-300 line-clamp-2">{req.description}</p>
                {req.coach && <p className="text-xs text-dark-400 mt-2">Coach: {req.coach.name}</p>}
              </div>
              <button
                onClick={() => { setSelectedRequestId(req.id); setSection("request-detail"); }}
                className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap"
              >
                View →
              </button>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
