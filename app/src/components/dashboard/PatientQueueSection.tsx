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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserPlus, Search, Eye, AlertTriangle } from "lucide-react";

const statusColors: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-700",
  with_doctor: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

interface PatientQueueSectionProps {
  onViewPrescription?: (patientId: number) => void;
}

export default function PatientQueueSection({ onViewPrescription }: PatientQueueSectionProps) {
  const { data: patients, isLoading } = trpc.patients.list.useQuery();
  const { data: doctors } = trpc.patients.listDoctors.useQuery();
  const utils = trpc.useUtils();

  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerAge, setRegisterAge] = useState("");
  const [registerGender, setRegisterGender] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerConcern, setRegisterConcern] = useState("");
  const [registerDoctorId, setRegisterDoctorId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicatePatient, setDuplicatePatient] = useState<{
    id: number; name: string; age: number; gender: string; phone: string; concern: string; createdAt: string;
  } | null>(null);

  const { data: existingPatients } = trpc.patients.findByPhone.useQuery(
    { phone: registerPhone },
    { enabled: registerPhone.length >= 10 && showRegister }
  );

  const createPatient = trpc.patients.create.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
      setShowRegister(false);
      setRegisterName("");
      setRegisterAge("");
      setRegisterGender("");
      setRegisterPhone("");
      setRegisterConcern("");
      setRegisterDoctorId("");
    },
    onError: (error) => {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.type === "DUPLICATE_PATIENT") {
          setDuplicatePatient(parsed.existingPatient);
        }
      } catch {
        // Not a JSON error, show normally
      }
    },
  });

  const updatePatientStatus = trpc.patients.updateStatus.useMutation({
    onSuccess: () => utils.patients.list.invalidate(),
  });

  const assignDoctor = trpc.patients.assignDoctor.useMutation({
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
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age/Gender</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Concern</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients?.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">#{patient.id}</TableCell>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>{patient.age}y / {patient.gender}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{patient.concern}</TableCell>
                  <TableCell>
                    <Select
                      value={patient.status}
                      onValueChange={(val: "waiting" | "with_doctor" | "completed") =>
                        updatePatientStatus.mutate({ id: patient.id, status: val })
                      }
                    >
                      <SelectTrigger className={`w-32 h-8 text-xs ${statusColors[patient.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="waiting">Waiting</SelectItem>
                        <SelectItem value="with_doctor">With Doctor</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={patient.assignedDoctorId?.toString() || ""}
                      onValueChange={(val) =>
                        val && assignDoctor.mutate({
                          patientId: patient.id,
                          assignedDoctorId: parseInt(val),
                        })
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Assign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {doctors?.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id.toString()}>
                            {doc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {patient.createdAt
                      ? new Date(patient.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onViewPrescription?.(patient.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!duplicatePatient} onOpenChange={(o) => { if (!o) setDuplicatePatient(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Existing patient found
            </DialogTitle>
          </DialogHeader>
          {duplicatePatient && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-medium text-lg">{duplicatePatient.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Phone: {duplicatePatient.phone} · Age: {duplicatePatient.age} · {duplicatePatient.gender}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                A patient with this phone number already exists. Do not create duplicates.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDuplicatePatient(null)}>
                  Go back
                </Button>
                <Button className="flex-1" onClick={() => { onViewPrescription?.(duplicatePatient.id); setDuplicatePatient(null); setShowRegister(false); }}>
                  View profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
          </DialogHeader>
          {existingPatients && existingPatients.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Returning Patient</p>
                <p className="mt-1">
                  {existingPatients[0].name} has {existingPatients.length} previous visit{existingPatients.length > 1 ? "s" : ""}.
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-amber-700 font-medium text-sm"
                  onClick={() => onViewPrescription?.(existingPatients[0].id)}
                >
                  View history
                </Button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createPatient.mutate({
                name: registerName,
                age: parseInt(registerAge),
                gender: registerGender,
                phone: registerPhone,
                concern: registerConcern,
                assignedDoctorId: registerDoctorId ? parseInt(registerDoctorId) : undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium mb-1 block">Full Name</label>
              <Input
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Patient name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Age</label>
                <Input
                  type="number"
                  value={registerAge}
                  onChange={(e) => setRegisterAge(e.target.value)}
                  placeholder="Age"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Gender</label>
                <Select value={registerGender} onValueChange={setRegisterGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                placeholder="Phone number"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Concern</label>
              <Input
                value={registerConcern}
                onChange={(e) => setRegisterConcern(e.target.value)}
                placeholder="Chief complaint"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Assign Doctor (optional)</label>
              <Select value={registerDoctorId} onValueChange={setRegisterDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      {doc.name} — {doc.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Register Patient
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
