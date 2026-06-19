import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, History, Shield, FileText, MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import StatsCards from "@/components/dashboard/StatsCards";
import AppointmentsSection from "@/components/dashboard/AppointmentsSection";
import PatientQueueSection from "@/components/dashboard/PatientQueueSection";
import BillingSection from "@/components/dashboard/BillingSection";
import PrescriptionDialog from "@/components/dashboard/PrescriptionDialog";
import { ContactsSection } from "@/components/dashboard/ContactsSection";
import { DoctorsSection } from "@/components/dashboard/DoctorsSection";
import { StaffSection } from "@/components/dashboard/StaffSection";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ActivityLogView } from "@/components/ActivityLogView";
import { BackupRestore } from "@/components/BackupRestore";
import { FeaturedDoctorPopupConfig } from "@/components/FeaturedDoctorPopupConfig";
import { WhatsAppTemplates } from "@/components/WhatsAppTemplates";
import { EndOfDayReport } from "@/components/EndOfDayReport";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function Admin() {
  const { user, logout } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.appointment.stats.useQuery();
  const [prescriptionPatientId, setPrescriptionPatientId] = useState<number | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);

  useSessionTimeout(logout);

  const handleViewPrescription = (patientId: number) => {
    setPrescriptionPatientId(patientId);
    setPrescriptionOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      <header className="backdrop-blur-md bg-card/40 border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent tracking-wide text-glow">
              Apollo Clinic
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Control Portal
            </span>
            <svg className="w-24 h-6 text-primary/30 hidden md:block" viewBox="0 0 100 30" fill="none">
              <path d="M0 15 h30 l3 -8 l4 20 l3 -18 l2 6 h28" stroke="currentColor" strokeWidth="2" className="ecg-line" />
            </svg>
          </div>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <span className="text-sm text-slate-400 hidden md:inline border-l border-white/10 pl-4">
              {user?.username}
            </span>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              System Dashboard
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">Live clinical statistics and patient operations center.</p>
          </div>
        </div>

        <StatsCards stats={stats} loading={statsLoading} />

        <Tabs defaultValue="appointments" className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-card/60 border border-white/5 backdrop-blur-md text-slate-400 p-1 rounded-xl shadow-inner inline-flex gap-1">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="patients">Patient Queue</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="contacts">Enquiries</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="doctors">Doctors</TabsTrigger>
              <TabsTrigger value="report">
                <FileText className="w-4 h-4 mr-1.5" />
                Report
              </TabsTrigger>
              <TabsTrigger value="activity">
                <History className="w-4 h-4 mr-1.5" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Shield className="w-4 h-4 mr-1.5" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <MessageSquare className="w-4 h-4 mr-1.5" />
                WhatsApp
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="appointments">
            <AppointmentsSection />
          </TabsContent>

          <TabsContent value="patients">
            <PatientQueueSection onViewPrescription={handleViewPrescription} />
          </TabsContent>

          <TabsContent value="billing">
            <BillingSection />
          </TabsContent>

          <TabsContent value="contacts">
            <ContactsSection />
          </TabsContent>

          <TabsContent value="staff">
            <StaffSection />
          </TabsContent>

          <TabsContent value="doctors">
            <DoctorsSection />
          </TabsContent>

          <TabsContent value="report">
            <EndOfDayReport />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityLogView />
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <BackupRestore />
              <FeaturedDoctorPopupConfig />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppTemplates />
          </TabsContent>
        </Tabs>
      </main>

      <PrescriptionDialog
        patientId={prescriptionPatientId}
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
      />
    </div>
  );
}
