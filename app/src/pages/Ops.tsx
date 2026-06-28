import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Shield } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import OpsLayout from "@/components/ops/OpsLayout";
import OverviewPanel from "@/components/ops/OverviewPanel";
import FeatureFlagsPanel from "@/components/ops/FeatureFlagsPanel";
import KillswitchPanel from "@/components/ops/KillswitchPanel";
import AuditLogsTable from "@/components/ops/AuditLogsTable";
import { useNavigate } from "react-router";

export default function Ops() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState("overview");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Login mutation for developer gate
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLoginError("");
      setPassword("");
    },
    onError: (err) => {
      setLoginError(err.message || "Invalid developer credentials");
    },
  });

  const handleDevLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username: "developer", password });
  };

  // OCC Data Queries — only enabled when founder is authenticated
  const isFounder = !!user && user.role === "founder";

  const { data: dashboard, isLoading: dashLoading, error: dashError } = trpc.ops.getOpsDashboard.useQuery(undefined, {
    enabled: isFounder,
    refetchInterval: 30000,
  });

  const { data: featureFlags, isLoading: flagsLoading, error: flagsError } = trpc.ops.getFeatureFlags.useQuery(undefined, {
    enabled: isFounder,
  });

  const { data: killswitches, isLoading: switchesLoading, error: switchesError } = trpc.ops.getKillswitches.useQuery(undefined, {
    enabled: isFounder,
  });

  const { data: auditLogs, isLoading: auditLoading, error: auditError } = trpc.ops.getAuditLogs.useQuery(undefined, {
    enabled: isFounder,
  });

  const toggleFlagMutation = trpc.ops.toggleFeatureFlag.useMutation({
    onSuccess: () => {
      utils.ops.getFeatureFlags.invalidate();
      utils.ops.getOpsDashboard.invalidate();
      utils.ops.getAuditLogs.invalidate();
    },
  });

  const toggleSwitchMutation = trpc.ops.toggleKillswitch.useMutation({
    onSuccess: () => {
      utils.ops.getKillswitches.invalidate();
      utils.ops.getOpsDashboard.invalidate();
      utils.ops.getAuditLogs.invalidate();
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Developer Gate — show login if not founder
  if (!isFounder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <Card className="w-full max-w-sm bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader className="text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-950 border border-emerald-500/30 rounded-xl flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white font-mono tracking-tight">Operations Gate</CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Restricted access — founder credentials required
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDevLogin} className="space-y-4">
              {user && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/30 text-xs text-red-400 text-center">
                  Currently logged in as <span className="font-semibold">{user.username}</span> ({user.role}) — access denied.
                </div>
              )}
              {loginError && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/30 text-xs text-red-400 text-center">
                  {loginError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="dev-username" className="text-slate-300 text-sm">Username</Label>
                <Input
                  id="dev-username"
                  value="developer"
                  readOnly
                  className="bg-slate-800 border-slate-700 text-slate-400 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-password" className="text-slate-300 text-sm">Password</Label>
                <Input
                  id="dev-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter founder password"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-mono tracking-wide"
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...</>
                ) : "Access OCC"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewPanel stats={dashboard} loading={dashLoading} error={dashError} />;
      case "feature_flags":
        return (
          <FeatureFlagsPanel
            flags={featureFlags}
            onToggle={(id, enabled) => toggleFlagMutation.mutate({ id, enabled })}
            loading={flagsLoading}
            error={flagsError}
          />
        );
      case "emergency_controls":
        return (
          <KillswitchPanel
            switches={killswitches}
            onToggle={(key, active) => toggleSwitchMutation.mutate({ key, active })}
            loading={switchesLoading}
            error={switchesError}
          />
        );
      case "audit_logs":
        return <AuditLogsTable logs={auditLogs} loading={auditLoading} error={auditError} />;
      default:
        return null;
    }
  };

  return (
    <OpsLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      username={user.username}
    >
      {renderContent()}
    </OpsLayout>
  );
}
