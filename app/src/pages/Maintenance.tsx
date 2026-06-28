import { Button } from "@/components/ui/button";
import { ShieldAlert, Calendar } from "lucide-react";
import { useNavigate } from "react-router";

export default function Maintenance() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100 font-sans">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Animated Icon */}
        <div className="w-16 h-16 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
          <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>

        {/* Text Copy */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white uppercase">
            Scheduled System Optimization
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            We are currently performing scheduled upgrades to our clinic management dashboard.
          </p>
          <p className="text-xs text-emerald-400 font-mono">
            Online appointment booking remains fully online and operational.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Button
            onClick={() => navigate("/book-appointment")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono tracking-wide px-8 py-6 rounded-xl flex items-center gap-2 mx-auto shadow-lg shadow-emerald-950/50 transition-all border border-emerald-500/20"
          >
            <Calendar className="w-5 h-5" />
            Book an Appointment
          </Button>
        </div>

        {/* Scaffolding Footer */}
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-8">
          System State: Booking Mode Only
        </div>
      </div>
    </div>
  );
}
