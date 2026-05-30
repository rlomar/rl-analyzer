import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Card } from "../ui";

const conversations = [
  { name: "Ahmed (Coach)", lastMsg: "Great session today! Focus on your rotations.", time: "2h ago", unread: 2 },
  { name: "Sara (Coach)", lastMsg: "Here are some drills for aerial control.", time: "1d ago", unread: 0 },
];

export function MessagesSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Messages</h1>
        <p className="text-sm text-dark-400 mt-1">Chat with your coaches</p>
      </div>

      {conversations.length === 0 ? (
        <Card className="text-center py-12">
          <MessageSquare size={32} className="mx-auto text-dark-500 mb-3" />
          <p className="text-dark-400 text-sm">No messages yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Card key={conv.name} hover className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                {conv.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white text-sm">{conv.name}</h3>
                  <span className="text-xs text-dark-500">{conv.time}</span>
                </div>
                <p className="text-xs text-dark-400 truncate mt-0.5">{conv.lastMsg}</p>
              </div>
              {conv.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {conv.unread}
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
