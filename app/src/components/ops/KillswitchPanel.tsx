import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

interface Killswitch {
  key: string;
  name: string;
  active: boolean;
  triggeredBy: string;
  triggeredAt: Date;
}

interface KillswitchPanelProps {
  switches: Killswitch[] | undefined;
  onToggle: (key: string, active: boolean) => void;
  loading: boolean;
  error?: any;
}

export default function KillswitchPanel({ switches, onToggle, loading, error }: KillswitchPanelProps) {
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 font-mono text-xs">
        <span className="font-bold">CRITICAL ERROR QUERYING KILLSWITCHES:</span> {error.message || String(error)}
      </div>
    );
  }

  if (loading || !switches) {
    return <div className="text-slate-400 font-mono text-sm">Querying system killswitches ledger...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400">
        <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
        <div className="text-xs font-mono leading-normal">
          <span className="font-bold">CRITICAL WARNING:</span> Engaging a killswitch immediately halts processing of that workflow clinic-wide. Use with extreme caution.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {switches.map((sw) => (
          <div key={sw.key} className={`flex items-center justify-between p-5 rounded-xl bg-slate-900 border transition-all shadow-md ${
            sw.active ? "border-red-900 ring-1 ring-red-900/40" : "border-slate-800 hover:border-slate-700/80"
          }`}>
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-100">{sw.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">TRIGGER: {sw.triggeredBy}</span>
                {sw.active && (
                  <Badge variant="destructive" className="text-[9px] font-mono px-1 py-0 h-4 uppercase animate-pulse">
                    ACTIVE
                  </Badge>
                )}
              </div>
            </div>
            <Switch
              checked={sw.active}
              onCheckedChange={(checked) => onToggle(sw.key, checked)}
              className="data-[state=checked]:bg-red-600 animate-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
