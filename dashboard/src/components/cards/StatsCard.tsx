import { type LucideIcon } from "lucide-react";
import { Card } from "../ui";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
}

export function StatsCard({ icon: Icon, label, value, trend }: Props) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="w-10 h-10 rounded-xl gradient-primary/80 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
        {trend && <p className="text-xs text-green-400 mt-0.5">{trend}</p>}
      </div>
    </Card>
  );
}
