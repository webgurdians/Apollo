import { trpc, getBaseUrl } from "@/providers/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Phone, Receipt, Trash2 } from "lucide-react";
import { format } from "date-fns";

const servicePrices: Record<string, number> = {
  "OPD Consultation - General Physician": 500,
  "OPD Consultation - Diabetes & Thyroid": 600,
  "OPD Consultation - Cardiology (BP/ECG)": 800,
  "Blood Test / Pathology": 1200,
  "ECG": 300,
  "Urine Test": 150,
  "Ultrasound": 1000,
  "Apollo Chennai Direct Appointment": 1500,
  "Health Checkup Package": 2999,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  confirmed: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  completed: "bg-green-100 text-green-700 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
};

const paymentColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  paid: "bg-green-100 text-green-700 hover:bg-green-100",
  failed: "bg-red-100 text-red-700 hover:bg-red-100",
};

export default function AppointmentsSection() {
  const { data: appointments, isLoading } = trpc.appointment.list.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const utils = trpc.useUtils();

  const updateStatus = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => utils.appointment.list.invalidate(),
  });

  const updatePayment = trpc.appointment.updatePaymentStatus.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
      utils.billing.list.invalidate();
    },
  });

  const createBill = trpc.billing.create.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      utils.billing.list.invalidate();
    },
    onError: (err) => alert("Error generating bill: " + err.message),
  });

  const deleteAppointment = trpc.appointment.delete.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
    },
  });

  const renderPaymentStatus = (apt: any) => {
    if (apt.amountPaid !== null && apt.amountPaid !== undefined) {
      if (apt.amountDue > 0) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Partial (₹{apt.amountPaid} paid, ₹{apt.amountDue} due)
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Paid (₹{apt.amountPaid})
          </span>
        );
      }
    }

    if (apt.paymentStatus === "paid") {
      const price = apt.doctorFees ?? servicePrices[apt.service] ?? 500;
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          Paid (₹{price})
        </span>
      );
    } else if (apt.paymentStatus === "pending") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          Unpaid
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          Failed
        </span>
      );
    }
  };

  const confirmedOrPaidAppointments = appointments?.filter(
    (apt) => apt.status === "confirmed" || apt.paymentStatus === "paid" || apt.status === "completed"
  ) || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
      </div>
    );
  }

  if (!confirmedOrPaidAppointments.length) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-muted-foreground">
        No confirmed or paid appointments yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Token No</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Payment Details</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {confirmedOrPaidAppointments.map((apt) => (
              <TableRow key={apt.id}>
                <TableCell className="font-semibold text-apollo-blue">
                  {apt.appointmentNumber ? `Token #${apt.appointmentNumber}` : "—"}
                </TableCell>
                <TableCell className="font-medium text-muted-foreground">#{apt.id}</TableCell>
                <TableCell className="font-medium">{apt.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    {apt.phone}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{apt.service}</TableCell>
                <TableCell>
                  {apt.preferredDate
                    ? format(new Date(apt.preferredDate), "dd MMM yyyy")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={apt.status}
                    onValueChange={(val: "pending" | "confirmed" | "completed" | "cancelled") =>
                      updateStatus.mutate({ id: apt.id, status: val })
                    }
                  >
                    <SelectTrigger className={`w-32 h-8 text-xs ${statusColors[apt.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={apt.paymentStatus}
                    onValueChange={(val: "pending" | "paid" | "failed") =>
                      updatePayment.mutate({ id: apt.id, paymentStatus: val })
                    }
                  >
                    <SelectTrigger className={`w-28 h-8 text-xs ${paymentColors[apt.paymentStatus]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {renderPaymentStatus(apt)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {apt.createdAt ? format(new Date(apt.createdAt), "dd MMM, hh:mm a") : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600"
                      title="Send Confirmation WhatsApp"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${apt.phone.replace(/\D/g, "")}?text=Hi ${apt.name}, your appointment for ${apt.service} on ${apt.preferredDate ? format(new Date(apt.preferredDate), "dd MMM yyyy") : ""} is confirmed. See you at Apollo Information Centre Aranghata.`,
                          "_blank"
                        )
                      }
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-apollo-blue"
                      title="Generate & Send Bill via WhatsApp"
                      onClick={() => {
                        const price = apt.doctorFees ?? servicePrices[apt.service] ?? 500;
                        if (confirm(`Generate a bill for ₹${price} and send to patient?`)) {
                          createBill.mutate(
                            {
                              appointmentId: apt.id,
                              amount: price,
                              status: apt.paymentStatus === "paid" ? "paid" : "unpaid",
                            },
                            {
                              onSuccess: (data) => {
                                toast.success("Bill generated successfully!");
                                const statusText = apt.paymentStatus === "paid" ? "Paid" : "Pending Payment";
                                const payId = apt.paymentStatus === "paid" ? `pay_${Date.now()}` : `clinic_${Date.now()}`;
                                const formattedDate = apt.preferredDate ? format(new Date(apt.preferredDate), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
                                
                                const receiptUrl = `${getBaseUrl()}/api/receipts/pdf?paymentId=${payId}&amount=${price}&phone=${apt.phone}&patientName=${encodeURIComponent(apt.name)}&service=${encodeURIComponent(apt.service)}&date=${encodeURIComponent(formattedDate)}&status=${encodeURIComponent(statusText)}`;
                                
                                window.open(receiptUrl, "_blank");
                              },
                            }
                          );
                        }
                      }}
                    >
                      <Receipt className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500"
                      onClick={() => {
                        if (confirm("Delete this appointment?")) {
                          deleteAppointment.mutate({ id: apt.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
