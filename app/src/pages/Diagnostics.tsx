import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Activity,
  CheckCircle,
  FileText,
  User,
  Clock,
  ArrowLeft,
  LogOut,
  AlertCircle,
  Beaker,
  ClipboardList,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

export default function Diagnostics() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Logout mutation
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => navigate("/login"),
  });

  // Poll for sent/dispensed prescriptions
  const { data: prescriptions, isLoading: prescriptionsLoading } =
    trpc.prescriptions.listSent.useQuery(undefined, {
      enabled: !!user,
      refetchInterval: 5000, // Poll every 5 seconds
    });

  // Mutate test status to completed
  const updateTestStatus = trpc.prescriptions.updateTestStatus.useMutation({
    onSuccess: () => {
      utils.prescriptions.listSent.invalidate();
      setFulfillmentTestId(null);
      setResultNotes("");
    },
    onError: (err) => {
      alert("Error completing test: " + err.message);
    },
  });

  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);
  const [fulfillmentTestId, setFulfillmentTestId] = useState<number | null>(null);
  const [resultNotes, setResultNotes] = useState("");

  // Filter prescriptions that have tests
  const testPrescriptions = prescriptions?.filter((p) => p.tests.length > 0) || [];

  // Group pending/completed status of prescriptions based on whether they have pending tests
  const pendingQueue = testPrescriptions.filter((p) =>
    p.tests.some((t) => t.status === "pending")
  );

  const completedQueue = testPrescriptions.filter((p) =>
    p.tests.every((t) => t.status === "completed")
  );

  const selectedPrescription = prescriptions?.find((p) => p.id === selectedPrescriptionId);

  const handleCompleteTest = (testId: number) => {
    if (!resultNotes.trim()) {
      alert("Please enter diagnostic result notes.");
      return;
    }
    updateTestStatus.mutate({
      id: testId,
      status: "completed",
      notes: resultNotes,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-apollo-blue" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "diagnostics" && user?.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="text-center bg-white p-8 rounded-xl shadow-md border border-slate-100 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">You need diagnostics privileges to access this page.</p>
          <Button asChild className="w-full">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
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
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-indigo-600" />
                Diagnostics Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-semibold text-sm text-slate-900">
                  {user?.name || user?.email}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  {user?.role} Portal
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-slate-700 hover:text-red-600"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Referral Queue */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-md font-bold flex items-center gap-2 text-slate-800">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Referrals ({pendingQueue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-3 max-h-[600px] overflow-y-auto space-y-3">
                {prescriptionsLoading ? (
                  <div className="text-center py-8 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading referrals...
                  </div>
                ) : pendingQueue.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-medium text-slate-700 text-sm">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No pending referrals.</p>
                  </div>
                ) : (
                  pendingQueue.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPrescriptionId(p.id);
                        setFulfillmentTestId(null);
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedPrescriptionId === p.id
                          ? "border-indigo-500 bg-indigo-50/30 shadow-sm"
                          : "border-slate-100 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {p.patientName}
                        </h3>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {p.patientGender}, {p.patientAge}y
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div><span className="font-medium text-slate-700">Doctor:</span> Dr. {p.doctorName}</div>
                        <div>
                          <span className="font-medium text-slate-700">Pending Tests:</span>{" "}
                          {p.tests.filter((t) => t.status === "pending").length} of {p.tests.length}
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100/60 mt-1.5 flex justify-between">
                          <span>Ref: #{p.id}</span>
                          <span>{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Completed Referrals History */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Completed Referrals ({completedQueue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 max-h-[300px] overflow-y-auto space-y-2 px-3">
                {completedQueue.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-6">No completed referrals yet.</p>
                ) : (
                  completedQueue.slice(0, 10).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPrescriptionId(p.id);
                        setFulfillmentTestId(null);
                      }}
                      className={`p-3 border rounded-lg text-xs flex justify-between items-center cursor-pointer hover:border-slate-300 ${
                        selectedPrescriptionId === p.id ? "bg-indigo-50/20 border-indigo-200" : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{p.patientName}</div>
                        <div className="text-[10px] text-slate-400">All tests completed</div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100">
                        Done
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selected Referral & Fulfill Forms */}
          <div className="lg:col-span-2">
            {selectedPrescription ? (
              <Card className="border-slate-100 shadow-md bg-white">
                <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50 rounded-t-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Referral Details</div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedPrescription.patientName}</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {selectedPrescription.patientGender}, {selectedPrescription.patientAge} Years Old &bull; {selectedPrescription.patientPhone}
                      </p>
                    </div>
                    <div className="text-right">
                      {selectedPrescription.tests.some((t) => t.status === "pending") ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 uppercase font-semibold text-xs py-1 px-2.5">
                          Pending Tests
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 uppercase font-semibold text-xs py-1 px-2.5">
                          Completed
                        </Badge>
                      )}
                      <p className="text-xs text-slate-400 mt-1.5">
                        Ref No: <span className="font-mono font-semibold">#{selectedPrescription.id}</span>
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Doctor Info */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Recommending Doctor</div>
                      <div className="font-semibold text-slate-800">Dr. {selectedPrescription.doctorName}</div>
                      <div className="text-xs text-slate-500">{selectedPrescription.doctorSpecialty}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Date & Time</div>
                      <div className="font-semibold text-slate-800">
                        {new Date(selectedPrescription.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(selectedPrescription.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Clinical Diagnosis Notes
                    </h3>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap">
                      {selectedPrescription.diagnosisNotes}
                    </div>
                  </div>

                  {/* Tests List */}
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-3">
                      <ClipboardList className="w-4 h-4 text-indigo-600" />
                      Referred Diagnostics
                    </h3>
                    <div className="space-y-4">
                      {selectedPrescription.tests.map((test) => (
                        <div
                          key={test.id}
                          className={`p-4 rounded-xl border transition-all ${
                            test.status === "pending"
                              ? "bg-slate-50/50 border-slate-200"
                              : "bg-emerald-50/10 border-emerald-100"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-950 text-base flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                {test.testName}
                              </h4>
                              {test.notes && test.status === "pending" && (
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-semibold text-slate-700">Doctor Note:</span> {test.notes}
                                </p>
                              )}
                              {test.status === "completed" && (
                                <div className="mt-2 text-xs bg-white p-2 rounded border border-slate-100">
                                  <span className="font-semibold text-slate-700">Result:</span>{" "}
                                  <span className="text-slate-600 font-medium">{test.notes}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              {test.status === "completed" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 uppercase font-semibold text-[10px]">
                                  Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 uppercase font-semibold text-[10px]">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>

                          {test.status === "pending" && (
                            <div className="mt-4 pt-3 border-t border-slate-200/60">
                              {fulfillmentTestId === test.id ? (
                                <div className="space-y-3">
                                  <div>
                                    <Label htmlFor={`result-${test.id}`} className="text-xs font-semibold text-slate-700 mb-1 block">
                                      Enter Test Result Notes
                                    </Label>
                                    <Textarea
                                      id={`result-${test.id}`}
                                      placeholder="e.g. Negative for infection / Hb level is 13.5 g/dL / BP was 120/80 mmHg"
                                      className="text-xs"
                                      value={resultNotes}
                                      onChange={(e) => setResultNotes(e.target.value)}
                                      rows={2}
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setFulfillmentTestId(null);
                                        setResultNotes("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                      onClick={() => handleCompleteTest(test.id)}
                                      disabled={updateTestStatus.isPending}
                                    >
                                      {updateTestStatus.isPending && (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                      )}
                                      Save Results & Complete
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-white border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-200 text-indigo-700 gap-1.5 text-xs font-semibold shadow-none"
                                  onClick={() => {
                                    setFulfillmentTestId(test.id);
                                    setResultNotes("");
                                  }}
                                >
                                  <Beaker className="w-3.5 h-3.5" />
                                  Record Test Results
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Close button */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPrescriptionId(null)}
                    >
                      Close Panel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center shadow-sm">
                <Beaker className="w-16 h-16 text-slate-300 mb-4 stroke-1" />
                <h3 className="font-bold text-slate-700 mb-1">No Referral Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Select a pending referral from the left sidebar to record diagnostic findings and mark tests completed.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
