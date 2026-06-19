import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, History, Shield, FileText, MessageSquare } from "lucide-react";
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
            <GlobalSearch />
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Manage appointments, patients, billing, and more.</p>
        </div>

        <StatsCards stats={stats} loading={statsLoading} />

        <Tabs defaultValue="appointments" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="bg-white border shadow-sm inline-flex">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="patients">Patients / History</TabsTrigger>
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
