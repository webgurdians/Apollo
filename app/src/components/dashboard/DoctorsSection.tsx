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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, User, Stethoscope, GraduationCap, FileText, Edit, Trash2, IndianRupee, MapPin } from "lucide-react";

export function DoctorsSection() {
  const { data: doctors, isLoading } = trpc.patients.listDoctors.useQuery();
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  
  // Custom fields
  const [branch, setBranch] = useState("");
  const [image, setImage] = useState("");
  const [fees, setFees] = useState(1200);
  const [availability, setAvailability] = useState("");
  const [status, setStatus] = useState<"Available" | "Limited" | "Not Available">("Available");

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setName("");
    setCredentials("");
    setSpecialty("");
    setRegistrationNumber("");
    setBranch("");
    setImage("");
    setFees(1200);
    setAvailability("");
    setStatus("Available");
    setSelectedDoctor(null);
  };

  const createDoctor = trpc.patients.createDoctor.useMutation({
    onSuccess: () => {
      utils.patients.listDoctors.invalidate();
      setShowDialog(false);
      resetForm();
      alert("Doctor profile created successfully!");
    },
    onError: (err) => alert(err.message),
  });

  const updateDoctor = trpc.patients.updateDoctor.useMutation({
    onSuccess: () => {
      utils.patients.listDoctors.invalidate();
      setShowDialog(false);
      resetForm();
      alert("Doctor profile updated successfully!");
    },
    onError: (err) => alert(err.message),
  });

  const deleteDoctor = trpc.patients.deleteDoctor.useMutation({
    onSuccess: () => {
      utils.patients.listDoctors.invalidate();
      alert("Doctor profile soft-deleted.");
    },
    onError: (err) => alert(err.message),
  });

  const handleEditClick = (doc: any) => {
    setSelectedDoctor(doc);
    setName(doc.name);
    setCredentials(doc.credentials);
    setSpecialty(doc.specialty);
    setRegistrationNumber(doc.registrationNumber);
    setBranch(doc.branch || "");
    setImage(doc.image || "");
    setFees(doc.fees ?? 1200);
    setAvailability(doc.availability || "");
    setStatus(doc.status || "Available");
    setShowDialog(true);
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {doctors?.length || 0} doctors registered
        </p>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setSelectedDoctor(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Doctor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedDoctor ? "Edit Doctor Profile" : "Add New Doctor"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const serviceName = `${name} - ${specialty}`;

                if (selectedDoctor) {
                  updateDoctor.mutate({
                    id: selectedDoctor.id,
                    name,
                    credentials,
                    specialty,
                    registrationNumber,
                    serviceName,
                    branch,
                    image,
                    fees,
                    availability,
                    status,
                  });
                } else {
                  if (!username || !password) {
                    alert("Username and password are required for new doctor accounts.");
                    return;
                  }
                  createDoctor.mutate({
                    username,
                    password,
                    name,
                    credentials,
                    specialty,
                    registrationNumber,
                    serviceName,
                    branch,
                    image,
                    fees,
                    availability,
                    status,
                  });
                }
              }}
              className="space-y-4"
            >
              {!selectedDoctor && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Username *</label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Password *</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Full Name *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Specialty *</label>
                  <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Credentials *</label>
                  <Input value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder="e.g. MBBS, MD" required />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Reg. Number *</label>
                  <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="e.g. REG-12345" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Consultation Fee (₹)</label>
                  <Input type="number" value={fees} onChange={(e) => setFees(Number(e.target.value))} required min={0} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Weekly Availability *</label>
                  <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Mon & Sat (11am-3pm)" required />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Apollo Branch / Affiliation *</label>
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Apollo Hospitals Greams Road" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Image Path *</label>
                  <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="e.g. /images/jatin.jpg" required />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Status *</label>
                  <Select
                    value={status}
                    onValueChange={(val: any) => setStatus(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Limited">Limited Availability</SelectItem>
                      <SelectItem value="Not Available">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full bg-apollo-blue text-white" disabled={createDoctor.isPending || updateDoctor.isPending}>
                {createDoctor.isPending || updateDoctor.isPending ? "Saving..." : selectedDoctor ? "Save Changes" : "Add Doctor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Doctor Info</TableHead>
              <TableHead>Specialty & Reg</TableHead>
              <TableHead>Branch & Fee</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No doctors registered
                </TableCell>
              </TableRow>
            ) : (
              doctors?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border bg-gray-50 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={doc.image || "/images/jatin.jpg"}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=100";
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Dr. {doc.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {doc.credentials}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                      {doc.specialty}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {doc.registrationNumber}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1 text-gray-700">
                      <MapPin className="w-3.5 h-3.5 text-apollo-blue" />
                      {doc.branch || "—"}
                    </div>
                    <div className="font-bold text-green-700 mt-0.5 flex items-center gap-0.5">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {doc.fees ?? 1200}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-700">
                    {doc.availability || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        doc.status === "Available"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : doc.status === "Limited"
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                          : "bg-red-100 text-red-700 hover:bg-red-100"
                      }
                    >
                      {doc.status || "Available"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleEditClick(doc)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete Dr. ${doc.name}?`)) {
                            deleteDoctor.mutate({ id: doc.id });
                          }
                        }}
                        disabled={deleteDoctor.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
