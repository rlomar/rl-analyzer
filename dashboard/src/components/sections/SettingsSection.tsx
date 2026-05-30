import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Shield, Globe, Palette, GraduationCap, CheckCircle, Clock, X } from "lucide-react";
import { Card, Button } from "../ui";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import type { RoleRequest } from "../../types";

const settings = [
  { icon: Bell, label: "Notifications", desc: "Email and push notification preferences", message: "Notification preferences will be available soon." },
  { icon: Shield, label: "Privacy", desc: "Manage your privacy settings", message: "Privacy settings will be available soon." },
  { icon: Globe, label: "Language", desc: "Arabic, English, and more", message: "Arabic/English language toggle coming soon." },
  { icon: Palette, label: "Appearance", desc: "Dark mode, light mode", message: "Theme customization coming soon." },
];

export function SettingsSection() {
  const { user } = useApp();
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const requests = await api.roleRequests.my();
      setRoleRequest(requests.length > 0 ? requests[0] : null);
    } catch {
      setRoleRequest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequest(); }, []);

  const handleRequestCoach = async () => {
    setSending(true);
    try {
      const r = await api.roleRequests.create();
      setRoleRequest(r);
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-dark-400 mt-1">Manage your preferences</p>
      </div>

      {user?.role === "user" && (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
              <GraduationCap size={18} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white text-sm">Become a Coach</h3>
              <p className="text-xs text-dark-400 mt-0.5">Request to upgrade your account to coach role</p>
            </div>
          </div>
          {loading ? (
            <div className="h-9 animate-pulse bg-white/5 rounded-lg" />
          ) : roleRequest ? (
            <div className="flex items-center gap-2 text-sm">
              {roleRequest.status === "pending" && (
                <><Clock size={16} className="text-yellow-400" /><span className="text-yellow-400">Request pending admin approval</span></>
              )}
              {roleRequest.status === "approved" && (
                <><CheckCircle size={16} className="text-green-400" /><span className="text-green-400">Approved! You are now a coach.</span></>
              )}
              {roleRequest.status === "rejected" && (
                <span className="text-red-400">Request was rejected. You can submit a new one.</span>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={handleRequestCoach} disabled={sending}>
              {sending ? "Sending..." : "Request Coach Role"}
            </Button>
          )}
        </Card>
      )}

      <div className="space-y-2">
        {settings.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} hover className="flex items-center gap-4 cursor-pointer" onClick={() => setToast(s.message)}>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-dark-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white text-sm">{s.label}</h3>
                <p className="text-xs text-dark-400 mt-0.5">{s.desc}</p>
              </div>
              <svg className="w-4 h-4 text-dark-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 right-6 z-50">
            <Card className="p-4 flex items-center gap-3 max-w-sm shadow-xl">
              <p className="text-sm text-dark-200 flex-1">{toast}</p>
              <button onClick={() => setToast(null)} className="text-dark-500 hover:text-white"><X size={14} /></button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
