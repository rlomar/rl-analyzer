import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { Badge, Card } from "../ui";
import type { CoachingRequest } from "../../types";
import { useApp } from "../../context/AppContext";

interface Props {
  request: CoachingRequest;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function IncomingRequestCard({ request, onAccept, onReject }: Props) {
  const { setSection, setSelectedRequestId } = useApp();

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white text-sm">{request.user?.name || "Unknown"}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-dark-400">{request.rank}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dark-400 capitalize">{request.problemType}</span>
          </div>
        </div>
        <Badge status={request.status} />
      </div>
      <p className="text-sm text-dark-300 line-clamp-2">{request.description}</p>
      <div className="flex gap-2">
        {request.status === "pending" && onAccept && (
          <button
            onClick={() => onAccept(request.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors"
          >
            <CheckCircle2 size={14} />
            Accept
          </button>
        )}
        {request.status === "pending" && onReject && (
          <button
            onClick={() => onReject(request.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            <XCircle size={14} />
            Reject
          </button>
        )}
        <button
          onClick={() => { setSelectedRequestId(request.id); setSection("request-detail"); }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-dark-200 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <Eye size={14} />
          View
        </button>
      </div>
    </Card>
  );
}
