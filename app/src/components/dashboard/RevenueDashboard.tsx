import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, Plus, Download, RefreshCw, CreditCard, DollarSign, Activity } from "lucide-react";

export default function RevenueDashboard() {
  const utils = trpc.useUtils();

  // Queries & Mutations
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = trpc.reports.getFinancialSummary.useQuery();
  const { data: txs, isLoading: loadingTxs, refetch: refetchTxs } = trpc.billing.listTransactions.useQuery();
  const { data: patientsList } = trpc.patients.list.useQuery();

  const createTx = trpc.billing.createTransaction.useMutation({
    onSuccess: () => {
      toast.success("The transaction has been successfully recorded in the financial ledger.");
      refetchSummary();
      refetchTxs();
      setNewTxOpen(false);
    }
  });

  const refundTx = trpc.billing.refundTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transaction state updated to Refunded.");
      refetchSummary();
      refetchTxs();
    }
  });

  // Local state
  const [newTxOpen, setNewTxOpen] = useState(false);

  // Form states
  const [patientId, setPatientId] = useState("");
  const [txType, setTxType] = useState<"consultation" | "medicine" | "additional_services">("consultation");
  const [amount, setAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "upi" | "card" | "bank_transfer">("cash");
  const [notes, setNotes] = useState("");

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    createTx.mutate({
      patientId: Number(patientId),
      transactionType: txType,
      amount: Number(amount),
      paymentMethod: payMethod,
      notes: notes || undefined,
    });
  };

  // CSV Export helper
  const exportToCSV = () => {
    if (!txs || txs.length === 0) return;
    const headers = ["Invoice Number", "Patient Name", "Phone", "Type", "Amount", "Method", "Status", "Date"];
    const rows = txs.map(t => [
      t.invoiceNumber,
      t.patientName || "Walk-in",
      t.patientPhone || "—",
      t.transactionType,
      t.amount,
      t.paymentMethod,
      t.status,
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billing_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Revenue & Billing Ledger</h3>
          <p className="text-muted-foreground text-sm">Dynamic consultation, walk-in, and medicine sales aggregates.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportToCSV} disabled={!txs || txs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => { refetchSummary(); refetchTxs(); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Revenue Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today Card */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Today</span>
              <DollarSign className="w-4 h-4 text-apollo-blue" />
            </div>
            <CardTitle className="text-2xl font-bold">
              ₹{summary?.today?.revenue?.toLocaleString() || "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-muted-foreground">
            <div className="flex justify-between">
              <span>Appointments:</span>
              <span className="font-semibold text-gray-900">{summary?.today?.appointments}</span>
            </div>
            <div className="flex justify-between">
              <span>Walk-ins:</span>
              <span className="font-semibold text-gray-900">{summary?.today?.walkins}</span>
            </div>
            <div className="flex justify-between">
              <span>Medicine Orders:</span>
              <span className="font-semibold text-gray-900">{summary?.today?.medicineOrders}</span>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Card */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase">This Week</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              ₹{summary?.weekly?.revenue?.toLocaleString() || "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-muted-foreground">
            <div className="flex justify-between">
              <span>Total Active Patients:</span>
              <span className="font-semibold text-gray-900">{summary?.weekly?.patientCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Appointments:</span>
              <span className="font-semibold text-gray-900">{summary?.weekly?.appointments}</span>
            </div>
            <div className="flex justify-between">
              <span>Walk-ins:</span>
              <span className="font-semibold text-gray-900">{summary?.weekly?.walkins}</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Card */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase">This Month</span>
              <Activity className="w-4 h-4 text-orange-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              ₹{summary?.monthly?.revenue?.toLocaleString() || "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-muted-foreground">
            <div className="flex justify-between">
              <span>Appointments:</span>
              <span className="font-semibold text-gray-900">{summary?.monthly?.appointments}</span>
            </div>
            <div className="flex justify-between">
              <span>Walk-ins:</span>
              <span className="font-semibold text-gray-900">{summary?.monthly?.walkins}</span>
            </div>
            <div className="flex justify-between">
              <span>Medicine Orders:</span>
              <span className="font-semibold text-gray-900">{summary?.monthly?.medicineOrders}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-bold text-gray-900">SaaS Sequential Transaction Ledger</h4>
          <Dialog open={newTxOpen} onOpenChange={setNewTxOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Sequential Billing Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTx} className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Select Patient</label>
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Match patient profile..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsList?.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.phone})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Service/Transaction Type</label>
                  <Select value={txType} onValueChange={(v: any) => setTxType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation Fee</SelectItem>
                      <SelectItem value="medicine">Medicine Sales</SelectItem>
                      <SelectItem value="additional_services">Additional Services (Tests/Procedures)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Payment Method</label>
                  <Select value={payMethod} onValueChange={(v: any) => setPayMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Payment</SelectItem>
                      <SelectItem value="upi">UPI / QR Scan</SelectItem>
                      <SelectItem value="card">Debit/Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Amount (INR)</label>
                  <Input type="number" placeholder="200" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Notes</label>
                  <Input placeholder="Extra notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <Button className="w-full mt-2" type="submit" disabled={createTx.isPending}>
                  {createTx.isPending ? "Logging transaction..." : "Generate Invoice & Record"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3">Invoice No</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Method</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {txs?.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono font-semibold text-xs">{t.invoiceNumber}</td>
                  <td className="p-3">
                    <div>
                      <div className="font-semibold">{t.patientName}</div>
                      <div className="text-xs text-muted-foreground">{t.patientPhone}</div>
                    </div>
                  </td>
                  <td className="p-3 capitalize text-xs font-mono">{t.transactionType}</td>
                  <td className="p-3 font-semibold text-gray-900">₹{t.amount.toLocaleString()}</td>
                  <td className="p-3 uppercase text-xs">{t.paymentMethod}</td>
                  <td className="p-3">
                    <Badge variant={t.status === "paid" ? "default" : "destructive"} className="text-xs">
                      {t.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 text-right">
                    {t.status === "paid" && (
                      <Button size="xs" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => refundTx.mutate({ id: t.id })}>
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
