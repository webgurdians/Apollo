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

export default function Home() {
  const [selectedService, setSelectedService] = useState("");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <DoctorSlideshow setSelectedService={setSelectedService} />
        <Trust />
        <Services />
        <DoctorSchedule />
        <HowItWorks />
        <AppointmentForm selectedService={selectedService} setSelectedService={setSelectedService} />
        <Location />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <DoctorPopup setSelectedService={setSelectedService} />
    </div>
  );
}
