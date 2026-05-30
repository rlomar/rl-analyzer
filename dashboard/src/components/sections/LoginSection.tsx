import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { Button, Input, Card } from "../ui";
import { useAuth } from "../../hooks/useAuth";
import { useApp } from "../../context/AppContext";

export function LoginSection() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { login, loading, error } = useAuth();
  const { setSection } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">RL</div>
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-dark-400 mt-1">Sign in to your RL Coach account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="relative">
            <Input label="Password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-200 transition-colors">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn size={16} />}
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-dark-400">
          Don&apos;t have an account?{" "}
          <button onClick={() => setSection("register")} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Create one
          </button>
        </p>

      </Card>
    </motion.div>
  );
}
