import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, UserCheck } from "lucide-react";

import { api } from "../../lib/api";
import type { User, Role } from "../../types";

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = () => {
    setLoading(true);
    api.admin.users().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await api.admin.updateRole(userId, newRole);
      loadUsers();
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-amber-400" />
        <h1 className="text-xl font-bold text-white">User Management</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse"><div className="h-4 bg-white/5 rounded w-1/3" /></div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-dark-400 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-dark-300">{user.email}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      user.role === "admin" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
                      user.role === "coach" ? "bg-purple-500/15 text-purple-400 border-purple-500/25" :
                      "bg-blue-500/15 text-blue-400 border-blue-500/25"
                    }`}>
                      <UserCheck size={10} className="mr-1" />
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/30 appearance-none cursor-pointer"
                    >
                      <option value="user" className="bg-dark-800">User</option>
                      <option value="coach" className="bg-dark-800">Coach</option>
                      <option value="admin" className="bg-dark-800">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
