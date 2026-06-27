import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Pill,
  CheckCircle,
  FileText,
  User,
  Clock,
  ArrowLeft,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

export default function Pharmacy() {
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

  // Mutate medicines dispensing
  const dispenseMedicines = trpc.prescriptions.dispenseMedicines.useMutation({
    onSuccess: () => {
      utils.prescriptions.listSent.invalidate();
      setSelectedPrescriptionId(null);
      alert("Medicines successfully dispensed & billing updated!");
    },
    onError: (err) => {
      alert("Error dispensing medicines: " + err.message);
    },
  });

  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);
  const [selectedMeds, setSelectedMeds] = useState<number[]>([]);
  const [billingAmountInput, setBillingAmountInput] = useState<number>(0);

  const selectedPrescription = prescriptions?.find((p) => p.id === selectedPrescriptionId);

  // Pre-select purchased medicines when selecting prescription
  useEffect(() => {
    if (selectedPrescription) {
      const purchasedIds = selectedPrescription.medicines
        .filter((m) => m.status === "purchased")
        .map((m) => m.id);
      const timer = setTimeout(() => {
        setSelectedMeds(purchasedIds);
        setBillingAmountInput(0); // Default to 0 for each new transaction to prevent double counting
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setSelectedMeds([]);
        setBillingAmountInput(0);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedPrescriptionId, selectedPrescription]);

  // Filter prescriptions that have medicines and are still "sent" (pending dispensing)
  const pendingOrders = prescriptions?.filter(
    (p) => p.medicines.length > 0 && p.status === "sent"
  ) || [];

  // Filter for dispensed orders (history)
  const dispensedOrders = prescriptions?.filter(
    (p) => p.medicines.length > 0 && p.status === "dispensed"
  ) || [];

  const handleSavePurchase = () => {
    if (!selectedPrescription) return;

    // Filter to only newly checked medicine IDs
    const newlySelected = selectedMeds.filter(
      (id) => !selectedPrescription.medicines.find((m) => m.id === id && m.status === "purchased")
    );

    if (newlySelected.length === 0 && billingAmountInput === 0) {
      alert("Please select at least one new medicine to dispense or enter a billing amount.");
      return;
    }

    if (confirm("Are you sure you want to save this purchase and dispense selected medicines?")) {
      dispenseMedicines.mutate({
        prescriptionId: selectedPrescription.id,
        medicineIds: newlySelected,
        billingAmount: billingAmountInput,
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-apollo-blue" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "pharmacy" && user?.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="text-center bg-white p-8 rounded-xl shadow-md border border-slate-100 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">You need pharmacy privileges to access this page.</p>
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
                <Pill className="w-5 h-5 text-emerald-600" />
                Pharmacy Dashboard
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
          {/* Pending Prescription Queue */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-md font-bold flex items-center gap-2 text-slate-800">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Dispensing ({pendingOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-3 max-h-[600px] overflow-y-auto space-y-3">
                {prescriptionsLoading ? (
                  <div className="text-center py-8 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading prescriptions...
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-medium text-slate-700 text-sm">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No pending prescriptions.</p>
                  </div>
                ) : (
                  pendingOrders.map((p) => {
                    const purchasedCount = p.medicines.filter((m) => m.status === "purchased").length;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPrescriptionId(p.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedPrescriptionId === p.id
                            ? "border-emerald-500 bg-emerald-50/30 shadow-sm"
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
                            <span className="font-medium text-slate-700">Fulfillment:</span>{" "}
                            {purchasedCount} of {p.medicines.length} purchased
                          </div>
                          {p.pharmacyBillingAmount > 0 && (
                            <div>
                              <span className="font-medium text-slate-700">Paid Total:</span> ₹{p.pharmacyBillingAmount}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100/60 mt-1.5 flex justify-between">
                            <span>Ref: #{p.id}</span>
                            <span>{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Dispensed History */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Recent Dispensed ({dispensedOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 max-h-[300px] overflow-y-auto space-y-2 px-3">
                {dispensedOrders.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-6">No recently dispensed orders.</p>
                ) : (
                  dispensedOrders.slice(0, 10).map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{p.patientName}</div>
                        <div className="text-[10px] text-slate-400">Paid: ₹{p.pharmacyBillingAmount}</div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100">
                        Dispensed
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selected Prescription Details */}
          <div className="lg:col-span-2">
            {selectedPrescription ? (
              <Card className="border-slate-100 shadow-md bg-white">
                <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50 rounded-t-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Prescription Details</div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedPrescription.patientName}</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {selectedPrescription.patientGender}, {selectedPrescription.patientAge} Years Old &bull; {selectedPrescription.patientPhone}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 uppercase font-semibold text-xs py-1 px-2.5">
                        Awaiting Dispensing
                      </Badge>
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
                      <div className="text-xs text-slate-400 font-medium">Prescribing Doctor</div>
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
                      Clinical Diagnosis & Notes
                    </h3>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap">
                      {selectedPrescription.diagnosisNotes}
                    </div>
                  </div>

                  {/* Medicines List */}
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-3">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      Prescribed Medicines Checklist
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                            <th className="py-3 px-4 w-12 text-center">Delivered</th>
                            <th className="py-3 px-4">Medicine Name</th>
                            <th className="py-3 px-4">Dosage</th>
                            <th className="py-3 px-4">Frequency</th>
                            <th className="py-3 px-4">Duration</th>
                            <th className="py-3 px-4">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {selectedPrescription.medicines.map((med) => {
                            const isAlreadyPurchased = med.status === "purchased";
                            const isChecked = selectedMeds.includes(med.id);

                            return (
                              <tr key={med.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isAlreadyPurchased}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMeds([...selectedMeds, med.id]);
                                      } else {
                                        setSelectedMeds(selectedMeds.filter((id) => id !== med.id));
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                  />
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900 flex items-center">
                                  {med.medicineName}
                                  {isAlreadyPurchased && (
                                    <Badge variant="outline" className="ml-2 text-[10px] bg-slate-50 text-slate-500 border-slate-200 uppercase font-medium">
                                      Purchased
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-700">{med.dosage}</td>
                                <td className="py-3 px-4 text-slate-700">{med.frequency}</td>
                                <td className="py-3 px-4 text-slate-700">{med.duration}</td>
                                <td className="py-3 px-4 text-slate-500 italic text-xs">
                                  {med.instructions || "None"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Collect Payment / Billing Input */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Collect Pharmacy Payment</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Enter the exact amount collected for this visit. Previous total paid: ₹{selectedPrescription.pharmacyBillingAmount}.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-semibold text-sm">₹</span>
                      <Input
                        type="number"
                        min={0}
                        value={billingAmountInput === 0 ? "" : billingAmountInput}
                        onChange={(e) => setBillingAmountInput(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-32 bg-white text-right font-semibold text-slate-800"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPrescriptionId(null)}
                    >
                      Close
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm font-semibold"
                      onClick={handleSavePurchase}
                      disabled={dispenseMedicines.isPending}
                    >
                      {dispenseMedicines.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Save Purchase & Dispense
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center shadow-sm">
                <Pill className="w-16 h-16 text-slate-300 mb-4 stroke-1" />
                <h3 className="font-bold text-slate-700 mb-1">No Prescription Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Select a pending prescription from the left sidebar to view details, check off purchased items, and record payments.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
