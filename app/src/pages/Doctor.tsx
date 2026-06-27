import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Loader2,
  Users,
  Stethoscope,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  AlertCircle,
  ArrowLeft,
  LogOut,
  Eye,
  Download,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

interface MedicineRow {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface TestRow {
  testName: string;
  notes: string;
}

export default function Doctor() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const utils = trpc.useUtils();
  const navigate = useNavigate();

  // Logout mutation
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => navigate("/login"),
  });

  // Fetch doctors list to find the active doctor profile
  const { data: doctors } = trpc.patients.listDoctors.useQuery(undefined, {
    enabled: !!user,
  });
  const currentDoctor = doctors?.find((d) => d.userId === user?.id);

  // Reports for this doctor
  const { data: doctorReports, isLoading: reportsLoading } = trpc.reports.listForDoctor.useQuery(undefined, {
    enabled: !!currentDoctor,
    refetchInterval: 10000,
  });
  const markViewed = trpc.reports.markViewed.useMutation({
    onSuccess: () => utils.reports.listForDoctor.invalidate(),
  });

  const unviewedCount = doctorReports?.filter((r) => r.status === "sent").length || 0;

  // Poll for waiting patients assigned to this doctor
  const { data: waitingPatients } = trpc.patients.list.useQuery(
    { status: "waiting", assignedDoctorId: currentDoctor?.id },
    {
      enabled: !!currentDoctor,
      refetchInterval: 5000, // Poll every 5 seconds
    }
  );

  // Fetch all patients assigned to this doctor (history/queue)
  const { data: myPatients, isLoading: patientsLoading } = trpc.patients.list.useQuery(
    { assignedDoctorId: currentDoctor?.id },
    { enabled: !!currentDoctor }
  );

  const updatePatientStatus = trpc.patients.updateStatus.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
    },
  });

  const createPrescription = trpc.prescriptions.create.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
      setActivePatientId(null);
      setDiagnosisNotes("");
      setMedicines([]);
      setTests([]);
      alert("Prescription generated & WhatsApp summary sent!");
    },
    onError: (err) => {
      alert("Error generating prescription: " + err.message);
    },
  });

  // State for active consultation
  const [activePatientId, setActivePatientId] = useState<number | null>(null);
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);

  // Find active patient details
  const activePatient = myPatients?.find((p) => p.id === activePatientId);

  // Add/Remove handlers for medicines
  const addMedicineRow = () => {
    setMedicines([
      ...medicines,
      { medicineName: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const removeMedicineRow = (index: number) => {
    setMedicines(medicines.filter((_, idx) => idx !== index));
  };

  const updateMedicineField = (index: number, field: keyof MedicineRow, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // Add/Remove handlers for tests
  const addTestRow = () => {
    setTests([...tests, { testName: "", notes: "" }]);
  };

  const removeTestRow = (index: number) => {
    setTests(tests.filter((_, idx) => idx !== index));
  };

  const updateTestField = (index: number, field: keyof TestRow, value: string) => {
    const updated = [...tests];
    updated[index][field] = value;
    setTests(updated);
  };

  const handleAcceptPatient = (patientId: number) => {
    updatePatientStatus.mutate({ id: patientId, status: "with_doctor" });
    setActivePatientId(patientId);
  };

  const handleSubmitPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatientId) return;

    createPrescription.mutate({
      patientId: activePatientId,
      diagnosisNotes,
      medicines: medicines.filter((m) => m.medicineName.trim() !== ""),
      tests: tests.filter((t) => t.testName.trim() !== ""),
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-apollo-blue" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "doctor" && user?.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You need doctor privileges to access this page.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Home
                </Link>
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-apollo-blue" />
                Doctor Portal
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-semibold text-sm text-gray-900">
                  {currentDoctor ? `Dr. ${currentDoctor.name}` : user?.name || user?.email}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {currentDoctor?.specialty || user?.role}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <Tabs defaultValue="consultation">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="consultation" className="flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4" />
              Consultation
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 relative">
              <FileText className="w-4 h-4" />
              Reports
              {unviewedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unviewedCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consultation">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left column: Patients Queue */}
              <div className="lg:col-span-1 space-y-6">
                {waitingPatients && waitingPatients.length > 0 && !activePatientId && (
                  <Card className="border-yellow-200 bg-yellow-50/50 shadow-md animate-pulse">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        Patient Waiting
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-yellow-900">
                        <strong>{waitingPatients[0].name}</strong> is waiting for consultation.
                      </p>
                      <Button
                        onClick={() => handleAcceptPatient(waitingPatients[0].id)}
                        className="w-full bg-yellow-600 text-white hover:bg-yellow-700"
                        size="sm"
                      >
                        Accept & Consult
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card className="border shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-apollo-blue" />
                      Consultation Queue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {patientsLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
                      </div>
                    ) : myPatients && myPatients.length > 0 ? (
                      <div className="divide-y max-h-[60vh] overflow-y-auto">
                        {myPatients.map((p) => {
                          const statusColors: Record<string, string> = {
                            waiting: "bg-yellow-100 text-yellow-800",
                            with_doctor: "bg-blue-100 text-blue-800",
                            completed: "bg-green-100 text-green-800",
                          };

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                if (p.status === "with_doctor") {
                                  setActivePatientId(p.id);
                                }
                              }}
                              className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                                activePatientId === p.id ? "bg-apollo-blue/5 border-l-4 border-apollo-blue" : "hover:bg-gray-50"
                              }`}
                            >
                              <div className="min-w-0 pr-4">
                                <h4 className="font-semibold text-sm text-gray-900 truncate">{p.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">{p.concern}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <Badge variant="secondary" className={`${statusColors[p.status]} border-none text-[10px] uppercase`}>
                                  {p.status.replace("_", " ")}
                                </Badge>
                                {p.status === "waiting" && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptPatient(p.id);
                                    }}
                                    size="sm"
                                    className="text-[10px] h-6 bg-apollo-blue text-white hover:bg-apollo-dark"
                                  >
                                    Call In
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No patients assigned to you today.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column: Active Consultation */}
              <div className="lg:col-span-2">
                {activePatientId && activePatient ? (
                  <Card className="border shadow-md bg-white">
                    <CardHeader className="border-b">
                      <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-apollo-blue" />
                        Active Consultation: {activePatient.name}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2 mt-1">
                        <div><strong>Age/Gender:</strong> {activePatient.age}y / {activePatient.gender}</div>
                        <div><strong>Phone:</strong> {activePatient.phone}</div>
                        <div><strong>Complaint:</strong> {activePatient.concern}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSubmitPrescription} className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-900">Diagnosis & Clinical Notes</Label>
                          <textarea
                            value={diagnosisNotes}
                            onChange={(e) => setDiagnosisNotes(e.target.value)}
                            placeholder="Write patient diagnosis details, medical history, or clinical observations here..."
                            className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            required
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <Label className="text-sm font-semibold text-gray-900">Rx (Medicines)</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addMedicineRow}
                              className="text-apollo-blue border-apollo-blue/30 hover:bg-apollo-blue/5 h-8 text-xs"
                            >
                              <Plus className="w-4 h-4 mr-1.5" />
                              Add Medicine
                            </Button>
                          </div>
                          {medicines.length > 0 ? (
                            <div className="space-y-3">
                              {medicines.map((med, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                                  <div className="md:col-span-3 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Medicine Name</Label>
                                    <Input value={med.medicineName} onChange={(e) => updateMedicineField(idx, "medicineName", e.target.value)} placeholder="E.g. Paracetamol" required />
                                  </div>
                                  <div className="md:col-span-2 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Dosage</Label>
                                    <Input value={med.dosage} onChange={(e) => updateMedicineField(idx, "dosage", e.target.value)} placeholder="E.g. 650mg" required />
                                  </div>
                                  <div className="md:col-span-3 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Frequency</Label>
                                    <Input value={med.frequency} onChange={(e) => updateMedicineField(idx, "frequency", e.target.value)} placeholder="E.g. Twice daily" required />
                                  </div>
                                  <div className="md:col-span-2 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Duration</Label>
                                    <Input value={med.duration} onChange={(e) => updateMedicineField(idx, "duration", e.target.value)} placeholder="E.g. 5 days" required />
                                  </div>
                                  <div className="md:col-span-11 space-y-1 md:mt-2">
                                    <Label className="text-[10px] text-muted-foreground">Special Instructions (Optional)</Label>
                                    <Input value={med.instructions} onChange={(e) => updateMedicineField(idx, "instructions", e.target.value)} placeholder="E.g. After food" />
                                  </div>
                                  <div className="md:col-span-1 flex justify-end">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeMedicineRow(idx)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                              No medicines prescribed yet.
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <Label className="text-sm font-semibold text-gray-900">Diagnostics Referred</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addTestRow} className="text-apollo-blue border-apollo-blue/30 hover:bg-apollo-blue/5 h-8 text-xs">
                              <Plus className="w-4 h-4 mr-1.5" /> Add Referral Test
                            </Button>
                          </div>
                          {tests.length > 0 ? (
                            <div className="space-y-3">
                              {tests.map((test, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                                  <div className="md:col-span-5 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Test Name</Label>
                                    <Input value={test.testName} onChange={(e) => updateTestField(idx, "testName", e.target.value)} placeholder="E.g. CBC, Ultrasound" required />
                                  </div>
                                  <div className="md:col-span-6 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Notes</Label>
                                    <Input value={test.notes} onChange={(e) => updateTestField(idx, "notes", e.target.value)} placeholder="E.g. Fasting required" />
                                  </div>
                                  <div className="md:col-span-1 flex justify-end">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeTestRow(idx)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                              No diagnostics referred.
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button type="button" variant="outline" onClick={() => { if (confirm("Hold consultation?")) setActivePatientId(null); }}>
                            Hold consultation
                          </Button>
                          <Button type="submit" className="bg-apollo-blue text-white hover:bg-apollo-dark" disabled={createPrescription.isPending}>
                            {createPrescription.isPending ? (
                              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                            ) : (
                              <><CheckCircle className="w-4 h-4 mr-2" /> Complete & Send</>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="bg-white rounded-xl border border-dashed p-12 text-center shadow-sm h-full flex flex-col items-center justify-center min-h-[350px]">
                    <Stethoscope className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Consultation</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Select a patient from the queue on the left.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Patient</TableHead>
                    <TableHead>Report Type</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
                      </TableCell>
                    </TableRow>
                  ) : doctorReports?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No reports assigned to you.
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctorReports?.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.patientName}</div>
                          <div className="text-xs text-muted-foreground">{r.patientPhone}</div>
                        </TableCell>
                        <TableCell>{r.reportType}</TableCell>
                        <TableCell>
                          <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-apollo-blue underline text-sm flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {r.fileName}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={
                            r.status === "sent" ? "bg-green-100 text-green-700" :
                            r.status === "viewed" ? "bg-purple-100 text-purple-700" :
                            "bg-yellow-100 text-yellow-700"
                          }>
                            {r.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "sent" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-apollo-blue border-apollo-blue"
                              onClick={() => markViewed.mutate({ id: r.id })}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Mark as Viewed
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
