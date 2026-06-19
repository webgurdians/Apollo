import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { X, Calendar, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

interface DoctorPopupProps {
  onSelectDoctor: (serviceName: string, availability: string) => void;
}

export function DoctorPopup({ onSelectDoctor }: DoctorPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: popupSetting } = trpc.patients.getPopupSetting.useQuery();

  useEffect(() => {
    // Check if user has already dismissed the popup in the current session
    const hasSeen = sessionStorage.getItem("hasSeenDoctorPopup");
    if (popupSetting && popupSetting.isActive && popupSetting.doctor && !hasSeen) {
      // Small delay to make it feel organic and premium
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [popupSetting]);

  if (!isOpen || !popupSetting || !popupSetting.doctor) return null;

  const doc = popupSetting.doctor;

  const handleClose = () => {
    sessionStorage.setItem("hasSeenDoctorPopup", "true");
    setIsOpen(false);
  };

  const handleBook = () => {
    // Set the selected service in the form state
    const serviceName = doc.serviceName || `${doc.name} - ${doc.specialty}`;
    onSelectDoctor(serviceName, doc.availability || "");
    
    // Close the popup and save state
    handleClose();

    // Smooth scroll down to appointment form
    setTimeout(() => {
      const el = document.getElementById("appointment");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300">
      {/* Modal Card container */}
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-sky-100 flex flex-col md:flex-row transition-all duration-300 transform scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 border shadow-sm transition-all"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Doctor Photo/Visual column */}
        <div className="relative md:w-2/5 min-h-[180px] bg-gradient-to-br from-apollo-blue to-apollo-dark flex items-center justify-center p-6 text-white shrink-0">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="relative flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg mb-3">
              <img
                src={doc.image || "/images/vignesh.jpg"}
                alt={doc.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-amber-300" /> Featured
            </span>
          </div>
        </div>

        {/* Details & CTA Column */}
        <div className="p-6 md:p-8 md:w-3/5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-apollo-orange tracking-widest uppercase">
                {doc.specialty}
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 leading-tight mt-1">
                {doc.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {doc.credentials}
              </p>
            </div>

            {/* Availability Date Highlight Box */}
            <div className="bg-sky-50/70 border border-sky-100/80 rounded-2xl p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-apollo-blue shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-apollo-blue uppercase tracking-wider">Next Available Slot</h4>
                <p className="text-xs font-semibold text-gray-800 mt-1 leading-relaxed">
                  {popupSetting.availableDate || doc.availability}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              className="w-full gap-2 bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-6 rounded-2xl shadow-lg shadow-apollo-orange/20 transition-all hover:scale-[1.02]"
              onClick={handleBook}
            >
              Book Consultation Now
              <ArrowRight className="w-4 h-4" />
            </Button>
            <button
              onClick={handleClose}
              className="w-full text-center text-xs text-muted-foreground hover:text-gray-800 transition-colors py-1"
            >
              Maybe later, view website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
