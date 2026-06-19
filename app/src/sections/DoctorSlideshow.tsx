import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Award, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";

const fallbackDoctors = [
  {
    name: "Dr. Vignesh Thanikgaivasan",
    specialty: "Cardiology",
    serviceName: "Dr. Vignesh Thanikgaivasan - Cardiology",
    qualifications: "MBBS, MD (Gen Med), DM (Cardiology) AFAPSIC, FIMSA",
    branch: "Apollo Hospitals Greams Road, Chennai",
    image: "/images/vignesh.jpg",
    fees: 1200,
    availability: "Monday & Saturday (11:00 AM – 3:00 PM)"
  },
  {
    name: "Dr. Nithya Narayanan",
    specialty: "ENT / Covid Consult",
    serviceName: "Dr. Nithya Narayanan - ENT / Covid Consult",
    qualifications: "MBBS, DLO, DNB (ENT), MNAMS",
    branch: "Apollo Hospitals Greams Road, Chennai",
    image: "/images/nithya.jpg",
    fees: 1200,
    availability: "Tuesday (10:00 AM – 2:00 PM)"
  },
  {
    name: "Dr. Anusha D",
    specialty: "Consultant Neurologist",
    serviceName: "Dr. Anusha D - Consultant Neurologist",
    qualifications: "MBBS, MD, DM",
    branch: "Apollo Hospitals OMR, Chennai",
    image: "/images/anusha.jpg",
    fees: 1200,
    availability: "Wednesday (9:00 AM – 1:00 PM)"
  },
  {
    name: "Dr. Jothi Parthasarathy S",
    specialty: "Neonatology / Pediatrics",
    serviceName: "Dr. Jothi Parthasarathy S - Neonatology",
    qualifications: "MBBS, MD (Paediatrics)",
    branch: "Apollo Children Hospitals Greams Road, Chennai",
    image: "/images/vishnu.jpg",
    fees: 1200,
    availability: "Thursday (10:00 AM – 2:00 PM)"
  },
  {
    name: "Dr. Vishnu Abishek Raju",
    specialty: "Gastroenterology / GI Medicine",
    serviceName: "Dr. Vishnu Abishek Raju - Gastroenterology",
    qualifications: "MBBS, MD (Internal Medicine), DM (Gastroenterology)",
    branch: "Apollo Hospitals Greams Road, Chennai",
    image: "/images/jothi.jpg",
    fees: 1200,
    availability: "Friday (11:00 AM – 3:00 PM)"
  },
  {
    name: "Dr. Jatin Soni",
    specialty: "Urology",
    serviceName: "Dr. Jatin Soni - Urology",
    qualifications: "MBBS, MS (General Surgery), MCh (Urology)",
    branch: "Apollo Hospitals Chennai",
    image: "/images/jatin.jpg",
    fees: 1200,
    availability: "Saturday (9:30 AM – 2:30 PM)"
  }
];

interface DoctorSlideshowProps {
  onSelectDoctor: (serviceName: string, availability: string) => void;
}

export default function DoctorSlideshow({ onSelectDoctor }: DoctorSlideshowProps) {
  const { data: dbDoctors } = trpc.patients.listDoctors.useQuery();
  const doctors = dbDoctors && dbDoctors.length > 0
    ? dbDoctors.map(d => ({
        name: d.name,
        specialty: d.specialty,
        serviceName: d.serviceName || `${d.name} - ${d.specialty}`,
        qualifications: d.credentials,
        branch: d.branch || "Apollo Hospitals Chennai",
        image: d.image || "/images/jatin.jpg",
        fees: d.fees ?? 1200,
        availability: d.availability || "Monday to Saturday (10:00 AM - 2:00 PM)",
      }))
    : fallbackDoctors;

  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? doctors.length - 1 : (prev - 1) % doctors.length));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= doctors.length - 1 ? 0 : prev + 1));
  };

  // Auto-play every 5 seconds
  useEffect(() => {
    if (doctors.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [doctors.length]);

  const handleBookNow = (serviceName: string, availability: string) => {
    onSelectDoctor(serviceName, availability);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-apollo-light/20 to-white overflow-hidden border-y">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-apollo-orange font-semibold text-sm uppercase tracking-wider">
            Our Specialists
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            Consult <span className="text-apollo-blue">Apollo Chennai Doctors</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Book direct consultations with senior consultants and super-specialists without traveling.
          </p>
        </div>

        {/* Slideshow Container */}
        <div className="relative bg-white rounded-3xl border shadow-xl max-w-5xl mx-auto overflow-hidden">
          <div className="absolute inset-y-0 left-0 flex items-center z-10 pl-2 md:pl-4">
            <button
              onClick={handlePrev}
              className="w-10 h-10 md:w-12 md:h-12 bg-white/90 hover:bg-apollo-blue hover:text-white rounded-full flex items-center justify-center border shadow-md transition-all cursor-pointer"
              aria-label="Previous Doctor"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center z-10 pr-2 md:pr-4">
            <button
              onClick={handleNext}
              className="w-10 h-10 md:w-12 md:h-12 bg-white/90 hover:bg-apollo-blue hover:text-white rounded-full flex items-center justify-center border shadow-md transition-all cursor-pointer"
              aria-label="Next Doctor"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Slide Content */}
          <div className="relative min-h-[420px] transition-all duration-500 ease-in-out">
            {doctors.map((doc, idx) => (
              <div
                key={doc.name}
                className={`transition-opacity duration-700 ease-in-out absolute inset-0 grid md:grid-cols-12 items-center gap-6 p-6 md:p-12 ${
                  idx === currentIndex ? "opacity-100 relative z-0" : "opacity-0 pointer-events-none absolute"
                }`}
              >
                {/* Doctor Photo */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-md border-4 border-apollo-blue/10 bg-gray-50 flex items-center justify-center">
                    <img
                      src={doc.image}
                      alt={doc.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback in case of image load failure
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300";
                      }}
                    />
                  </div>
                </div>

                {/* Doctor Details */}
                <div className="md:col-span-7 space-y-5">
                  <div>
                    <span className="inline-block bg-apollo-orange/10 text-apollo-orange font-bold text-xs uppercase px-3 py-1.5 rounded-full mb-3">
                      {doc.specialty}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">{doc.name}</h3>
                  </div>

                  <div className="space-y-3 text-sm md:text-base text-gray-700">
                    <div className="flex items-start gap-2.5">
                      <Award className="w-5 h-5 text-apollo-blue shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900 block">Qualifications</span>
                        <span className="text-muted-foreground">{doc.qualifications}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Building className="w-5 h-5 text-apollo-blue shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900 block">Apollo Affiliation</span>
                        <span className="text-muted-foreground">{doc.branch}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-5 h-5 text-apollo-blue shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900 block">Weekly Availability</span>
                        <span className="text-muted-foreground">{doc.availability}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <DollarSign className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900 block">Consultation Fee</span>
                        <span className="text-xl font-bold text-green-700">₹{doc.fees} <span className="text-xs text-muted-foreground font-normal">per visit</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => handleBookNow(doc.serviceName, doc.availability)}
                      className="w-full sm:w-auto bg-apollo-blue hover:bg-apollo-dark text-white px-8 py-5 text-base rounded-xl shadow-lg transition-all"
                    >
                      Book Consultation Now
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots/Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {doctors.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 rounded-full transition-all duration-300 border-none cursor-pointer ${
                  idx === currentIndex ? "bg-apollo-blue w-6" : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
