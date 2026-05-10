import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import { Settings } from "./components/Settings";
import { SettingsProvider } from "./settings/SettingsContext";
import { useSettings } from "./settings/useSettings";
import { SpeedInsights } from "@vercel/speed-insights/react";

function Shell() {
  const { ready } = useSettings();
  const { token, user, loading, error } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  if (!ready) return <Settings />;
  if (showSettings) return <Settings onDone={() => setShowSettings(false)} />;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center sw-accent text-[var(--sw-cyan)]">
        ▒▒ Loading ▒▒
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center sw-mono text-[var(--sw-danger)]">{error}</div>
    );
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
      <SpeedInsights />
    </SettingsProvider>
  );
}
