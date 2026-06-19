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
import { Loader2, UserPlus, Search, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

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
  const [registerDate, setRegisterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchTerm, setSearchTerm] = useState("");

  const { data: existingPatients } = trpc.patients.findByPhone.useQuery(
    { phone: registerPhone },
    { enabled: registerPhone.length >= 10 && showRegister }
  );

  const bookWalkin = trpc.appointment.create.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
      utils.appointment.list.invalidate();
      setShowRegister(false);
      setRegisterName("");
      setRegisterAge("");
      setRegisterGender("");
      setRegisterPhone("");
      setRegisterConcern("");
      setRegisterDoctorId("");
      setRegisterDate(format(new Date(), "yyyy-MM-dd"));
    },
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
        <Button onClick={() => setShowRegister(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Book Walk-in / Register
        </Button>
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
                    <Badge variant="secondary" className={
                      patient.status === "completed" ? "bg-green-100 text-green-700 capitalize hover:bg-green-100" :
                      patient.status === "with_doctor" ? "bg-blue-100 text-blue-700 capitalize hover:bg-blue-100" :
                      "bg-yellow-100 text-yellow-700 capitalize hover:bg-yellow-100"
                    }>
                      {patient.status.replace("_", " ")}
                    </Badge>
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

      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Walk-in / Register Patient</DialogTitle>
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
              bookWalkin.mutate({
                name: registerName,
                phone: registerPhone,
                age: parseInt(registerAge),
                gender: registerGender,
                service: registerDoctorId
                  ? (doctors?.find(d => d.id === parseInt(registerDoctorId))?.serviceName || "OPD Consultation - General Physician")
                  : "OPD Consultation - General Physician",
                preferredDate: registerDate,
                message: registerConcern,
                doctorId: registerDoctorId ? parseInt(registerDoctorId) : undefined,
                paymentMethod: "clinic",
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
                <Select value={registerGender} onValueChange={setRegisterGender} required>
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
              <label className="text-sm font-medium mb-1 block">Phone (Contact No)</label>
              <Input
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                placeholder="10-digit phone number"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input
                type="date"
                value={registerDate}
                onChange={(e) => setRegisterDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Issue / Concern</label>
              <Input
                value={registerConcern}
                onChange={(e) => setRegisterConcern(e.target.value)}
                placeholder="Reason for appointment"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Select Doctor (optional)</label>
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
            <Button type="submit" className="w-full" disabled={bookWalkin.isPending}>
              {bookWalkin.isPending ? "Booking..." : "Book Walk-in / Register"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
