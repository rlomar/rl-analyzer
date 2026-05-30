import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { User, Section, Role } from "../types";

interface AppState {
  user: User | null;
  section: Section;
  selectedRequestId: string | null;
  mobileMenuOpen: boolean;
  setUser: (user: User | null) => void;
  setSection: (section: Section) => void;
  setSelectedRequestId: (id: string | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  role: Role | null;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState<Section>("login");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem("rl_coach_token");
    setUser(null);
    setSection("login");
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        section,
        selectedRequestId,
        mobileMenuOpen,
        setUser,
        setSection,
        setSelectedRequestId,
        setMobileMenuOpen,
        logout,
        isAuthenticated: !!user,
        role: user?.role ?? null,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
