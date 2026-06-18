import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Pill, Beaker, Calendar, Stethoscope } from "lucide-react";
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

  const latestPrescription = useMemo(() => {
    if (!patient?.prescriptions?.length) return null;
    return patient.prescriptions[0];
  }, [patient]);

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
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Patient Details & Prescription</DialogTitle>
          <DialogDescription>
            View patient information and latest prescription
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

          {latestPrescription ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-apollo-blue" />
                <span className="font-medium">
                  Latest Prescription — {format(new Date(latestPrescription.createdAt), "dd MMM yyyy, hh:mm a")}
                </span>
              </div>

              {latestPrescription.doctor && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Stethoscope className="w-4 h-4" />
                  <span>
                    Prescribed by: <strong>{latestPrescription.doctor.name}</strong>
                    {latestPrescription.doctor.specialty && (
                      <> ({latestPrescription.doctor.specialty})</>
                    )}
                  </span>
                </div>
              )}

              {latestPrescription.diagnosisNotes && (
                <div>
                  <span className="text-sm font-medium">Diagnosis:</span>
                  <p className="text-sm mt-1">{latestPrescription.diagnosisNotes}</p>
                </div>
              )}

              {latestPrescription.medicines && latestPrescription.medicines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Medicines</span>
                  </div>
                  <div className="space-y-2">
                    {latestPrescription.medicines.map((med) => (
                      <div
                        key={med.id}
                        className="bg-green-50 rounded-lg p-3 border border-green-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-green-800">{med.medicineName}</span>
                          {med.dosage && (
                            <Badge variant="outline" className="bg-white">
                              {med.dosage}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-green-700">
                          {med.dosage && (
                            <span className="bg-white px-2 py-1 rounded">Dosage: {med.dosage}</span>
                          )}
                          {med.frequency && (
                            <span className="bg-white px-2 py-1 rounded">Frequency: {med.frequency}</span>
                          )}
                          {med.duration && (
                            <span className="bg-white px-2 py-1 rounded">Duration: {med.duration}</span>
                          )}
                          {med.instructions && (
                            <span className="bg-white px-2 py-1 rounded">Instructions: {med.instructions}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestPrescription.tests && latestPrescription.tests.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Beaker className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Tests</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {latestPrescription.tests.map((test) => (
                      <Badge key={test.id} variant="secondary" className="bg-purple-50 text-purple-700">
                        {test.testName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {latestPrescription.advice && (
                <div>
                  <span className="text-sm font-medium">Advice:</span>
                  <p className="text-sm mt-1">{latestPrescription.advice}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No prescriptions found for this patient.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
