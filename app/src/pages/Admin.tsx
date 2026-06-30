import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, FileText, Calendar, Users, CreditCard, Mail, Stethoscope, UserPlus, AlertTriangle, ShoppingBag, MessageSquare, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import StatsCards from "@/components/dashboard/StatsCards";
import AppointmentsSection from "@/components/dashboard/AppointmentsSection";
import PatientQueueSection from "@/components/dashboard/PatientQueueSection";
import BillingSection from "@/components/dashboard/BillingSection";
import PrescriptionDialog from "@/components/dashboard/PrescriptionDialog";
import { ContactsSection } from "@/components/dashboard/ContactsSection";
import { DoctorsSection } from "@/components/dashboard/DoctorsSection";
import { StaffSection } from "@/components/dashboard/StaffSection";
import { GlobalSearch } from "@/components/GlobalSearch";
import { FeaturedDoctorPopupConfig } from "@/components/FeaturedDoctorPopupConfig";
import { EndOfDayReport } from "@/components/EndOfDayReport";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import MedicineOrdersSection from "@/components/dashboard/MedicineOrdersSection";
import ReportDispatchSection from "@/components/dashboard/ReportDispatchSection";
import WhatsAppDashboard from "@/components/dashboard/WhatsAppDashboard";
import RevenueDashboard from "@/components/dashboard/RevenueDashboard";

interface Tab {
  value: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

export default function Admin() {
  const { user, logout } = useAuth();
  const { data: flags } = trpc.features.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.appointment.stats.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const [prescriptionPatientId, setPrescriptionPatientId] = useState<number | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);

  useSessionTimeout(logout);

  const handleViewPrescription = (patientId: number) => {
    setPrescriptionPatientId(patientId);
    setPrescriptionOpen(true);
  };

  const allTabs: Tab[] = [
    { value: "appointments", label: "Appointments", icon: <Calendar className="w-4 h-4" />, content: <AppointmentsSection /> },
    { value: "patients", label: "Patients / History", icon: <Users className="w-4 h-4" />, content: <PatientQueueSection onViewPrescription={handleViewPrescription} /> },
    { value: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" />, content: <BillingSection /> },
    { value: "revenue", label: "Revenue Ledger", icon: <TrendingUp className="w-4 h-4" />, content: <RevenueDashboard /> },
    { value: "whatsapp", label: "WhatsApp Automation", icon: <MessageSquare className="w-4 h-4" />, content: <WhatsAppDashboard /> },
    { value: "medicine_orders", label: "Medicine Orders", icon: <ShoppingBag className="w-4 h-4" />, content: <MedicineOrdersSection /> },
    { value: "contacts", label: "Enquiries", icon: <Mail className="w-4 h-4" />, content: <ContactsSection /> },
    { value: "staff", label: "Staff", icon: <Users className="w-4 h-4" />, content: <StaffSection /> },
    { value: "doctors", label: "Doctors", icon: <Stethoscope className="w-4 h-4" />, content: <DoctorsSection /> },
    { value: "report", label: "Report", icon: <FileText className="w-4 h-4" />, content: <EndOfDayReport /> },
    { value: "featured_doctor", label: "Doctor Popup", icon: <Shield className="w-4 h-4" />, content: <FeaturedDoctorPopupConfig /> },
    { value: "report_dispatch", label: "Patient Reports", icon: <FileText className="w-4 h-4" />, content: <ReportDispatchSection /> },
  ];

  const enabledTabs = allTabs
    .filter((t) => flags?.[t.value] !== false)
    .filter((t) => {
      if (t.value === "revenue" || t.value === "whatsapp") {
        return user?.role === "founder";
      }
      return true;
    });

  const firstEnabled = enabledTabs[0]?.value || "appointments";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-apollo-blue to-apollo-orange bg-clip-text text-transparent">
              Apollo Clinic
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            {flags?.global_search !== false && <GlobalSearch />}
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.username}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Manage appointments, patients, billing, and more.</p>
          </div>
          <DialogButton onViewPrescription={handleViewPrescription} />
        </div>

        <StatsCards stats={stats} loading={statsLoading} />

