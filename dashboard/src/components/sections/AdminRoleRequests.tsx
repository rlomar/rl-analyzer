import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, Button, Badge } from "../ui";
import { api } from "../../lib/api";
import type { RoleRequest } from "../../types";

export function AdminRoleRequests() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      setRequests(await api.roleRequests.all());
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleApprove = async (id: string) => {
    await api.roleRequests.approve(id);
    fetch();
  };

  const handleReject = async (id: string) => {
    await api.roleRequests.reject(id);
    fetch();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Role Upgrade Requests</h1>
        <p className="text-sm text-dark-400 mt-1">Approve or reject coach role requests</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse"><div className="h-4 bg-white/5 rounded w-1/2" /></div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card><p className="text-sm text-dark-400 text-center py-8">No role requests yet</p></Card>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <Card key={req.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{req.user?.name || "Unknown"}</p>
                <p className="text-xs text-dark-400">{req.user?.email} · Current role: {req.user?.role}</p>
                {req.reason && <p className="text-xs text-dark-500 mt-1 italic">{req.reason}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {req.status === "pending" ? (
                  <>
                    <Badge status="pending" />
                    <Button size="sm" variant="primary" onClick={() => handleApprove(req.id)} className="!p-2">
                      <CheckCircle size={14} />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleReject(req.id)} className="!p-2">
                      <XCircle size={14} />
                    </Button>
                  </>
                ) : (
                  <Badge status={req.status === "approved" ? "accepted" : "rejected"} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
