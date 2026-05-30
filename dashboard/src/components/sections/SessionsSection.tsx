import { motion } from "framer-motion";
import { Card, Badge } from "../ui";
import { useApp } from "../../context/AppContext";
import type { CoachingRequest } from "../../types";

const mockSessions: CoachingRequest[] = [
  {
    id: "s1", userId: "u1", coachId: "c1", rank: "Diamond 1",
    problemType: "mechanics", description: "Flip reset consistency training.",
    status: "accepted", coachNotes: null, createdAt: new Date().toISOString(),
    user: { id: "u1", name: "Omar", email: "omar@example.com" },
  },
  {
    id: "s2", userId: "u2", coachId: "c1", rank: "Gold 3",
    problemType: "defense", description: "Positioning and saves practice.",
    status: "accepted", coachNotes: "Work on backpost rotation", createdAt: new Date().toISOString(),
    user: { id: "u2", name: "Khalid", email: "khalid@example.com" },
  },
];

export function SessionsSection() {
  const { setSection, setSelectedRequestId } = useApp();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Active Sessions</h1>
        <p className="text-sm text-dark-400 mt-1">Your current coaching sessions</p>
      </div>

      {mockSessions.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-dark-400">No active sessions.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {mockSessions.map((session) => (
            <Card key={session.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                      {session.user?.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{session.user?.name}</h3>
                      <p className="text-xs text-dark-400">{session.rank} · {session.problemType}</p>
                    </div>
                  </div>
                </div>
                <Badge status={session.status} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedRequestId(session.id); setSection("request-detail"); }}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                >
                  Add Notes
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
