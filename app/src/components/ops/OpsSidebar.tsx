import { LayoutDashboard, Shield, Sliders, ListTodo, LogOut, Terminal } from "lucide-react";

interface OpsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  username: string;
}

export default function OpsSidebar({ activeTab, setActiveTab, onLogout, username }: OpsSidebarProps) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "feature_flags", label: "Feature Flags", icon: Sliders },
    { id: "emergency_controls", label: "Emergency Controls", icon: Shield },
    { id: "audit_logs", label: "Audit Logs", icon: ListTodo },
  ];

  return (
    <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
      <div className="h-16 border-b border-slate-800 flex items-center gap-3 px-6">
        <Terminal className="w-5 h-5 text-emerald-400" />
        <span className="font-mono font-bold text-slate-100 tracking-wider text-sm uppercase">APOLLO OCC</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400">
          <span>ROLE: FOUNDER</span>
          <span className="text-slate-500">{username}</span>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </div>
    </div>
  );
}
