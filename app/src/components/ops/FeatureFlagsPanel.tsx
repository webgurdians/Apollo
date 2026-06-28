import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface FeatureFlag {
  id: string;
  tenantId: string | null;
  key: string;
  name: string;
  category: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
}

interface FeatureFlagsPanelProps {
  flags: FeatureFlag[] | undefined;
  onToggle: (id: string, enabled: boolean) => void;
  loading: boolean;
  error?: any;
}

export default function FeatureFlagsPanel({ flags, onToggle, loading, error }: FeatureFlagsPanelProps) {
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 font-mono text-xs">
        <span className="font-bold">CRITICAL ERROR QUERYING FEATURE FLAGS:</span> {error.message || String(error)}
      </div>
    );
  }

  if (loading || !flags) {
    return <div className="text-slate-400 font-mono text-sm">Querying runtime flags ledger...</div>;
  }

  const coreFlags = flags.filter(f => f.category === "core");
  const otherFlags = flags.filter(f => f.category !== "core");

  const renderFlag = (flag: FeatureFlag) => (
    <div key={flag.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md">
      <div className="space-y-1 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{flag.name}</span>
          <Badge variant="outline" className="text-[10px] font-mono border-slate-800 uppercase px-1.5 py-0 text-slate-400">
            {flag.key}
          </Badge>
          <Badge className={`text-[10px] font-mono px-1.5 py-0 ${flag.category === "core" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" : "bg-blue-950/40 text-blue-400 border border-blue-500/20"}`}>
            {flag.category}
          </Badge>
        </div>
        <p className="text-xs text-slate-400 leading-normal">{flag.description || `Module control key: ${flag.key}`}</p>
      </div>
      <Switch
        checked={flag.enabled}
        onCheckedChange={(checked) => onToggle(flag.id, checked)}
        className="data-[state=checked]:bg-emerald-600 animate-none"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Core Flags */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wide">Core Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreFlags.map(renderFlag)}
        </div>
      </div>

      {/* Experimental/Other Flags */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wide">Integrations & Add-ons</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherFlags.map(renderFlag)}
        </div>
      </div>
    </div>
  );
}
