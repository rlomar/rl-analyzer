import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  Users,
  MessageSquare,
  TrendingUp,
  Settings,
  LogOut,
  ClipboardList,
  CalendarCheck,
  Shield,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { Section, Role } from "../../types";

interface NavItem {
  icon: LucideIcon;
  label: string;
  section: Section;
  roles: Role[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", section: "dashboard", roles: ["user", "coach"] },
  { icon: ListTodo, label: "My Requests", section: "my-requests", roles: ["user"] },
  { icon: PlusCircle, label: "Create Request", section: "create-request", roles: ["user"] },
  { icon: ClipboardList, label: "Incoming", section: "incoming-requests", roles: ["coach", "admin"] },
  { icon: CalendarCheck, label: "Sessions", section: "sessions", roles: ["coach"] },
  { icon: Users, label: "Coaches", section: "coaches", roles: ["user"] },
  { icon: MessageSquare, label: "Messages", section: "messages", roles: ["user", "coach", "admin"] },
  { icon: TrendingUp, label: "Progress", section: "progress", roles: ["user"] },
  { icon: Shield, label: "Overview", section: "admin-overview", roles: ["admin"] },
  { icon: UserCog, label: "Users", section: "admin-users", roles: ["admin"] },
  { icon: ClipboardList, label: "Requests", section: "admin-requests", roles: ["admin"] },
  { icon: Settings, label: "Settings", section: "settings", roles: ["user", "coach", "admin"] },
];

export function Sidebar() {
  const { section, setSection, user, logout, mobileMenuOpen, setMobileMenuOpen } = useApp();
  if (!user) return null;

  const items = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col bg-dark-900/95 backdrop-blur-xl border-r border-white/5 transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm">
            RL
          </div>
          <span className="font-bold text-lg text-white">RL Coach</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.section;
            return (
              <button
                key={item.section}
                onClick={() => {
                  setSection(item.section);
                  setMobileMenuOpen(false);
                }}
                className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? "text-white" : "text-dark-400 hover:text-dark-100 hover:bg-white/[0.04]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-white/[0.06] rounded-xl border border-white/[0.08]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => {
              logout();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
