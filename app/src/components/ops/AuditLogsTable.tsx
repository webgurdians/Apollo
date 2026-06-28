import { useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditLog {
  id: number;
  tenantId: string | null;
  username: string;
  action: string;
  module: string;
  metadata: string | null;
  timestamp: Date;
}

interface AuditLogsTableProps {
  logs: AuditLog[] | undefined;
  loading: boolean;
  error?: any;
}

export default function AuditLogsTable({ logs, loading, error }: AuditLogsTableProps) {
  const [search, setSearch] = useState("");

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 font-mono text-xs">
        <span className="font-bold">CRITICAL ERROR QUERYING AUDIT LOGS:</span> {error.message || String(error)}
      </div>
    );
  }

  if (loading || !logs) {
    return <div className="text-slate-400 font-mono text-sm">Querying audit logs ledger...</div>;
  }

  const filteredLogs = logs
    .filter(
      (log) =>
        log.username.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.module.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Filter audit trail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus-visible:ring-emerald-500"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-slate-950/60 border-b border-slate-800">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="font-mono text-slate-400 text-xs">ID</TableHead>
              <TableHead className="font-mono text-slate-400 text-xs">TENANT</TableHead>
              <TableHead className="font-mono text-slate-400 text-xs">USER</TableHead>
              <TableHead className="font-mono text-slate-400 text-xs">ACTION</TableHead>
              <TableHead className="font-mono text-slate-400 text-xs">MODULE</TableHead>
              <TableHead className="font-mono text-slate-400 text-xs">METADATA</TableHead>
              <TableHead className="font-mono text-slate-400 text-xs text-right">TIMESTAMP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="text-center font-mono text-slate-500 py-12 text-xs">
                  NO ACTION TRAIL RECORDED
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                return (
                  <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/20">
                    <TableCell className="font-mono text-slate-400 text-xs">#{log.id}</TableCell>
                    <TableCell className="font-mono text-slate-300 text-xs">{log.tenantId || "system"}</TableCell>
                    <TableCell className="font-semibold text-slate-200 text-xs">{log.username}</TableCell>
                    <TableCell className="font-mono text-emerald-400 text-xs">{log.action}</TableCell>
                    <TableCell className="font-mono text-slate-300 text-xs">{log.module}</TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-slate-500 text-xs" title={log.metadata || ""}>
                      {log.metadata || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-slate-400 text-xs text-right">
                      {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