        {enabledTabs.length > 0 && (
          <Tabs defaultValue={firstEnabled} className="space-y-6">
            <div className="overflow-x-auto">
              <TabsList className="bg-white border shadow-sm inline-flex">
                {enabledTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
                    {tab.icon}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {enabledTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      <PrescriptionDialog
        patientId={prescriptionPatientId}
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
      />
    </div>
  );
}

function DialogButton({ onViewPrescription }: { onViewPrescription: (patientId: number) => void }) {
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerAge, setRegisterAge] = useState("");
  const [registerGender, setRegisterGender] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerAddress, setRegisterAddress] = useState("");
  const [registerPrescriptionFile, setRegisterPrescriptionFile] = useState("");
  const [registerPrescriptionFileName, setRegisterPrescriptionFileName] = useState("");
  const [registerConcern, setRegisterConcern] = useState("");
  const [registerDoctorId, setRegisterDoctorId] = useState("");
  const [registerDate, setRegisterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: doctors } = trpc.patients.listDoctors.useQuery();
  const utils = trpc.useUtils();

  const [paymentMethod, setPaymentMethod] = useState<"online" | "clinic" | "partial">("clinic");
  const [amountPaid, setAmountPaid] = useState(0);
  const [amountDue, setAmountDue] = useState(0);
  const [isDueManuallyEdited, setIsDueManuallyEdited] = useState(false);

  const totalFees = registerDoctorId
    ? (doctors?.find(d => d.id === parseInt(registerDoctorId))?.fees ?? 1200)
    : 500;

  useEffect(() => {
    if (!isDueManuallyEdited) {
      setAmountDue(Math.max(0, totalFees - amountPaid));
    }
  }, [amountPaid, totalFees, isDueManuallyEdited]);

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
      setRegisterAddress("");
      setRegisterPrescriptionFile("");
      setRegisterPrescriptionFileName("");
      setRegisterConcern("");
      setRegisterDoctorId("");
      setRegisterDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod("clinic");
      setAmountPaid(0);
      setAmountDue(0);
      setIsDueManuallyEdited(false);
    },
    onError: (err) => {
      alert("Error booking appointment: " + err.message);
    },
  });

  return (
    <Dialog open={showRegister} onOpenChange={setShowRegister}>
      <DialogTrigger asChild>
        <Button className="bg-apollo-blue hover:bg-apollo-blue/90 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Book Walk-in / Register
        </Button>
      </DialogTrigger>
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
              address: registerAddress || undefined,
              prescriptionFile: registerPrescriptionFile || undefined,
              prescriptionFileName: registerPrescriptionFileName || undefined,
              age: parseInt(registerAge),
              gender: registerGender,
              service: registerDoctorId
                ? (doctors?.find(d => d.id === parseInt(registerDoctorId))?.serviceName || "OPD Consultation - General Physician")
                : "OPD Consultation - General Physician",
              preferredDate: registerDate,
              message: registerConcern,
              doctorId: registerDoctorId ? parseInt(registerDoctorId) : undefined,
              paymentMethod: paymentMethod,
              amountPaid: paymentMethod === "partial" ? amountPaid : undefined,
              amountDue: paymentMethod === "partial" ? amountDue : undefined,
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
            <label className="text-sm font-medium mb-1 block">Address</label>
            <Input
              value={registerAddress}
              onChange={(e) => setRegisterAddress(e.target.value)}
              placeholder="Complete address (optional)"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Upload Prescription (optional)</label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setRegisterPrescriptionFileName(file.name);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setRegisterPrescriptionFile(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="bg-white"
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
          {registerDoctorId && (() => {
            const doc = doctors?.find(d => d.id === parseInt(registerDoctorId));
            if (doc && doc.availableDates) {
              const dates = doc.availableDates.split(",").map(d => d.trim());
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 space-y-1">
                  <span className="text-xs font-semibold text-blue-700 block">Doctor Available Dates:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dates.map((dStr) => (
                      <button
                        key={dStr}
                        type="button"
                        onClick={() => setRegisterDate(dStr)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          registerDate === dStr 
                            ? "bg-apollo-blue text-white border-apollo-blue font-semibold"
                            : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        {dStr}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}
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
            <label className="text-sm font-medium mb-1 block">Payment Status</label>
            <Select value={paymentMethod} onValueChange={(val: "online" | "clinic" | "partial") => setPaymentMethod(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Paid (Online / Cash upfront)</SelectItem>
                <SelectItem value="clinic">Pending (Pay at Clinic)</SelectItem>
                <SelectItem value="partial">Partial / Advance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "partial" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount Paid (₹)</label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  placeholder="Amount Paid"
                  min={0}
                  max={totalFees}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount Due (₹)</label>
                <Input
                  type="number"
                  value={amountDue}
                  onChange={(e) => {
                    setAmountDue(Number(e.target.value));
                    setIsDueManuallyEdited(true);
                  }}
                  placeholder="Amount Due"
                  min={0}
                  required
                />
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={bookWalkin.isPending}>
            {bookWalkin.isPending ? "Booking..." : "Book Walk-in / Register"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
