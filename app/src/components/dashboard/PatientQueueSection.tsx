import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";

interface PatientQueueSectionProps {
  onViewPrescription?: (patientId: number) => void;
}

export default function PatientQueueSection({ onViewPrescription }: PatientQueueSectionProps) {
  const { data: patients, isLoading } = trpc.patients.list.useQuery();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");

  const updatePatientStatus = trpc.patients.updateStatus.useMutation({
    onSuccess: () => utils.patients.list.invalidate(),
  });

  const filteredPatients = patients?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name or mobile number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>ID</TableHead>
              <TableHead>Patient Details</TableHead>
              <TableHead>Latest Concern</TableHead>
              <TableHead>Assigned Doctor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients?.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-semibold">#{patient.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {patient.age}y / {patient.gender} • {patient.phone}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{patient.concern}</TableCell>
                  <TableCell>
                    {patient.doctorName ? (
                      <div className="text-sm font-medium">{patient.doctorName}</div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={patient.status}
                      onValueChange={(val: "waiting" | "with_doctor" | "completed" | "inactive") =>
                        updatePatientStatus.mutate({ id: patient.id, status: val })
                      }
                    >
                      <SelectTrigger className={`w-32 h-8 text-xs font-semibold ${
                        patient.status === "completed" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                        patient.status === "with_doctor" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" :
                        patient.status === "waiting" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" :
                        "bg-gray-100 text-gray-500 hover:bg-gray-100"
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="waiting">Waiting</SelectItem>
                        <SelectItem value="with_doctor">With Doctor</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {patient.createdAt
                      ? format(new Date(patient.createdAt), "dd MMM yyyy, hh:mm a")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-apollo-blue text-apollo-blue hover:bg-apollo-blue/5"
                      onClick={() => onViewPrescription?.(patient.id)}
                    >
                      View History & Timeline
                    </Button>
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
