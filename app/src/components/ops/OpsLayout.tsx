import React from "react";
import OpsSidebar from "./OpsSidebar";

interface OpsLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  username: string;
}

export default function OpsLayout({ children, activeTab, setActiveTab, onLogout, username }: OpsLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <OpsSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} username={username} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
          <h1 className="text-sm font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            OCC // {activeTab.replace("_", " ")}
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>SECURE SESSION ACTIVE</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
