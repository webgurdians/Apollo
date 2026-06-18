import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  ArrowLeft,
  Loader2,
  UserPlus,
  LogOut,
  Receipt,
  Search,
  Download,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router";
import { format } from "date-fns";
import { useState } from "react";
import StatsCards from "@/components/dashboard/StatsCards";
import AppointmentsSection from "@/components/dashboard/AppointmentsSection";
import PrescriptionDialog from "@/components/dashboard/PrescriptionDialog";
import { type BillRow, loadRazorpayScript } from "@/lib/razorpay";
import { FeaturedDoctorPopupConfig } from "@/components/FeaturedDoctorPopupConfig";

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

export default function FrontDesk() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.appointment.stats.useQuery();

  // Patient queue
  const { data: patients } = trpc.patients.list.useQuery();
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
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);

  const { data: existingPatients } = trpc.patients.findByPhone.useQuery(
    { phone: registerPhone },
    { enabled: registerPhone.length >= 10 && showRegister }
  );

  // Billing
  const { data: bills } = trpc.billing.list.useQuery();
  const [billingSearch, setBillingSearch] = useState("");
  const [billingDateFilter, setBillingDateFilter] = useState<string>("all");
  const [billingStartDate, setBillingStartDate] = useState("");
  const [billingEndDate, setBillingEndDate] = useState("");
  const [billingOnlyUnpaid, setBillingOnlyUnpaid] = useState(false);

  const [duplicatePatient, setDuplicatePatient] = useState<{
    id: number; name: string; age: number; gender: string; phone: string; concern: string; createdAt: string;
  } | null>(null);

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
        // Not a JSON error, let it show normally
      }
    },
  });

  const assignDoctor = trpc.patients.assignDoctor.useMutation({
    onSuccess: () => utils.patients.list.invalidate(),
  });

  const updateStatus = trpc.billing.updateStatus.useMutation({
    onSuccess: () => utils.billing.list.invalidate(),
  });

  const handleViewPrescription = (patientId: number) => {
    setSelectedPatientId(patientId);
    setPrescriptionOpen(true);
  };

  const filteredPatients = patients?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm)
  );

  // Bill filtering
  const filteredBills = (bills as BillRow[] | undefined)?.filter((bill) => {
    if (billingOnlyUnpaid && bill.status === "paid") return false;
    if (billingSearch && !bill.patientName?.toLowerCase().includes(billingSearch.toLowerCase()) && !bill.patientPhone?.includes(billingSearch)) return false;
    if (billingDateFilter === "last_7_days") {
      const d = new Date(bill.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (d < weekAgo) return false;
    } else if (billingDateFilter === "this_month") {
      const now = new Date();
      const d = new Date(bill.createdAt);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    } else if (billingDateFilter === "last_month") {
      const now = new Date();
      const d = new Date(bill.createdAt);
      const lastMonth = now.getMonth() - 1;
      const year = lastMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = lastMonth < 0 ? 11 : lastMonth;
      if (d.getMonth() !== month || d.getFullYear() !== year) return false;
    } else if (billingDateFilter === "custom") {
      if (billingStartDate && new Date(bill.createdAt) < new Date(billingStartDate)) return false;
      if (billingEndDate) {
        const end = new Date(billingEndDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(bill.createdAt) > end) return false;
      }
    }
    return true;
  });

  const handlePayment = async (bill: BillRow) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) { alert("Failed to load Razorpay SDK."); return; }
    const rzp = new (window as unknown as { Razorpay: new (opts: {
      key: string; amount: number; currency: string; name: string; description: string;
      handler: (r: { razorpay_payment_id: string }) => void;
      prefill: { name: string; contact: string }; theme: { color: string };
    }) => { open: () => void } }).Razorpay({
      key: RAZORPAY_KEY, amount: bill.total * 100, currency: "INR",
      name: "Apollo Clinic", description: `Bill #${bill.id}`,
      handler: () => updateStatus.mutate({ id: bill.id, status: "paid", paymentMethod: "online" }),
      prefill: { name: bill.patientName, contact: bill.patientPhone },
      theme: { color: "#2563eb" },
    });
    rzp.open();
  };

  const exportToCSV = () => {
    const rows = filteredBills || [];
    const csv = [
      ["Bill ID","Patient","Phone","Amount","Tax","Discount","Total","Status","Payment Method","Date"],
      ...rows.map((b) => [b.id, b.patientName, b.patientPhone, b.amount, b.tax, b.discount, b.total, b.status, b.paymentMethod || "—", b.createdAt ? format(new Date(b.createdAt), "dd/MM/yyyy") : "—"]),
    ].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bills-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const isLoading = authLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-apollo-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
            <div className="h-6 w-px bg-gray-200" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-apollo-blue to-apollo-orange bg-clip-text text-transparent">
              Apollo Clinic
            </h1>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Front Desk
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.username}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Front Desk Dashboard</h2>
          <p className="text-muted-foreground mt-1">Manage patient intake, appointments, and billing.</p>
        </div>

        <StatsCards stats={stats} loading={statsLoading} />

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="patients">Patient Queue</TabsTrigger>
            {import.meta.env.VITE_ENABLE_BILLING === "true" && (
              <TabsTrigger value="billing">Billing</TabsTrigger>
            )}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <AppointmentsSection />
          </TabsContent>

          <TabsContent value="patients">
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
                      <TableHead>Patient</TableHead>
                      <TableHead>Concern</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rx</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No patients found</TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients?.map((patient) => {
                        const rx = patient.prescription;
                        return (
                          <TableRow key={patient.id}>
                            <TableCell className="font-semibold">#{patient.id}</TableCell>
                            <TableCell>
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-xs text-muted-foreground">{patient.age}y / {patient.gender} • {patient.phone}</div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{patient.concern}</TableCell>
                            <TableCell>
                              <Select
                                value={patient.assignedDoctorId?.toString() || "none"}
                                onValueChange={(val) => assignDoctor.mutate({ id: patient.id, doctorId: val !== "none" ? parseInt(val) : null })}
                              >
                                <SelectTrigger className="w-36 h-8 text-xs">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Unassigned</SelectItem>
                                  {doctors?.map((doc) => (
                                    <SelectItem key={doc.id} value={doc.id.toString()}>{doc.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={
                                patient.status === "waiting" ? "bg-yellow-100 text-yellow-700 capitalize" :
                                patient.status === "with_doctor" ? "bg-blue-100 text-blue-700 capitalize" :
                                "bg-green-100 text-green-700 capitalize"
                              }>
                                {patient.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {rx ? (
                                <Badge className="bg-green-100 text-green-700 cursor-pointer" onClick={() => handleViewPrescription(patient.id)}>
                                  View Rx
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {patient.createdAt ? format(new Date(patient.createdAt), "hh:mm a") : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {rx && (
                                <Button variant="outline" size="sm" className="h-8 border-apollo-blue text-apollo-blue" onClick={() => handleViewPrescription(patient.id)}>
                                  View Rx
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <PrescriptionDialog
                patientId={selectedPatientId}
                open={prescriptionOpen}
                onOpenChange={setPrescriptionOpen}
              />

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
                        <p className="text-sm text-muted-foreground">Concern: {duplicatePatient.concern}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        A patient with this phone number already exists. Do not create duplicates.
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setDuplicatePatient(null)}>
                          Go back
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            handleViewPrescription(duplicatePatient.id);
                            setDuplicatePatient(null);
                            setShowRegister(false);
                          }}
                        >
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
                          onClick={() => handleViewPrescription(existingPatients[0].id)}
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
                      <Input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Patient name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Age</label>
                        <Input type="number" value={registerAge} onChange={(e) => setRegisterAge(e.target.value)} placeholder="Age" required />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Gender</label>
                        <Select value={registerGender} onValueChange={setRegisterGender}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                      <Input value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} placeholder="Phone number" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Concern</label>
                      <Input value={registerConcern} onChange={(e) => setRegisterConcern(e.target.value)} placeholder="Chief complaint" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Assign Doctor (optional)</label>
                      <Select value={registerDoctorId} onValueChange={setRegisterDoctorId}>
                        <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                        <SelectContent>
                          {doctors?.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id.toString()}>{doc.name} — {doc.specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Register Patient</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          {import.meta.env.VITE_ENABLE_BILLING === "true" && (
            <TabsContent value="billing">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient or phone..."
                      className="pl-9"
                      value={billingSearch}
                      onChange={(e) => setBillingSearch(e.target.value)}
                    />
                  </div>
                  <Select value={billingDateFilter} onValueChange={setBillingDateFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Date Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="custom">Custom Date</SelectItem>
                    </SelectContent>
                  </Select>
                  {billingDateFilter === "custom" && (
                    <div className="flex items-center gap-2">
                      <Input type="date" value={billingStartDate} onChange={(e) => setBillingStartDate(e.target.value)} className="w-40" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input type="date" value={billingEndDate} onChange={(e) => setBillingEndDate(e.target.value)} className="w-40" />
                    </div>
                  )}
                  <Button
                    variant={billingOnlyUnpaid ? "default" : "outline"}
                    onClick={() => setBillingOnlyUnpaid(!billingOnlyUnpaid)}
                    className={billingOnlyUnpaid ? "bg-red-500 hover:bg-red-600 text-white" : "border-red-200 text-red-700"}
                    size="sm"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {billingOnlyUnpaid ? "Showing Unpaid" : "Show Unpaid"}
                  </Button>
                  <Button variant="outline" onClick={exportToCSV} size="sm">
                    <Download className="w-4 h-4 mr-2" />
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
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center text-muted-foreground py-8">No bills found</TableCell>
                        </TableRow>
                      ) : (
                        filteredBills?.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium">#{bill.id}</TableCell>
                            <TableCell>{bill.patientName}</TableCell>
                            <TableCell>{bill.patientPhone}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{bill.service || "—"}</TableCell>
                            <TableCell>₹{bill.amount}</TableCell>
                            <TableCell>₹{bill.tax}</TableCell>
                            <TableCell>₹{bill.discount}</TableCell>
                            <TableCell className="font-semibold">₹{bill.total}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                bill.status === "paid" ? "bg-green-100 text-green-700" :
                                bill.status === "unpaid" ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>{bill.status}</span>
                            </TableCell>
                            <TableCell>{bill.paymentMethod || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {bill.createdAt ? format(new Date(bill.createdAt), "dd MMM") : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {bill.status === "unpaid" && (
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" title="Pay via Razorpay" onClick={() => handlePayment(bill)}>
                                    <CreditCard className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" title="Mark Cash Paid" onClick={() => updateStatus.mutate({ id: bill.id, status: "paid", paymentMethod: "cash" })}>
                                    <Receipt className="w-4 h-4" />
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
            </TabsContent>
          )}
          <TabsContent value="settings">
            <div className="max-w-xl">
              <FeaturedDoctorPopupConfig />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
