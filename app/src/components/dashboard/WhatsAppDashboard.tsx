import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Send, RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function WhatsAppDashboard() {
  const { data: flags } = trpc.features.list.useQuery();

  // Queries & Mutations
  const { data: settings, refetch: refetchSettings } = trpc.whatsapp.getSettings.useQuery();
  const saveSettings = trpc.whatsapp.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("WhatsApp configuration has been saved and verified successfully.");
      refetchSettings();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const { data: templates, refetch: refetchTemplates } = trpc.whatsapp.listTemplates.useQuery();
  const createTemplate = trpc.whatsapp.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("The template has been registered successfully.");
      refetchTemplates();
      setNewTemplateOpen(false);
    }
  });
  const deleteTemplate = trpc.whatsapp.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template version has been removed.");
      refetchTemplates();
    }
  });
  const toggleTemplateActive = trpc.whatsapp.toggleTemplateActive.useMutation({
    onSuccess: () => {
      toast.success("Active version switched.");
      refetchTemplates();
    }
  });

  const { data: campaigns, refetch: refetchCampaigns } = trpc.whatsapp.listCampaigns.useQuery();
  const createCampaign = trpc.whatsapp.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Broadcast queue has been populated.");
      refetchCampaigns();
      setNewCampaignOpen(false);
    }
  });

  const { data: logs, refetch: refetchLogs } = trpc.whatsapp.listMessages.useQuery({ limit: 50 });

  const showCampaigns = flags?.whatsapp === true || flags?.apollo_campaigns_enabled === true;
  const showWhatsapp = flags?.whatsapp === true || flags?.apollo_whatsapp_enabled === true;

  // Local state
  const [activeTab, setActiveTab] = useState("templates");
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);

  useEffect(() => {
    if (flags) {
      const canWhatsapp = flags.whatsapp === true || flags.apollo_whatsapp_enabled === true;
      const canCampaigns = flags.whatsapp === true || flags.apollo_campaigns_enabled === true;
      if (!canWhatsapp && canCampaigns && activeTab === "templates") {
        setActiveTab("campaigns");
      }
    }
  }, [flags, activeTab]);

  // Form states
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [businessId, setBusinessId] = useState("");

  const [tplName, setTplName] = useState("");
  const [tplKey, setTplKey] = useState("");
  const [tplCategory, setTplCategory] = useState<"utility" | "marketing" | "authentication">("utility");

  const [campName, setCampName] = useState("");
  const [campTplId, setCampTplId] = useState("");
  const [campSegment, setCampSegment] = useState<any>("all_patients");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings.mutate({
      metaAccessToken: token,
      phoneNumberId: phoneId,
      businessAccountId: businessId,
    });
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplate.mutate({
      name: tplName,
      templateKey: tplKey,
      category: tplCategory,
    });
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign.mutate({
      name: campName,
      templateId: Number(campTplId),
      segmentType: campSegment,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">WhatsApp Automation Engine</h3>
          <p className="text-muted-foreground text-sm">Monitor campaigns, Meta templates, and live delivery logs.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={settings?.hasToken ? "default" : "destructive"}>
            {settings?.hasToken ? "Connected to Meta" : "Simulated/Mock Mode"}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex gap-2 w-max bg-slate-100 p-1 rounded-md mb-4">
          {showWhatsapp && <TabsTrigger value="templates">Templates</TabsTrigger>}
          {showCampaigns && <TabsTrigger value="campaigns">Broadcast Campaigns</TabsTrigger>}
          {showWhatsapp && <TabsTrigger value="logs">Delivery Logs</TabsTrigger>}
          {showWhatsapp && <TabsTrigger value="settings">Connection Settings</TabsTrigger>}
        </TabsList>

        {showWhatsapp && (
          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="flex justify-between">
              <h4 className="text-lg font-bold">Approved Meta Templates</h4>
              <Dialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Template Version
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Register Template Version</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTemplate} className="space-y-4 mt-2">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Friendly Name</label>
                      <Input placeholder="e.g. Booking Confirmation V2" value={tplName} onChange={e => setTplName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Meta Template Key</label>
                      <Input placeholder="e.g. appointment_confirmation" value={tplKey} onChange={e => setTplKey(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Category</label>
                      <Select value={tplCategory} onValueChange={(v: any) => setTplCategory(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utility">Utility (Transactional)</SelectItem>
                          <SelectItem value="marketing">Marketing (Announcements)</SelectItem>
                          <SelectItem value="authentication">Authentication (OTPs)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full mt-2" type="submit" disabled={createTemplate.isPending}>
                      {createTemplate.isPending ? "Registering..." : "Submit Template Version"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map((t) => (
                <Card key={t.id} className={t.isActive ? "border-apollo-blue" : "opacity-75"}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-md">{t.name}</CardTitle>
                        <CardDescription className="text-xs font-mono">{t.templateKey}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 text-xs">
                    <div className="flex justify-between border-b pb-1 mb-1">
                      <span className="text-muted-foreground">Category</span>
                      <span className="capitalize font-semibold">{t.category}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 mb-1">
                      <span className="text-muted-foreground">Version</span>
                      <span>v{t.version}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 mb-1">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "Active Version" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="pt-2 flex justify-between gap-2">
                      <Button size="xs" variant={t.isActive ? "outline" : "default"} className="flex-1 text-xs" onClick={() => toggleTemplateActive.mutate({ id: t.id, isActive: !t.isActive })}>
                        {t.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="xs" variant="destructive" className="px-2" onClick={() => deleteTemplate.mutate({ id: t.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {showCampaigns && (
          <TabsContent value="campaigns" className="space-y-4 mt-4">
            <div className="flex justify-between">
              <h4 className="text-lg font-bold">Announcements & Campaigns</h4>
              <Dialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Launch Broadcast Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure Broadcast Campaign</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCampaign} className="space-y-4 mt-2">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Campaign Name</label>
                      <Input placeholder="e.g. Free Health Camp Announcement" value={campName} onChange={e => setCampName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Select Meta Template</label>
                      <Select value={campTplId} onValueChange={setCampTplId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose active template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates?.filter(t => t.isActive).map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.name} (V{t.version})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Audience Segment</label>
                      <Select value={campSegment} onValueChange={setCampSegment}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_patients">All Active Patients</SelectItem>
                          <SelectItem value="recent_patients">Recent Patients (Last 30 Days)</SelectItem>
                          <SelectItem value="returning_patients">Returning Patients (&gt; 1 Visit)</SelectItem>
                          <SelectItem value="followup_due">Follow-up Due</SelectItem>
                          <SelectItem value="medicine_customers">Medicine Customers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full mt-2" type="submit" disabled={createCampaign.isPending}>
                      {createCampaign.isPending ? "Creating campaign..." : "Publish Broadcast"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3">Campaign Name</th>
                    <th className="p-3">Audience Segment</th>
                    <th className="p-3">Target Size</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns?.map((c) => {
                    const status = c.status || "draft";
                    return (
                      <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-semibold">{c.name}</td>
                        <td className="p-3 font-mono text-xs capitalize">{c.segmentType?.replace("_", " ")}</td>
                        <td className="p-3">{c.totalAudienceCount || 0}</td>
                        <td className="p-3">
                          <Badge variant={status === "completed" ? "default" : status === "processing" ? "outline" : "secondary"}>
                            {status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-muted-foreground text-xs">
                          {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {showWhatsapp && (
          <TabsContent value="logs" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-bold">Real-Time Delivery tracking</h4>
              <Button size="sm" variant="outline" onClick={() => refetchLogs()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Logs
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Provider MSG ID</th>
                    <th className="p-3 text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs?.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold">{l.patientName}</td>
                      <td className="p-3 font-mono text-xs">{l.patientPhone}</td>
                      <td className="p-3 capitalize">{l.messageType}</td>
                      <td className="p-3">
                        <Badge variant={l.status === "read" ? "default" : l.status === "delivered" ? "outline" : "secondary"} className="flex w-max items-center gap-1.5">
                          {l.status === "read" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          {l.status === "delivered" && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                          {l.status === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
                          {l.status === "queued" && <Clock className="w-3 h-3" />}
                          {l.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[10px] truncate max-w-[150px]">{l.providerMessageId || "—"}</td>
                      <td className="p-3 text-right text-muted-foreground text-xs">
                        {l.sentAt ? new Date(l.sentAt).toLocaleTimeString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {showWhatsapp && (
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Meta Cloud API Integration Credentials</CardTitle>
                <CardDescription>Configure webhook security and Meta authorization keys.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Meta Access Token</label>
                    <Input type="password" placeholder="EAA..." value={token} onChange={e => setToken(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Phone Number ID</label>
                    <Input placeholder="e.g. 10459203..." value={phoneId} onChange={e => setPhoneId(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Business Account ID</label>
                    <Input placeholder="e.g. 29381045..." value={businessId} onChange={e => setBusinessId(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={saveSettings.isPending}>
                    {saveSettings.isPending ? "Connecting..." : "Verify & Save Credentials"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
