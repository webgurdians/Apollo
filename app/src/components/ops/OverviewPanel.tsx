import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck, Activity, Sliders, CheckCircle, Database } from "lucide-react";

interface OverviewPanelProps {
  stats: {
    activeFlags: number;
    activeKillswitches: number;
    unresolvedErrors: number;
    lastBackup: Date | null;
    latestRelease: string | null;
  } | undefined;
  loading: boolean;
  error?: any;
}

export default function OverviewPanel({ stats, loading, error }: OverviewPanelProps) {
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 font-mono text-xs">
        <span className="font-bold">CRITICAL ERROR QUERYING OCC METRICS:</span> {error.message || String(error)}
      </div>
    );
  }

  if (loading || !stats) {
    return <div className="text-slate-400 font-mono text-sm">Loading system metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-mono font-semibold text-slate-400 uppercase tracking-wide">System Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Flags */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono uppercase text-slate-400">Active Feature Flags</CardTitle>
            <Sliders className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-white">{stats.activeFlags}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">MODULE LEVEL CONTROLS ACTIVE</p>
          </CardContent>
        </Card>

        {/* Emergency Killswitches */}
        <Card className={`bg-slate-900 border-slate-800 shadow-xl ${stats.activeKillswitches > 0 ? 'ring-1 ring-red-500/30' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono uppercase text-slate-400">Active Killswitches</CardTitle>
            {stats.activeKillswitches > 0 ? (
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-mono font-bold ${stats.activeKillswitches > 0 ? 'text-red-500' : 'text-white'}`}>
              {stats.activeKillswitches}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              {stats.activeKillswitches > 0 ? 'EMERGENCY SHUTDOWNS ENGAGED' : 'ALL PLATFORM CHANNELS SECURE'}
            </p>
          </CardContent>
        </Card>

        {/* Active Errors */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono uppercase text-slate-400">Unresolved Errors</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-white">{stats.unresolvedErrors}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">SPRINT 2 MONITORING PENDING</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-sm font-mono font-semibold text-slate-400 uppercase tracking-wide pt-4">Operational Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Status */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-xs font-mono text-slate-400">DATABASE BACKUP SYSTEM</div>
              <div className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                {stats.lastBackup ? new Date(stats.lastBackup).toLocaleString() : "SPRINT 2 BACKUPS PENDING"}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-850 text-slate-500">INACTIVE</span>
        </div>

        {/* Release Version */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-xs font-mono text-slate-400">CURRENT PLATFORM RELEASE</div>
              <div className="text-xs font-mono font-semibold text-emerald-400/80 mt-0.5">
                {stats.latestRelease ?? "v1.0.0-sprint1"}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">LIVE</span>
        </div>
      </div>
    </div>
  );
}
