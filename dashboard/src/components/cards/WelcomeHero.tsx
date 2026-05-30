import { Sparkles } from "lucide-react";
import { useApp } from "../../context/AppContext";

export function WelcomeHero() {
  const { user } = useApp();
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 gradient-primary">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(" ")[0] || "Player"} 👋</h1>
        </div>
        <p className="text-white/70 text-sm max-w-md">
          Ready to level up? Your coaching dashboard is ready.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">
          <Sparkles size={12} />
          <span>You have active sessions</span>
        </div>
      </div>
    </div>
  );
}
