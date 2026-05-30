import { useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

export function useAuth() {
  const { setUser, setSection } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.auth.login({ email, password });
      localStorage.setItem("rl_coach_token", data.token);
      setUser(data.user);
      setSection("dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.auth.register({ name, email, password });
      localStorage.setItem("rl_coach_token", data.token);
      setUser(data.user);
      setSection("dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { login, register, loading, error };
}
