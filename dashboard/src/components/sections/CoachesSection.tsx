import { motion } from "framer-motion";
import { Users, Star } from "lucide-react";
import { Card } from "../ui";

const coaches = [
  { name: "Ahmed", rank: "Grand Champion", specialty: "Rotation & Positioning", rating: 4.9, sessions: 127 },
  { name: "Sara", rank: "Supersonic Legend", specialty: "Mechanics & Aerials", rating: 4.8, sessions: 94 },
  { name: "Khalid", rank: "Champion", specialty: "Defense & Game Sense", rating: 4.7, sessions: 56 },
];

export function CoachesSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Coaches</h1>
        <p className="text-sm text-dark-400 mt-1">Meet our top Rocket League coaches</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coaches.map((coach) => (
          <Card key={coach.name} className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl mx-auto">
              {coach.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-white">{coach.name}</h3>
              <p className="text-xs text-indigo-400 font-medium">{coach.rank}</p>
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs bg-white/5 text-dark-300 capitalize">{coach.specialty}</span>
            <div className="flex items-center justify-center gap-4 text-xs text-dark-400">
              <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" />{coach.rating}</span>
              <span className="flex items-center gap-1"><Users size={12} />{coach.sessions} sessions</span>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
