import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Upload,
  FileText,
  Search,
  CheckCircle,
  Send,
  Eye,
} from "lucide-react";

const REPORT_TYPES = ["Blood Test", "X-Ray", "ECG", "USG", "Other"] as const;

type StatusTab = "pending" | "to_be_sent" | "sent" | "all";

export default function ReportDispatchSection() {
  const utils = trpc.useUtils();
  const { data: doctors } = trpc.patients.listDoctors.useQuery();
  const { data: patients } = trpc.patients.list.useQuery();
  const { data: reports } = trpc.reports.list.useQuery();
  const createReport = trpc.reports.create.useMutation();
  const updateStatus = trpc.reports.updateStatus.useMutation({
    onSuccess: () => utils.reports.list.invalidate(),
  });

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [reportType, setReportType] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filteredPatients = patients?.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  const filteredReports = reports?.filter((r) => {
    if (statusTab === "all") return true;
    return r.status === statusTab;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedPatientId || !selectedDoctorId || !reportType || !file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Url = reader.result as string;
          await createReport.mutateAsync({
            patientId: selectedPatientId,
            doctorId: parseInt(selectedDoctorId),
            reportType,
            fileUrl: base64Url,
            fileName: file.name,
            fileType: file.type.startsWith("image/") ? "image" : "pdf",
            notes: notes || undefined,
          });
          utils.reports.list.invalidate();
          setSelectedPatientId(null);
          setSelectedDoctorId("");
          setReportType("");
          setNotes("");
          setFile(null);
          setPreviewUrl(null);
          setUploading(false);
        } catch (err: any) {
          console.error("Upload failed", err);
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload failed", err);
      setUploading(false);
    }
  };

  const handleSendWhatsApp = (report: NonNullable<typeof reports>[number]) => {
    const patient = patients?.find((p) => p.id === report.patientId);
    if (!patient) return;
    window.open(
      `https://wa.me/91${patient.phone}?text=${encodeURIComponent(
        `Your ${report.reportType} report is ready: ${report.fileUrl}`
      )}`,
      "_blank"
    );
    updateStatus.mutate({ id: report.id, status: "sent" });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      to_be_sent: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700",
      viewed: "bg-purple-100 text-purple-700",
    };
    return (
      <Badge variant="secondary" className={styles[status] || ""}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="to_be_sent">To Be Sent</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="space-y-6">
          {/* Upload panel */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-apollo-blue" />
              Upload Report
            </h3>

            {/* Patient search */}
            <div className="space-y-2">
              <Label>Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient by name or phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {patientSearch && filteredPatients && (
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearch(`${p.name} (${p.phone})`);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        selectedPatientId === p.id ? "bg-apollo-blue/10 font-medium" : ""
                      }`}
                    >
                      {p.name} — {p.phone}
                    </button>
                  ))}
                  {filteredPatients.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No patients found</div>
                  )}
                </div>
              )}
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <Label>Assign to Doctor</Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name} — {d.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File picker */}
            <div className="space-y-2">
              <Label>File (PDF or Image)</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={handleFileSelect} />
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="max-h-40 rounded-lg border object-contain" />
              )}
              {file && file.type === "application/pdf" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  {file.name}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedPatientId || !selectedDoctorId || !reportType || !file || uploading}
              className="w-full"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Upload Report</>
              )}
            </Button>
          </div>

          {/* Status board */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.patientName}</div>
                        <div className="text-xs text-muted-foreground">{r.patientPhone}</div>
                      </TableCell>
                      <TableCell>{r.doctorName}</TableCell>
                      <TableCell>{r.reportType}</TableCell>
                      <TableCell>
                        <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-apollo-blue underline text-sm">
                          {r.fileName}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(newStatus) => {
                            updateStatus.mutate({ id: r.id, status: newStatus as any });
                          }}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="to_be_sent">To Be Sent</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="viewed">Viewed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => updateStatus.mutate({ id: r.id, status: "to_be_sent" })}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Ready
                          </Button>
                        )}
                        {r.status === "to_be_sent" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleSendWhatsApp(r)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send via WhatsApp
                          </Button>
                        )}
                        {r.status === "sent" && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Eye className="w-3 h-3" />
                            {r.viewedAt ? "Viewed" : "Sent"}
                          </span>
                        )}
                        {r.status === "viewed" && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">Viewed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
