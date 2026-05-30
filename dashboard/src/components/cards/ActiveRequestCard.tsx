import { Badge, Card } from "../ui";
import { Eye } from "lucide-react";
import type { CoachingRequest } from "../../types";
import { useApp } from "../../context/AppContext";

export function ActiveRequestCard({ request }: { request: CoachingRequest }) {
  const { setSection, setSelectedRequestId } = useApp();

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm capitalize">{request.problemType}</h3>
          <p className="text-xs text-dark-400 mt-0.5">{request.rank}</p>
        </div>
        <Badge status={request.status} />
      </div>
      <p className="text-sm text-dark-300 line-clamp-2">{request.description}</p>
      {request.coach && (
        <div className="flex items-center gap-2 text-xs text-dark-400">
          <span>Coach: <span className="text-dark-200 font-medium">{request.coach.name}</span></span>
        </div>
      )}
      <button
        onClick={() => { setSelectedRequestId(request.id); setSection("request-detail"); }}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
      >
        <Eye size={14} />
        View Details
      </button>
    </Card>
  );
}
