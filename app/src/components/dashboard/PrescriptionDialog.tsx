import { trpc } from "@/providers/trpc";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, FileText, Receipt, Activity } from "lucide-react";
import { format } from "date-fns";

interface PrescriptionDialogProps {
  patientId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PrescriptionDialog({
  patientId,
  open,
  onOpenChange,
}: PrescriptionDialogProps) {
  const { data: patient } = trpc.patients.getHistory.useQuery(
    { id: patientId! },
    { enabled: !!patientId && open }
  );


  if (!patient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Patient Details & Medical History</DialogTitle>
          <DialogDescription>
            View patient information and past visit details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Name</span>
                <p className="font-medium">{patient.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Phone</span>
                <p className="font-medium">{patient.phone}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Age / Gender</span>
                <p className="font-medium">
                  {patient.age}y / {patient.gender}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Concern</span>
                <p className="font-medium">{patient.concern}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="secondary"
                  className={`${
                    patient.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : patient.status === "with_doctor"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {patient.status}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Visit Count</span>
                <p className="font-medium">{patient.prescriptions?.length || 0} visits</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="prescriptions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prescriptions" className="flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" />
                Rx ({patient.prescriptions?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" />
                Visits ({(patient as any).appointments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1.5 text-xs">
                <Receipt className="w-3.5 h-3.5" />
                Bills ({(patient as any).bills?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prescriptions" className="space-y-4 mt-4">
              {patient.prescriptions && patient.prescriptions.length > 0 ? (
                patient.prescriptions.map((rx) => (
                  <div key={rx.id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Calendar className="w-4 h-4 text-apollo-blue" />
                        <span>{format(new Date(rx.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                      </div>
                      {rx.doctor && (
                        <Badge variant="outline" className="text-xs">
                          {rx.doctor.name}
                        </Badge>
                      )}
                    </div>
                    {rx.diagnosisNotes && (
                      <div>
                        <span className="text-xs text-muted-foreground block font-medium">Diagnosis:</span>
                        <p className="text-sm mt-0.5">{rx.diagnosisNotes}</p>
                      </div>
                    )}
                    {rx.medicines && rx.medicines.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs text-muted-foreground block font-medium">Medicines:</span>
                        <div className="space-y-1">
                          {rx.medicines.map((med) => (
                            <div key={med.id} className="text-xs bg-green-50/50 p-2 rounded border border-green-100 flex items-center justify-between">
                              <span className="font-medium text-green-800">{med.medicineName}</span>
                              <span className="text-muted-foreground">{med.dosage} ({med.frequency})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {rx.tests && rx.tests.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground block font-medium">Recommended Tests:</span>
                        <div className="flex flex-wrap gap-1">
                          {rx.tests.map((t) => (
                            <Badge key={t.id} variant="secondary" className="bg-purple-50 text-purple-700 text-[10px]">
                              {t.testName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No prescriptions recorded yet.
                </div>
              )}
            </TabsContent>

            <TabsContent value="appointments" className="space-y-3 mt-4">
              {(patient as any).appointments && (patient as any).appointments.length > 0 ? (
                (patient as any).appointments.map((apt: any) => (
                  <div key={apt.id} className="border rounded-lg p-3 bg-white shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{apt.service}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(apt.preferredDate), "dd MMM yyyy")}
                        {apt.doctorName && ` • Dr. ${apt.doctorName}`}
                      </p>
                      {apt.message && (
                        <p className="text-xs italic text-muted-foreground mt-1">
                          "{apt.message}"
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col gap-1 items-end">
                      <Badge className={
                        apt.status === "completed" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                        apt.status === "confirmed" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" :
                        "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                      }>
                        {apt.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {apt.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No appointment visits recorded yet.
                </div>
              )}
            </TabsContent>

            <TabsContent value="billing" className="space-y-3 mt-4">
              {(patient as any).bills && (patient as any).bills.length > 0 ? (
                (patient as any).bills.map((bill: any) => (
                  <div key={bill.id} className="border rounded-lg p-3 bg-white shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Bill #{bill.id}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(bill.createdAt), "dd MMM yyyy")} • Method: {bill.paymentMethod || "None"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900">₹{bill.total}</p>
                      <Badge className={`text-[10px] mt-1 ${
                        bill.status === "paid" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"
                      }`}>
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No billing history found.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
