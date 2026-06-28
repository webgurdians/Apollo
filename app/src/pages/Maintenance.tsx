import { ShieldAlert } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100 font-sans">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Animated Warning Icon */}
        <div className="w-16 h-16 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
          <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>

        {/* Staff-Focused Status Message */}
        <div className="space-y-3">
          <h1 className="text-xl font-bold font-mono tracking-tight text-white uppercase">
            Scheduled System Upgrades
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            The clinic administration dashboard is temporarily offline for scheduled system optimization.
          </p>
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/20 text-xs text-emerald-400 font-mono inline-block">
            ● Patient-facing online booking remains FULLY ACTIVE
          </div>
          <p className="text-xs text-slate-500 pt-2">
            Please contact the system administrator for restoration updates.
          </p>
        </div>

        {/* Scaffold Footer */}
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-6 border-t border-slate-900">
          Internal Operations Offline // Developer Mode Active
        </div>
      </div>
    </div>
  );
}
