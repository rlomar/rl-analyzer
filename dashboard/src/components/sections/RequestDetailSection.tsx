import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, User, MessageSquare } from "lucide-react";
import { Card, Badge, Button } from "../ui";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../lib/utils";
import type { CoachingRequest } from "../../types";

export function RequestDetail() {
  const { selectedRequestId, setSection } = useApp();
  const [request, setRequest] = useState<CoachingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedRequestId) return;
    setLoading(true);
    api.requests.my()
      .then((reqs) => {
        const found = reqs.find((r) => r.id === selectedRequestId);
        if (found) setRequest(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedRequestId]);

  const handleAction = async (action: "accept" | "reject" | "complete") => {
    if (!request) return;
    try {
      const updated = await api.requests[action](request.id);
      setRequest(updated);
    } catch {}
  };

  const handleSaveNotes = async () => {
    if (!request || !notes.trim()) return;
    setSaving(true);
    try {
      const updated = await api.requests.notes(request.id, notes);
      setRequest(updated);
      setNotes("");
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto">
        <div className="glass rounded-2xl p-8 animate-pulse space-y-4">
          <div className="h-5 bg-white/5 rounded w-1/3" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
          <div className="h-20 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto">
        <Card className="text-center py-12">
          <p className="text-dark-400">Request not found.</p>
          <Button variant="secondary" size="sm" onClick={() => setSection("my-requests")} className="mt-4">Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <button onClick={() => setSection("my-requests")} className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to requests
      </button>

      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white capitalize">{request.problemType}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge status={request.status} />
              <span className="text-sm text-dark-400">{request.rank}</span>
              <span className="text-xs text-dark-500 flex items-center gap-1"><Clock size={12} />{formatDate(request.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-sm text-dark-200 leading-relaxed">{request.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {request.status === "pending" && (
            <>
              <Button size="sm" onClick={() => handleAction("accept")}>Accept</Button>
              <Button size="sm" variant="danger" onClick={() => handleAction("reject")}>Reject</Button>
            </>
          )}
          {request.status === "accepted" && (
            <Button size="sm" variant="primary" onClick={() => handleAction("complete")}>Mark Complete</Button>
          )}
        </div>
      </Card>

      {request.coach && (
        <Card className="space-y-3">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2"><User size={16} /> Coach</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">
              {request.coach.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-white text-sm">{request.coach.name}</p>
              <p className="text-xs text-dark-400">{request.coach.email}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2"><MessageSquare size={16} /> Coach Notes</h3>
        {request.coachNotes ? (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-sm text-dark-200">{request.coachNotes}</p>
          </div>
        ) : (
          request.status === "accepted" && (
            <div className="space-y-3">
              <textarea
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-indigo-500/50 transition-all min-h-[80px] resize-y text-sm"
                placeholder="Add coaching notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button size="sm" onClick={handleSaveNotes} disabled={saving || !notes.trim()}>
                {saving ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          )
        )}
      </Card>
    </motion.div>
  );
}
