import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import { Settings } from "./components/Settings";
import { SettingsProvider, useSettings } from "./settings/SettingsContext";

function Shell() {
  const { ready } = useSettings();
  const { token, user, loading, error } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  if (!ready) return <Settings />;
  if (showSettings) return <Settings onDone={() => setShowSettings(false)} />;

  if (loading) {
    return <div className="flex h-full items-center justify-center text-neutral-400">Loading…</div>;
  }
  if (error) {
    return <div className="flex h-full items-center justify-center text-red-400">{error}</div>;
  }

  return token && user ? (
    <Dashboard onOpenSettings={() => setShowSettings(true)} />
  ) : (
    <Login onOpenSettings={() => setShowSettings(true)} />
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
      <Analytics />
    </SettingsProvider>
  );
}
