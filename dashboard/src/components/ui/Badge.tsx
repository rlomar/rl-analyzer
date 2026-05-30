import type { RequestStatus } from "../../types";

const statusConfig: Record<RequestStatus, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  accepted: { label: "Accepted", classes: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  completed: { label: "Completed", classes: "bg-green-500/15 text-green-400 border-green-500/25" },
  rejected: { label: "Rejected", classes: "bg-red-500/15 text-red-400 border-red-500/25" },
};

export function Badge({ status }: { status: RequestStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.classes}`}>
      {config.label}
    </span>
  );
}
