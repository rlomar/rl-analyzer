import { AnimatePresence, motion } from "framer-motion";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Navbar } from "./components/layout/Navbar";
import {
  LoginSection,
  RegisterSection,
  UserDashboard,
  MyRequests,
  CreateRequest,
  RequestDetailSection,
  CoachesSection,
  MessagesSection,
  ProgressSection,
  SettingsSection,
  CoachDashboard,
  SessionsSection,
  AdminOverview,
  AdminUsers,
  AdminRequests,
} from "./components/sections";

function DashboardApp() {
  const { section, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        {section === "login" && <LoginSection key="login" />}
        {section === "register" && <RegisterSection key="register" />}
      </AnimatePresence>
    );
  }

  const sections: Record<string, React.ReactNode> = {
    dashboard: <UserDashboard />,
    "my-requests": <MyRequests />,
    "create-request": <CreateRequest />,
    "request-detail": <RequestDetailSection />,
    coaches: <CoachesSection />,
    messages: <MessagesSection />,
    progress: <ProgressSection />,
    settings: <SettingsSection />,
    "incoming-requests": <CoachDashboard />,
    sessions: <SessionsSection />,
    "admin-overview": <AdminOverview />,
    "admin-users": <AdminUsers />,
    "admin-requests": <AdminRequests />,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {sections[section] || <UserDashboard />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <DashboardApp />
    </AppProvider>
  );
}

export default App;
