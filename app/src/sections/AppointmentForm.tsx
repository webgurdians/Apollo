import { useState, useMemo } from "react";
import { parseAvailabilityDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc, getBaseUrl } from "@/providers/trpc";
import { loadRazorpayScript } from "@/lib/razorpay";
import {
  CalendarIcon,
  CheckCircle,
  MessageCircle,
  Loader2,
  Phone,
  User,
  Stethoscope,
  Banknote,
  CreditCard,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const WHATSAPP_NUMBER = "917699933383";

const services = [
  { name: "OPD Consultation - General Physician", price: 500 },
  { name: "OPD Consultation - Diabetes & Thyroid", price: 600 },
  { name: "OPD Consultation - Cardiology (BP/ECG)", price: 800 },
  { name: "Blood Test / Pathology", price: 1200 },
  { name: "ECG", price: 300 },
  { name: "Urine Test", price: 150 },
  { name: "Ultrasound", price: 1000 },
  { name: "Apollo Chennai Direct Appointment", price: 1500 },
  { name: "Health Checkup Package", price: 2999 },
];

interface AppointmentFormProps {
  selectedService?: string;
  setSelectedService?: (service: string) => void;
  selectedDate?: Date;
  setSelectedDate?: (date: Date | undefined) => void;
}

export default function AppointmentForm({
  selectedService: selectedServiceProp,
  setSelectedService,
  selectedDate: selectedDateProp,
  setSelectedDate,
}: AppointmentFormProps = {}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState("");
  const [prescriptionFileName, setPrescriptionFileName] = useState("");
  const [age, setAge] = useState("");
  const [localServiceName, setLocalServiceName] = useState("");

  const serviceName = selectedServiceProp !== undefined ? selectedServiceProp : localServiceName;
  const setServiceName = (val: string) => {
    if (setSelectedService) {
      setSelectedService(val);
    } else {
      setLocalServiceName(val);
    }
  };
  const [localDate, setLocalDate] = useState<Date>();
  const setDate = (val: Date | undefined) => {
    if (setSelectedDate) {
      setSelectedDate(val);
    } else {
      setLocalDate(val);
    }
  };

  const [message, setMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "clinic">("online");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const createAppointment = trpc.appointment.create.useMutation();

  const { data: dbDoctors } = trpc.patients.listDoctors.useQuery();
  const formServices = dbDoctors && dbDoctors.length > 0
    ? [
        ...dbDoctors.map(doc => ({ name: doc.serviceName || `${doc.name} - ${doc.specialty}`, price: doc.fees ?? 1200 })),
        { name: "Blood Test / Pathology", price: 1200 },
        { name: "ECG", price: 300 },
        { name: "Urine Test", price: 150 },
        { name: "Ultrasound", price: 1000 },
        { name: "Health Checkup Package", price: 2999 },
      ]
    : services;

  const autoDate = useMemo(() => {
    if (serviceName && dbDoctors) {
      const doc = dbDoctors.find(
        (d) => d.serviceName === serviceName || `${d.name} - ${d.specialty}` === serviceName
      );
      if (doc && doc.availability) {
        return parseAvailabilityDate(doc.availability);
      }
    }
    return undefined;
  }, [serviceName, dbDoctors]);

  const date = selectedDateProp !== undefined ? selectedDateProp : (localDate ?? autoDate);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("appointment.nameError");
    if (!age.trim()) {
      newErrors.age = t("appointment.ageError");
    } else if (isNaN(Number(age)) || Number(age) <= 0) {
      newErrors.age = t("appointment.ageInvalid");
    }
    if (!phone.trim()) {
      newErrors.phone = t("appointment.phoneError");
    } else if (!/^[0-9]{10,12}$/.test(phone.replace(/\D/g, ""))) {
      newErrors.phone = t("appointment.phoneInvalid");
    }
    if (!serviceName) newErrors.service = t("appointment.serviceError");
    if (!date) newErrors.date = t("appointment.dateError");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [bookingDetails, setBookingDetails] = useState<{
    paymentId: string;
    amount: number;
    phone: string;
    patientName: string;
    service: string;
    date: string;
    status: string;
  } | null>(null);

  const downloadReceipt = async () => {
    if (!bookingDetails) return;
    try {
      const response = await fetch(`${getBaseUrl()}/api/generate-receipt-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingDetails),
      });
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${bookingDetails.paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error downloading receipt. Please try again.");
    }
  };

  const handleBookingSuccess = (paymentId?: string) => {
    setSubmitted(true);
    const payId = paymentId || `apt_${Date.now()}`;
    const selectedService = formServices.find((s) => s.name === serviceName);
    const price = selectedService?.price || 500;

    const isPaid = paymentMethod === "online";
    const paymentStatusText = isPaid ? "Paid" : "Pending Payment";

    setBookingDetails({
      paymentId: payId,
      amount: price,
      phone: phone.trim(),
      patientName: name.trim(),
      service: serviceName,
      date: date ? format(date, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy"),
      status: paymentStatusText,
    });

    // Open WhatsApp to send pending approval message to the clinic (simulating automated messaging with click-to-chat)
    const whatsappText = `Hi Apollo Aranghata, I have submitted an appointment request.\n*Name:* ${name}\n*Age:* ${age}\n*Phone:* ${phone}\n*Service:* ${serviceName}\n*Preferred Date:* ${date ? format(date, "dd MMM yyyy") : ""}\n*Payment:* ${paymentMethod === "online" ? "Paid Online" : "Pay at Clinic"}\n\nPlease confirm my appointment.`;
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`,
      "_blank"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (paymentMethod === "online") {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          alert(t("appointment.loadingError"));
          return;
        }
        const rzp = new (window as unknown as { Razorpay: new (opts: {
          key: string; amount: number; currency: string; name: string; description: string;
          handler: (r: { razorpay_payment_id: string }) => void;
          prefill: { name: string; contact: string }; theme: { color: string };
        }) => { open: () => void } }).Razorpay({
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
          amount: (selectedService?.price || 0) * 100,
          currency: "INR",
          name: "Apollo Clinic",
          description: serviceName,
          handler: async (response: { razorpay_payment_id: string }) => {
            await createAppointment.mutateAsync({
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim() || undefined,
              prescriptionFile: prescriptionFile || undefined,
              prescriptionFileName: prescriptionFileName || undefined,
              age: age ? Number(age) : undefined,
              service: serviceName,
              preferredDate: date!.toISOString().split("T")[0],
              message: message.trim() || undefined,
              paymentMethod: "online",
            });
            handleBookingSuccess(response.razorpay_payment_id);
          },
          prefill: { name, contact: phone },
          theme: { color: "#2563eb" },
        });
        rzp.open();
      } else {
        await createAppointment.mutateAsync({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || undefined,
          prescriptionFile: prescriptionFile || undefined,
          prescriptionFileName: prescriptionFileName || undefined,
          age: age ? Number(age) : undefined,
          service: serviceName,
          preferredDate: date!.toISOString().split("T")[0],
          message: message.trim() || undefined,
          paymentMethod: "clinic",
        });
        handleBookingSuccess();
      }
    } catch (err) {
      console.error("Booking failed", err);
      alert(t("appointment.bookingError"));
    }
  };

  const selectedService = formServices.find((s) => s.name === serviceName);

  if (submitted) {
    return (
      <section id="appointment" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("appointment.submittedTitle")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("appointment.submittedDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                className="gap-2 bg-apollo-orange hover:bg-apollo-orange/90 text-white"
                onClick={() =>
                  window.open(
                    `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Apollo%20Aranghata,%20I%20want%20to%20follow%20up%20on%20my%20appointment`,
                    "_blank"
                  )
                }
              >
                <MessageCircle className="w-5 h-5" />
                {t("appointment.followUp")}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-green-600 text-green-600 hover:bg-green-50"
                onClick={downloadReceipt}
              >
                <FileText className="w-5 h-5" />
                Download Receipt (PDF)
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-apollo-blue text-apollo-blue hover:bg-apollo-light"
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setPhone("");
                  setAge("");
                  setServiceName("");
                  setDate(undefined);
                  setMessage("");
                  setErrors({});
                  setPaymentMethod("clinic");
                }}
              >
                {t("appointment.bookAnother")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="appointment" className="py-16 bg-gradient-to-b from-white to-apollo-light/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <div>
              <span className="text-apollo-orange font-semibold text-sm uppercase tracking-wider">
                {t("appointment.sectionTitle")}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
                {t("appointment.title")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("appointment.subtitle")}
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white rounded-xl border shadow-sm">
                <div className="w-10 h-10 bg-apollo-blue/10 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-apollo-blue" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t("appointment.preferCall")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("appointment.preferCallDesc", { phone: "+91 76999 33383" })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white rounded-xl border shadow-sm">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t("appointment.whatsappUpdates")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("appointment.whatsappUpdatesDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 md:p-8 border shadow-lg relative overflow-hidden">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("appointment.formTitle")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {t("appointment.fullName")}
                </Label>
                <Input
                  id="name"
                  placeholder={t("appointment.namePlaceholder")}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={cn(errors.name && "border-red-500 focus-visible:ring-red-500")}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="age" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {t("appointment.age")}
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder={t("appointment.agePlaceholder")}
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value);
                    if (errors.age) setErrors((prev) => ({ ...prev, age: "" }));
                  }}
                  className={cn(errors.age && "border-red-500 focus-visible:ring-red-500")}
                />
                {errors.age && (
                  <p className="text-xs text-red-500">{errors.age}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {t("appointment.phoneNumber")}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t("appointment.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500")}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Address
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Complete Address (optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prescription" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Upload Prescription (optional)
                </Label>
                <Input
                  id="prescription"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPrescriptionFileName(file.name);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPrescriptionFile(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-muted-foreground" />
                  {t("appointment.serviceRequired")}
                </Label>
                <Select
                  value={serviceName}
                  onValueChange={(val) => {
                    setServiceName(val);
                    if (errors.service) setErrors((prev) => ({ ...prev, service: "" }));
                  }}
                >
                  <SelectTrigger className={cn(errors.service && "border-red-500 focus:ring-red-500")}>
                    <SelectValue placeholder={t("appointment.servicePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {formServices.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name} - ₹{s.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service && (
                  <p className="text-xs text-red-500">{errors.service}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  {t("appointment.preferredDate")}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                         "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        errors.date && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : t("appointment.datePlaceholder")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        setDate(d);
                        if (errors.date) setErrors((prev) => ({ ...prev, date: "" }));
                      }}
                      disabled={(date) => {
                        if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                        if (serviceName && dbDoctors) {
                          const doc = dbDoctors.find(
                            (d) => d.serviceName === serviceName || `${d.name} - ${d.specialty}` === serviceName
                          );
                          if (doc && doc.availableDates) {
                            const allowedDates = doc.availableDates.split(",").map(d => d.trim());
                            const dateStr = format(date, "yyyy-MM-dd");
                            return !allowedDates.includes(dateStr);
                          }
                        }
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {serviceName && dbDoctors && (() => {
                  const doc = dbDoctors.find(
                    (d) => d.serviceName === serviceName || `${d.name} - ${d.specialty}` === serviceName
                  );
                  if (doc && doc.availableDates) {
                    return (
                      <p className="text-xs font-semibold text-apollo-blue mt-1 bg-apollo-light/60 p-2 rounded border border-apollo-blue/20">
                        Next Available Dates: {doc.availableDates}
                      </p>
                    );
                  }
                  return null;
                })()}
                {errors.date && (
                  <p className="text-xs text-red-500">{errors.date}</p>
                )}
              </div>
              
              <div className="space-y-3 pt-2">
                <Label>{t("appointment.paymentMethod")}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={cn(
                      "border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 transition-all",
                      paymentMethod === "online" ? "border-apollo-blue bg-apollo-light/50" : "border-gray-200 hover:border-apollo-blue/50"
                    )}
                    onClick={() => setPaymentMethod("online")}
                  >
                    <CreditCard className={cn("w-6 h-6", paymentMethod === "online" ? "text-apollo-blue" : "text-gray-400")} />
                    <span className="font-medium text-sm text-center">{t("appointment.payOnline")}</span>
                    <span className="text-[11px] text-center text-muted-foreground leading-tight">{t("appointment.payOnlineDesc")}</span>
                    <span className="text-xs font-semibold text-apollo-blue mt-1">₹{selectedService?.price || 0}</span>
                  </div>
                  <div
                    className={cn(
                      "border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 transition-all",
                      paymentMethod === "clinic" ? "border-apollo-blue bg-apollo-light/50" : "border-gray-200 hover:border-apollo-blue/50"
                    )}
                    onClick={() => setPaymentMethod("clinic")}
                  >
                    <Banknote className={cn("w-6 h-6", paymentMethod === "clinic" ? "text-apollo-blue" : "text-gray-400")} />
                    <span className="font-medium text-sm text-center">{t("appointment.payAtClinic")}</span>
                    <span className="text-[11px] text-center text-muted-foreground leading-tight">{t("appointment.payAtClinicDesc")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-gray-700">{t("appointment.totalAmount")}</span>
                  <span className="text-xl font-bold text-gray-900">
                    ₹{selectedService?.price || 0}
                  </span>
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2 bg-apollo-blue hover:bg-apollo-dark text-white py-6 text-base"
                  disabled={createAppointment.isPending}
                >
                  {createAppointment.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t("appointment.pleaseWait")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {paymentMethod === "online" ? t("appointment.payNowConfirm") : t("appointment.payClinicConfirm")}
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  {t("appointment.consent")}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
