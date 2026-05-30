import { motion } from "framer-motion";
import { Bell, Shield, Globe, Palette } from "lucide-react";
import { Card } from "../ui";

const settings = [
  { icon: Bell, label: "Notifications", desc: "Email and push notification preferences" },
  { icon: Shield, label: "Privacy", desc: "Manage your privacy settings" },
  { icon: Globe, label: "Language", desc: "Arabic, English, and more" },
  { icon: Palette, label: "Appearance", desc: "Dark mode, light mode" },
];

export function SettingsSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-dark-400 mt-1">Manage your preferences</p>
      </div>

      <div className="space-y-2">
        {settings.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} hover className="flex items-center gap-4">
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
    </motion.div>
  );
}
