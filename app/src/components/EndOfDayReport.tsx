import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function EndOfDayReport() {
  const { data: stats, isLoading } = trpc.appointment.stats.useQuery();
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    if (!stats) return;
    setGenerating(true);

    const today = format(new Date(), "MMMM d, yyyy");
    const lines = [
      `========================================`,
      `  APOLLO CLINIC - END OF DAY REPORT`,
      `  ${today}`,
      `========================================`,
      ``,
      `Today's Summary:`,
      `  Total Appointments: ${stats.todayAppointments}`,
      `  Completed:          ${stats.todayCompleted}`,
      `  Pending:            ${stats.todayPending}`,
      `  Revenue Today:      ₹${stats.todayRevenue}`,
      ``,
      `Monthly Summary:`,
      `  Appointments:       ${stats.monthAppointments}`,
      `  Revenue (paid):     ₹${stats.monthRevenue}`,
      ``,
      `Patient Summary:`,
      `  New Patients:       ${stats.newPatients}`,
      `  Returning Patients: ${stats.returningPatients}`,
      ``,
      `Overall Totals:`,
      `  Total Appointments: ${stats.total}`,
      `  Completed:          ${stats.completed}`,
      `  Pending:            ${stats.pending}`,
      `  Paid:               ${stats.paid}`,
      ``,
      `========================================`,
      `  Generated at: ${new Date().toLocaleString()}`,
      `========================================`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${format(new Date(), "yyyy-MM-dd")}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerating(false);
  };

  const generateCSV = async () => {
    if (!stats) return;
    setGenerating(true);

    const headers = ["Metric", "Value"];
    const rows = [
      ["Date", format(new Date(), "yyyy-MM-dd")],
      ["Today's Appointments", String(stats.todayAppointments)],
      ["Today Completed", String(stats.todayCompleted)],
      ["Today Pending", String(stats.todayPending)],
      ["Revenue Today", String(stats.todayRevenue)],
      ["Month Appointments", String(stats.monthAppointments)],
      ["Month Revenue", String(stats.monthRevenue)],
      ["New Patients", String(stats.newPatients)],
      ["Returning Patients", String(stats.returningPatients)],
      ["Total Appointments", String(stats.total)],
      ["Completed", String(stats.completed)],
      ["Pending", String(stats.pending)],
      ["Paid", String(stats.paid)],
    ];

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${format(new Date(), "yyyy-MM-dd")}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerating(false);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading report data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">End of Day Report</h3>
        <p className="text-sm text-muted-foreground">
          Generate a summary of today's activities. Download as TXT or CSV.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">Today's Appointments</div>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">Completed Today</div>
            <div className="text-2xl font-bold text-green-600">{stats.todayCompleted}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">Revenue Today</div>
            <div className="text-2xl font-bold text-blue-600">₹{stats.todayRevenue}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">New Patients</div>
            <div className="text-2xl font-bold text-purple-600">{stats.newPatients}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">Returning Patients</div>
            <div className="text-2xl font-bold text-orange-600">{stats.returningPatients}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">Month Revenue</div>
            <div className="text-2xl font-bold text-emerald-600">₹{stats.monthRevenue}</div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={generateReport} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          Download TXT Report
        </Button>
        <Button variant="outline" onClick={generateCSV} disabled={generating}>
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </Button>
      </div>
    </div>
  );
}
