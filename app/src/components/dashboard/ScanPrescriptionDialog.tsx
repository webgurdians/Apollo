import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  FileText,
  CheckCircle,
  FileUp,
} from "lucide-react";

interface ScanPrescriptionDialogProps {
  patientId: number | null;
  patientName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface MedicineInput {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface TestInput {
  testName: string;
  notes?: string;
}

export default function ScanPrescriptionDialog({
  patientId,
  patientName,
  open,
  onOpenChange,
  onSuccess,
}: ScanPrescriptionDialogProps) {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [step, setStep] = useState<"upload" | "scanning" | "review">("upload");
  const [fileName, setFileName] = useState<string>("");
  const [scanProgress, setScanProgress] = useState(0);

  // Form Fields
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [diagnosisNotes, setDiagnosisNotes] = useState<string>("");
  const [medicines, setMedicines] = useState<MedicineInput[]>([]);
  const [tests, setTests] = useState<TestInput[]>([]);

  // Queries & Mutations
  const { data: doctors } = trpc.patients.listDoctors.useQuery(undefined, {
    enabled: open,
  });

  const createFromScan = trpc.prescriptions.createFromScan.useMutation({
    onSuccess: () => {
      toast.success("Prescription successfully stored and PDF generated!");
      utils.patients.list.invalidate();
      onOpenChange(false);
      resetState();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error("Failed to save prescription: " + err.message);
    },
  });

  const resetState = () => {
    setStep("upload");
    setFileName("");
    setScanProgress(0);
    setSelectedDoctorId("");
    setDiagnosisNotes("");
    setMedicines([]);
    setTests([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startScanning(e.target.files[0].name);
    }
  };

  const startScanning = (name: string) => {
    setFileName(name);
    setStep("scanning");
    setScanProgress(10);

    // Simulate AI Scan Progress
    const intervals = [
      setTimeout(() => setScanProgress(35), 400),
      setTimeout(() => setScanProgress(60), 1000),
      setTimeout(() => setScanProgress(85), 1600),
      setTimeout(() => {
        setScanProgress(100);
        // Pre-populate mock AI extracted data
        setDiagnosisNotes("Acute Upper Respiratory Tract Infection (Fever & Cough)");
        setMedicines([
          {
            medicineName: "Paracetamol 650mg",
            dosage: "1 tab",
            frequency: "1-0-1 (Twice daily)",
            duration: "5 days",
            instructions: "Post meals",
          },
          {
            medicineName: "Amoxicillin 500mg",
            dosage: "1 cap",
            frequency: "1-0-1 (Twice daily)",
            duration: "5 days",
            instructions: "Post meals",
          },
        ]);
        setTests([{ testName: "Complete Blood Count (CBC)", notes: "Urgent" }]);
        
        // Auto-select first doctor if available
        if (doctors && doctors.length > 0) {
          setSelectedDoctorId(doctors[0].id.toString());
        }
        
        setStep("review");
      }, 2200),
    ];

    return () => intervals.forEach(clearTimeout);
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      { medicineName: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, fields: Partial<MedicineInput>) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], ...fields };
    setMedicines(updated);
  };

  const addTest = () => {
    setTests([...tests, { testName: "", notes: "" }]);
  };

  const removeTest = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  const updateTest = (index: number, fields: Partial<TestInput>) => {
    const updated = [...tests];
    updated[index] = { ...updated[index], ...fields };
    setTests(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    if (!selectedDoctorId) {
      toast.error("Please select the prescribing doctor");
      return;
    }
    if (!diagnosisNotes.trim()) {
      toast.error("Diagnosis/Notes are required");
      return;
    }

    createFromScan.mutate({
      patientId,
      doctorId: parseInt(selectedDoctorId),
      diagnosisNotes,
      medicines: medicines.filter((m) => m.medicineName.trim() !== ""),
      tests: tests.filter((t) => t.testName.trim() !== ""),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) resetState();
    }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-apollo-blue" />
            Scan Paper Prescription
          </DialogTitle>
          <DialogDescription>
            Upload a paper prescription image/PDF to extract digital data for <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div
              className="border-2 border-dashed border-sky-200 hover:border-apollo-blue bg-sky-50/20 hover:bg-sky-50/50 transition-all rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="hidden"
              />
              <div className="p-4 bg-sky-100 rounded-full text-apollo-blue group-hover:scale-110 transition-transform">
                <FileUp className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Drag & drop or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Accepts prescription images (PNG, JPG) or PDFs</p>
              </div>
            </div>
          </div>
        )}

        {step === "scanning" && (
          <div className="py-10 text-center space-y-6 flex flex-col items-center">
            <div className="relative w-24 h-24 bg-sky-100/50 rounded-xl flex items-center justify-center overflow-hidden border border-sky-100">
              <FileText className="w-12 h-12 text-apollo-blue" />
              {/* Scan effect bar */}
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-apollo-orange to-transparent animate-pulse top-0" style={{
                animation: 'scanAnimation 1.5s infinite ease-in-out',
                position: 'absolute',
                boxShadow: '0 0 8px #f59e0b'
              }} />
            </div>

            <style>{`
              @keyframes scanAnimation {
                0% { top: 0%; }
                50% { top: 100%; }
                100% { top: 0%; }
              }
            `}</style>

            <div className="space-y-2 w-full max-w-xs">
              <h3 className="font-semibold text-slate-800">Extracting Rx Data...</h3>
              <p className="text-xs text-muted-foreground truncate">{fileName}</p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-3">
                <div
                  className="bg-apollo-blue h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-apollo-blue font-medium mt-1 block">
                Running OCR & AI Medical Entity Extraction
              </span>
            </div>
          </div>
        )}

        {step === "review" && (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 flex items-center gap-3 text-xs text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold">AI Scan Successful</p>
                <p className="text-emerald-700/80">Extracted handwritten medicines and tests. Please verify details before saving.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="doctor-select" className="text-xs font-semibold">Prescribing Doctor</Label>
                  <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                    <SelectTrigger id="doctor-select">
                      <SelectValue placeholder="Select Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors?.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id.toString()}>
                          Dr. {doc.name} ({doc.specialty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="diagnosis" className="text-xs font-semibold">Diagnosis / Notes</Label>
                  <Input
                    id="diagnosis"
                    placeholder="e.g. Acute Fever"
                    value={diagnosisNotes}
                    onChange={(e) => setDiagnosisNotes(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Medicines Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <Label className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    Medicines
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMedicine}
                    className="h-7 text-xs border-dashed gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Medicine
                  </Button>
                </div>

                {medicines.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No medicines added.</p>
                ) : (
                  <div className="space-y-3">
                    {medicines.map((med, index) => (
                      <div key={index} className="bg-slate-50/50 border border-slate-100 rounded-lg p-3 relative space-y-3 group">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedicine(index)}
                          className="absolute right-2 top-2 h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Medicine Name</Label>
                            <Input
                              placeholder="e.g. Paracetamol 650mg"
                              value={med.medicineName}
                              onChange={(e) => updateMedicine(index, { medicineName: e.target.value })}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Dosage</Label>
                            <Input
                              placeholder="e.g. 1 tablet / 5ml"
                              value={med.dosage}
                              onChange={(e) => updateMedicine(index, { dosage: e.target.value })}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Frequency</Label>
                            <Input
                              placeholder="e.g. 1-0-1"
                              value={med.frequency}
                              onChange={(e) => updateMedicine(index, { frequency: e.target.value })}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Duration</Label>
                            <Input
                              placeholder="e.g. 5 days"
                              value={med.duration}
                              onChange={(e) => updateMedicine(index, { duration: e.target.value })}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Instructions</Label>
                            <Input
                              placeholder="e.g. Post meals"
                              value={med.instructions}
                              onChange={(e) => updateMedicine(index, { instructions: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended Tests */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <Label className="text-sm font-bold text-slate-800">Recommended Tests</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTest}
                    className="h-7 text-xs border-dashed gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Test
                  </Button>
                </div>

                {tests.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No tests recommended.</p>
                ) : (
                  <div className="space-y-2">
                    {tests.map((test, index) => (
                      <div key={index} className="flex items-center gap-2 bg-slate-50/50 border border-slate-100 rounded-lg p-2">
                        <Input
                          placeholder="e.g. Complete Blood Count (CBC)"
                          value={test.testName}
                          onChange={(e) => updateTest(index, { testName: e.target.value })}
                          required
                          className="h-8 text-xs flex-1"
                        />
                        <Input
                          placeholder="Notes (optional)"
                          value={test.notes}
                          onChange={(e) => updateTest(index, { notes: e.target.value })}
                          className="h-8 text-xs w-48"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTest(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={resetState}>
                Cancel & Reset
              </Button>
              <Button type="submit" className="bg-apollo-blue hover:bg-apollo-blue/90" disabled={createFromScan.isPending}>
                {createFromScan.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving Prescription...
                  </>
                ) : (
                  <>
                    Save & Generate Digital Rx
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
