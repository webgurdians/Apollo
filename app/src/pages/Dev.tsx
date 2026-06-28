import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogOut, Plus, Settings, Shield } from "lucide-react";
import { BackupRestore } from "@/components/BackupRestore";
import { ActivityLogView } from "@/components/ActivityLogView";
import { WhatsAppTemplates } from "@/components/WhatsAppTemplates";
import { useState } from "react";
import { useNavigate } from "react-router";

const FEATURE_LABELS: Record<string, string> = {
  appointments: "Appointments Management",
  patients: "Patient Registration",
  billing: "Billing",
  medicine_orders: "Medicine Orders",
  contacts: "Contacts / Enquiries",
  staff: "Staff Management",
  doctors: "Doctors List",
  end_of_day_report: "End of Day Report",
  featured_doctor_popup: "Featured Doctor Popup Config",
  report_dispatch: "Report Dispatch Module",
  global_search: "Global Search",
};

const DEV_ONLY_FEATURES = ["backup_restore", "activity_log", "whatsapp_templates"];

export default function Dev() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: flags } = trpc.features.list.useQuery();
  const toggleMutation = trpc.features.toggle.useMutation({ onSuccess: () => utils.features.list.invalidate() });
  const createMutation = trpc.features.create.useMutation({ onSuccess: () => utils.features.list.invalidate() });
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="bg-slate-950 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Developer Dashboard</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-900 text-emerald-300 border border-emerald-700 uppercase">
              {user?.role || "founder"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => navigate("/admin")}>
              <Settings className="w-4 h-4 mr-2" />
              Client Admin
            </Button>
            <span className="text-sm text-slate-400">{user?.username}</span>
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-100">Client Features</CardTitle>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Feature
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Add New Feature</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate(
                      { name: newName, key: newKey, enabledByDefault: false },
                      { onSuccess: () => { setNewName(""); setNewKey(""); setShowCreate(false); } }
                    );
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label className="text-slate-300">Feature Name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        setNewKey(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
                      }}
                      placeholder="e.g. Patient Feedback"
                      className="bg-slate-800 border-slate-600 text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Feature Key</Label>
                    <Input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="patient_feedback"
                      className="bg-slate-800 border-slate-600 text-slate-100"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending || !newName || !newKey}>
                    {createMutation.isPending ? "Creating..." : "Create Feature"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-slate-200 text-sm font-medium">{label}</span>
                  <Switch
                    checked={flags?.[key] ?? false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ featureKey: key, enabled: checked })}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              ))}
              {flags && Object.keys(flags).filter(k => !(k in FEATURE_LABELS)).map((key) => (
                <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-slate-200 text-sm font-medium">{key}</span>
                  <Switch
                    checked={flags[key] ?? false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ featureKey: key, enabled: checked })}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Developer Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Backup & Restore</h3>
              <BackupRestore />
            </div>
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Activity Log</h3>
              <ActivityLogView />
            </div>
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">WhatsApp Templates</h3>
              <WhatsAppTemplates />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
