import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Download, Upload, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function BackupRestore() {
  const [restoreFilename, setRestoreFilename] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const { data: backups, isLoading: loadingBackups, refetch: refetchBackups } = trpc.backup.list.useQuery();
  const createBackupMut = trpc.backup.create.useMutation({
    onSuccess: () => { refetchBackups(); setStatus({ type: "success", message: "Backup created successfully" }); },
    onError: (e) => setStatus({ type: "error", message: e.message }),
  });
  const restoreMut = trpc.backup.restore.useMutation({
    onSuccess: (r) => { setStatus({ type: "success", message: `System restored from backup. Safety backup: ${r.safetyBackup}` }); },
    onError: (e) => setStatus({ type: "error", message: e.message }),
  });

  const handleDownload = async (filename: string) => {
    try {
      const result = await trpc.backup.download.fetch({ filename });
      const blob = base64ToBlob(result.data, "application/zip");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Download failed" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      restoreMut.mutate({ filename: file.name, data: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Database Backup & Restore</h3>
        <p className="text-sm text-muted-foreground">
          Backups are created automatically every night at 11 PM. Last 30 backups are kept.
        </p>
      </div>

      {status && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {status.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {status.message}
          <button onClick={() => setStatus(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => createBackupMut.mutate()} disabled={createBackupMut.isPending}>
          {createBackupMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Create Backup
        </Button>
        <label>
          <Button variant="outline" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              Restore Backup
            </span>
          </Button>
          <input type="file" accept=".zip" className="hidden" onChange={handleFileUpload} />
        </label>
        <Button variant="ghost" size="icon" onClick={() => refetchBackups()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Available Backups</h4>
        {loadingBackups ? (
          <div className="text-sm text-muted-foreground">Loading backups...</div>
        ) : !backups?.length ? (
          <div className="text-sm text-muted-foreground">No backups yet. Click "Create Backup" to start.</div>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div key={b.filename} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div>
                  <div className="text-sm font-medium">{b.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(b.createdAt), "MMM d, yyyy h:mm a")} · {(b.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(b.filename)}>
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                    if (confirm(`Restore from ${b.filename}? Current data will be backed up first.`)) {
                      restoreMut.mutate({ filename: b.filename });
                    }
                  }}>
                    <Upload className="w-3 h-3 mr-1" /> Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteArrays = [];
  for (let offset = 0; offset < byteChars.length; offset += 512) {
    const slice = byteChars.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}
