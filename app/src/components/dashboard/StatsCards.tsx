import { Users, Clock, CheckCircle, Calendar, CreditCard } from "lucide-react";

interface StatsData {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  today: number;
  paid: number;
}

const statConfig = [
  { label: "Total Appointments", key: "total" as const, icon: Users, color: "bg-apollo-blue" },
  { label: "Pending", key: "pending" as const, icon: Clock, color: "bg-yellow-500" },
  { label: "Confirmed", key: "confirmed" as const, icon: CheckCircle, color: "bg-green-500" },
  { label: "Today's Bookings", key: "today" as const, icon: Calendar, color: "bg-apollo-orange" },
  { label: "Paid", key: "paid" as const, icon: CreditCard, color: "bg-purple-500" },
];

export default function StatsCards({ stats, loading }: { stats?: StatsData; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {statConfig.map((stat) => (
        <div key={stat.key} className="glass-panel glass-panel-hover rounded-xl p-4 border border-white/5 relative overflow-hidden group">
          {/* Subtle neon accent border top */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/30 to-purple-500/30 group-hover:from-primary group-hover:to-purple-500 transition-all duration-300" />
          
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 ${stat.color} bg-opacity-20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10`}>
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white text-glow tracking-tight group-hover:text-primary transition-all">
              {loading ? "—" : (stats?.[stat.key] ?? 0)}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium group-hover:text-slate-300 transition-all">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
