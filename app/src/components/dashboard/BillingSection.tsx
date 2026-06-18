import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Search, FileDown, CreditCard, Printer } from "lucide-react";
import { format } from "date-fns";
import { type BillRow, loadRazorpayScript } from "@/lib/razorpay";

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

export default function BillingSection() {
  const { data: bills, isLoading } = trpc.billing.list.useQuery();
  const utils = trpc.useUtils();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const updateStatus = trpc.billing.updateStatus.useMutation({
    onSuccess: () => utils.billing.list.invalidate(),
  });

  const filteredBills = (bills as BillRow[] | undefined)?.filter((bill) => {
    const matchesFilter = filterStatus === "all" || bill.status === filterStatus;
    const matchesSearch =
      !searchTerm ||
      bill.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.patientPhone?.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const handlePayment = async (bill: BillRow) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("Failed to load Razorpay SDK. Check your internet connection.");
      return;
    }

    const rzp = new (window as unknown as { Razorpay: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      handler: (response: { razorpay_payment_id: string }) => void;
      prefill: { name: string; contact: string };
      theme: { color: string };
    }) => { open: () => void } }).Razorpay({
      key: RAZORPAY_KEY,
      amount: bill.total * 100,
      currency: "INR",
      name: "Apollo Clinic",
      description: `Bill #${bill.id}`,
      handler: () => {
        updateStatus.mutate({ id: bill.id, status: "paid", paymentMethod: "online" });
      },
      prefill: {
        name: bill.patientName,
        contact: bill.patientPhone,
      },
      theme: { color: "#2563eb" },
    });
    rzp.open();
  };

  const exportCSV = () => {
    const rows = filteredBills || [];
    const csv = [
      ["Bill ID", "Patient", "Phone", "Amount", "Tax", "Discount", "Total", "Status", "Payment Method", "Date"],
      ...rows.map((b) => [
        b.id,
        b.patientName,
        b.patientPhone,
        b.amount,
        b.tax,
        b.discount,
        b.total,
        b.status,
        b.paymentMethod || "—",
        b.createdAt ? format(new Date(b.createdAt), "dd/MM/yyyy") : "—",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search bills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV}>
          <FileDown className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Bill ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No bills found
                </TableCell>
              </TableRow>
            ) : (
              filteredBills?.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">#{bill.id}</TableCell>
                  <TableCell>{bill.patientName}</TableCell>
                  <TableCell>{bill.patientPhone}</TableCell>
                  <TableCell>₹{bill.amount}</TableCell>
                  <TableCell>₹{bill.tax}</TableCell>
                  <TableCell>₹{bill.discount}</TableCell>
                  <TableCell className="font-semibold">₹{bill.total}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        bill.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : bill.status === "unpaid"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {bill.status}
                    </span>
                  </TableCell>
                  <TableCell>{bill.paymentMethod || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {bill.status === "unpaid" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600"
                          title="Pay via Razorpay"
                          onClick={() => handlePayment(bill)}
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600"
                          title="Mark as Paid (Cash)"
                          onClick={() =>
                            updateStatus.mutate({
                              id: bill.id,
                              status: "paid",
                              paymentMethod: "cash",
                            })
                          }
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
