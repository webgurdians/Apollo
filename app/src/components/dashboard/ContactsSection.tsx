import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Phone, CreditCard, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";

export function ContactsSection() {
  const { data: contacts, isLoading: contactsLoading } = trpc.contact.list.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const { data: appointments, isLoading: appointmentsLoading } = trpc.appointment.list.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const utils = trpc.useUtils();

  const deleteContact = trpc.contact.delete.useMutation({
    onSuccess: () => utils.contact.list.invalidate(),
  });

  const markAsPaid = trpc.appointment.updatePaymentStatus.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
      utils.billing.list.invalidate();
    },
  });

  const deleteAppointment = trpc.appointment.delete.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
    },
  });

  const isLoading = contactsLoading || appointmentsLoading;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
      </div>
    );
  }

  // Pending clinic/unpaid appointments go to Enquiry Tab
  const pendingAppointments = appointments?.filter(
    (apt) => apt.status === "pending" && apt.paymentStatus === "pending"
  ) || [];

  return (
    <div className="space-y-6">
      {/* Clinic Appointment Enquiries */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-apollo-blue" />
          Pending Clinic Appointments ({pendingAppointments.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingAppointments.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border shadow-sm p-6 text-center text-muted-foreground text-sm">
              No pending clinic appointment enquiries.
            </div>
          ) : (
            pendingAppointments.map((apt) => (
              <div key={apt.id} className="bg-white rounded-xl border border-yellow-200 shadow-sm p-4 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] font-semibold px-2 py-0.5 rounded-bl">
                  Pay at Clinic
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{apt.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Requested Date: {apt.preferredDate ? format(new Date(apt.preferredDate), "dd MMM yyyy") : "—"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("Delete this appointment enquiry?")) {
                        deleteAppointment.mutate({ id: apt.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`tel:${apt.phone}`} className="text-apollo-blue hover:underline font-medium">
                      {apt.phone}
                    </a>
                  </div>
                  <div className="text-xs bg-slate-50 border rounded-lg p-2">
                    <div className="font-medium text-slate-500 text-[10px] uppercase">Requested Service</div>
                    <div className="font-medium text-slate-800 mt-0.5">{apt.service}</div>
                  </div>
                </div>
                {apt.message && (
                  <p className="text-xs bg-slate-50 rounded-lg p-2.5 border text-gray-600 italic">
                    "{apt.message}"
                  </p>
                )}
                <div className="pt-2 border-t flex justify-end">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 flex items-center gap-1.5"
                    onClick={() => {
                      if (confirm(`Mark appointment #${apt.id} as paid and confirm?`)) {
                        markAsPaid.mutate({ id: apt.id, paymentStatus: "paid" });
                      }
                    }}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Mark as Paid & Confirm
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Website Form General Enquiries */}
      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Mail className="w-5 h-5 text-apollo-blue" />
          Website Contact Form Messages ({contacts?.length || 0})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts?.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border shadow-sm p-6 text-center text-muted-foreground text-sm">
              No general website contact messages.
            </div>
          ) : (
            contacts?.map((contact: any) => (
              <div key={contact.id} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{contact.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Received: {new Date(contact.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("Delete this general enquiry?")) {
                        deleteContact.mutate({ id: contact.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="text-apollo-blue hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                </div>
                {contact.message && (
                  <p className="text-sm bg-gray-50 rounded-lg p-3 border text-gray-700">
                    {contact.message}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
