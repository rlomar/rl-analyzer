import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Card } from "../ui";

export function MessagesSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Messages</h1>
        <p className="text-sm text-dark-400 mt-1">Chat with your coaches</p>
      </div>

      <Card className="text-center py-12">
        <MessageSquare size={32} className="mx-auto text-dark-500 mb-3" />
        <p className="text-dark-400 text-sm">Messages coming soon</p>
        <p className="text-dark-500 text-xs mt-1">This feature is under development</p>
      </Card>
    </motion.div>
  );
}
