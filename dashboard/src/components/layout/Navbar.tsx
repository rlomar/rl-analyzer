import { Search, Bell, Menu, ChevronDown } from "lucide-react";
import { useApp } from "../../context/AppContext";

const roleColors: Record<string, string> = {
  user: "bg-blue-500/15 text-blue-400",
  coach: "bg-purple-500/15 text-purple-400",
  admin: "bg-amber-500/15 text-amber-400",
};

export function Navbar() {
  const { user, mobileMenuOpen, setMobileMenuOpen, section } = useApp();

  const sectionLabels: Record<string, string> = {
    login: "Welcome",
    register: "Create Account",
    dashboard: "Dashboard",
    "my-requests": "My Requests",
    "create-request": "New Request",
    "request-detail": "Request Details",
    coaches: "Coaches",
    messages: "Messages",
    progress: "Progress",
    settings: "Settings",
    "incoming-requests": "Incoming Requests",
    sessions: "Sessions",
    "admin-overview": "Admin Overview",
    "admin-users": "User Management",
    "admin-requests": "All Requests",
  };

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg text-dark-300 hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-white hidden sm:block">{sectionLabels[section] || "RL Coach"}</h1>
      </div>

      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-dark-400 focus:outline-none focus:border-indigo-500/30 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-dark-300 hover:text-white hover:bg-white/5 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-dark-900" />
        </button>

        {user && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
              <span
                className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${
                  roleColors[user.role] || ""
                }`}
              >
                {user.role}
              </span>
            </div>
            <ChevronDown size={14} className="text-dark-400" />
          </div>
        )}
      </div>
    </header>
  );
}
