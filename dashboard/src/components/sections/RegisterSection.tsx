import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { Button, Input, Card } from "../ui";
import { useAuth } from "../../hooks/useAuth";
import { useApp } from "../../context/AppContext";

export function RegisterSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register, loading, error } = useAuth();
  const { setSection } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(name, email, password);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">RL</div>
          <h1 className="text-xl font-bold text-white">Create account</h1>
          <p className="text-sm text-dark-400 mt-1">Start your coaching journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={16} />}
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-dark-400">
          Already have an account?{" "}
          <button onClick={() => setSection("login")} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </button>
        </p>
      </Card>
    </motion.div>
  );
}
