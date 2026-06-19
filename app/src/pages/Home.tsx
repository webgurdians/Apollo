import { useState } from "react";
import Navbar from "@/components/Navbar";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Hero from "@/sections/Hero";
import Trust from "@/sections/Trust";
import Services from "@/sections/Services";
import DoctorSlideshow from "@/sections/DoctorSlideshow";
import DoctorSchedule from "@/sections/DoctorSchedule";
import HowItWorks from "@/sections/HowItWorks";
import AppointmentForm from "@/sections/AppointmentForm";
import Location from "@/sections/Location";
import Footer from "@/sections/Footer";
import { DoctorPopup } from "@/components/DoctorPopup";

import { parseAvailabilityDate } from "@/lib/utils";

export default function Home() {
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const handleSelectDoctor = (serviceName: string, availability: string) => {
    setSelectedService(serviceName);
    const parsed = parseAvailabilityDate(availability);
    setSelectedDate(parsed);

    // Scroll to the appointment form
    setTimeout(() => {
      const el = document.getElementById("appointment");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <DoctorSlideshow onSelectDoctor={handleSelectDoctor} />
        <Trust />
        <Services />
        <DoctorSchedule />
        <HowItWorks />
        <AppointmentForm
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
        <Location />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <DoctorPopup onSelectDoctor={handleSelectDoctor} />
    </div>
  );
}
