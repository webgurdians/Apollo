import { useState } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/providers/trpc";
import { loadRazorpayScript } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import { CalendarIcon, CheckCircle, ArrowLeft, Loader2, MessageCircle } from "lucide-react";

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
const WHATSAPP_NUMBER = "917699933383";

const servicePrices: Record<string, number> = {
  "OPD Consultation - General Physician": 500,
  "OPD Consultation - Diabetes & Thyroid": 600,
  "OPD Consultation - Cardiology (BP/ECG)": 800,
  "Blood Test / Pathology": 1200,
  "ECG": 300,
  "X-Ray": 500,
  "Urine Test": 150,
  "Ultrasound": 1000,
  "Apollo Chennai Referral": 1500,
  "Health Checkup Package": 2999,
};

export default function BookAppointment() {
  const navigate = useNavigate();
  const { data: doctors } = trpc.patients.listDoctors.useQuery();
  const bookMutation = trpc.appointment.create.useMutation();

  const [step, setStep] = useState<"form" | "success">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [concern, setConcern] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "clinic">("clinic");

  const selectedDoctor = doctors?.find((d) => d.id.toString() === doctorId);
  const serviceName = selectedDoctor?.serviceName || "OPD Consultation - General Physician";
  const amount = selectedDoctor?.fees || servicePrices[serviceName] || 500;

  const createAppointment = async (method: "online" | "clinic") => {
    return bookMutation.mutateAsync({
      name: name.trim(),
      phone: phone.trim(),
      age: age ? Number(age) : undefined,
      gender: gender || undefined,
      service: serviceName,
      preferredDate: date!.toISOString().split("T")[0],
      message: concern.trim() || undefined,
      doctorId: doctorId ? parseInt(doctorId) : undefined,
      paymentMethod: method,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    try {
      if (paymentMethod === "online") {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          alert("Payment gateway unavailable. Please try again.");
          return;
        }
        const rzp = new (window as any).Razorpay({
          key: RAZORPAY_KEY,
          amount: amount * 100,
          currency: "INR",
          name: "Apollo Clinic",
          description: serviceName,
          handler: async () => {
            await createAppointment("online");
            setStep("success");
          },
          prefill: { name, contact: phone },
          theme: { color: "#2563eb" },
          modal: { ondismiss: () => {} },
        });
        rzp.on("payment.failed", () => alert("Payment failed. Please try again."));
        rzp.open();
      } else {
        await createAppointment("clinic");
        setStep("success");
      }
    } catch {
      alert("Booking failed. Please try again.");
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-green-200 shadow-xl">
          <CardContent className="pt-12 pb-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
            <p className="text-muted-foreground mb-6">We'll contact you shortly to confirm.</p>
            <div className="bg-green-50 rounded-lg p-4 mb-6 text-sm text-left space-y-1">
              <p><span className="font-medium">Name:</span> {name}</p>
              <p><span className="font-medium">Service:</span> {serviceName}</p>
              <p><span className="font-medium">Date:</span> {date ? format(date, "PPP") : "-"}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="gap-2 bg-green-600 hover:bg-green-700"
                onClick={() =>
                  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi Apollo Aranghata, I have submitted an appointment request.\n*Name:* ${name}\n*Phone:* ${phone}\n*Service:* ${serviceName}\n*Date:* ${date ? format(date, "dd MMM yyyy") : ""}\n\nPlease confirm my appointment.`)}`, "_blank")
                }
              >
                <MessageCircle className="w-4 h-4" />
                Follow Up on WhatsApp
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Back to Home
              </Button>
              <Button variant="ghost" onClick={() => setStep("form")}>
                Book Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-bold ml-4">Book Appointment</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle>Patient Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Full Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" required />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Doctor (optional)</Label>
                  <Select value={doctorId} onValueChange={setDoctorId}>
                    <SelectTrigger><SelectValue placeholder="Any available" /></SelectTrigger>
                    <SelectContent>
                      {doctors?.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id.toString()}>
                          {doc.name} — {doc.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>Reason / Concern</Label>
                <Input value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="Brief description (optional)" />
              </div>

              <div>
                <Label>Payment</Label>
                <Select value={paymentMethod} onValueChange={(v: "online" | "clinic") => setPaymentMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic">Pay at Clinic</SelectItem>
                    <SelectItem value="online">Pay Online — ₹{amount}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full bg-apollo-blue hover:bg-apollo-dark text-white py-5 text-base" disabled={bookMutation.isPending}>
                {bookMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...</> : "Confirm Appointment"}
              </Button>

              {bookMutation.error && (
                <p className="text-sm text-red-500 text-center">{bookMutation.error.message}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
