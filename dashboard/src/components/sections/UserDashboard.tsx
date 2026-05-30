import { motion } from "framer-motion";
import { FileText, CheckCircle, PlusCircle } from "lucide-react";
import { WelcomeHero } from "../cards/WelcomeHero";
import { StatsCard } from "../cards/StatsCard";
import { ActiveRequestCard } from "../cards/ActiveRequestCard";
import { RankProgress } from "../cards/RankProgress";
import { Card, Button } from "../ui";
import { useApp } from "../../context/AppContext";
import type { CoachingRequest } from "../../types";

const mockRequests: CoachingRequest[] = [
  {
    id: "1", userId: "u1", coachId: "c1", rank: "Platinum 2",
    problemType: "Rotation", description: "I keep getting caught out of position in 2v2. Need help with rotation.",
    status: "pending", coachNotes: null, createdAt: new Date().toISOString(),
    coach: { id: "c1", name: "Ahmed", email: "ahmed@coach.com" },
  },
  {
    id: "2", userId: "u1", coachId: "c1", rank: "Platinum 2",
    problemType: "Aerials", description: "Struggling with aerial consistency off the wall.",
    status: "accepted", coachNotes: null, createdAt: new Date().toISOString(),
    coach: { id: "c1", name: "Ahmed", email: "ahmed@coach.com" },
  },
];

export function UserDashboard() {
  const { setSection } = useApp();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-4 lg:p-6 max-w-4xl">
      <WelcomeHero />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={FileText} label="Active Requests" value={mockRequests.filter((r) => r.status === "pending" || r.status === "accepted").length} />
        <StatsCard icon={CheckCircle} label="Completed" value={mockRequests.filter((r) => r.status === "completed").length} />
        <StatsCard icon={FileText} label="Total Sessions" value={mockRequests.length} trend="+2 this month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-dark-200 uppercase tracking-wider">Active Requests</h2>
          {mockRequests.filter((r) => r.status !== "rejected").map((req) => (
            <ActiveRequestCard key={req.id} request={req} />
          ))}
        </div>

        <div className="space-y-4">
          <Card className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary/20 flex items-center justify-center mx-auto">
              <PlusCircle size={28} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Need coaching?</h3>
              <p className="text-sm text-dark-400 mt-1">Submit a request and get matched with top coaches</p>
            </div>
            <Button onClick={() => setSection("create-request")} className="w-full">
              Request Coaching Session
            </Button>
          </Card>

          <RankProgress currentRank="Platinum" sessions={12} />
        </div>
      </div>
    </motion.div>
  );
}
