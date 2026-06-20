import { Clock, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { doesAvailabilityMatchDay } from "@/lib/utils";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DoctorSchedule() {
  const { t } = useTranslation();
  const { data: dbDoctors } = trpc.patients.listDoctors.useQuery();
  const doctorsList = dbDoctors || [];

  const schedule = daysOfWeek.map((day) => {
    const dayDoctors = doctorsList.filter((doc) => {
      if (doesAvailabilityMatchDay(doc.availability || "", day)) return true;
      if (doc.availableDates) {
        const dates = doc.availableDates.split(",").map((d) => d.trim());
        for (const dateStr of dates) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            if (days[d.getDay()] === day) return true;
          }
        }
      }
      return false;
    });

    if (dayDoctors.length > 0) {
      const doctor = dayDoctors
        .map((doc) => {
          let name = doc.name;
          if (name.toLowerCase().startsWith("dr.")) {
            name = name.substring(3).trim();
          } else if (name.toLowerCase().startsWith("dr")) {
            name = name.substring(2).trim();
          }
          return `Dr. ${name}`;
        })
        .join(" / ");

      const specialty = dayDoctors.map((doc) => doc.specialty).join(" / ");
      
      const time = dayDoctors
        .map((doc) => {
          let tStr = doc.availability || "";
          const match = tStr.match(/\(([^)]+)\)/);
          const timing = match && match[1] ? match[1] : tStr;
          
          if (doc.availableDates) {
            const dates = doc.availableDates.split(",").map((d) => d.trim());
            const matchingDates = dates.filter((dateStr) => {
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return false;
              const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              return days[d.getDay()] === day;
            });
            if (matchingDates.length > 0) {
              // Convert matching dates to short display (e.g. 25 Jun)
              const formattedDates = matchingDates.map(dateStr => {
                const parts = dateStr.split("-");
                if (parts.length === 3) {
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const monthIdx = parseInt(parts[1]) - 1;
                  return `${parseInt(parts[2])} ${months[monthIdx]}`;
                }
                return dateStr;
              });
              return `${timing} (On: ${formattedDates.join(", ")})`;
            }
          }
          return timing;
        })
        .join(" / ");

      const hasAvailable = dayDoctors.some((doc) => doc.status === "Available");
      const status = hasAvailable ? "Available" : "Limited";

      return {
        day: t(`doctorSchedule.${day.toLowerCase()}`, day),
        doctor,
        specialty,
        hospital: dayDoctors.map((doc) => doc.branch || "Apollo Hospitals").join(" / "),
        time,
        status: t(hasAvailable ? "doctorSchedule.available" : "doctorSchedule.limited", status),
        statusKey: hasAvailable ? "available" : "limited",
      };
    }

    return {
      day: t(`doctorSchedule.${day.toLowerCase()}`, day),
      doctor: "—",
      specialty: t("doctorSchedule.emergencyOnly"),
      hospital: "Aranghata Centre",
      time: t("doctorSchedule.timeSun"),
      status: t("doctorSchedule.limited", "Limited"),
      statusKey: "limited",
    };
  });

  return (
    <section id="doctors" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-apollo-orange font-semibold text-sm uppercase tracking-wider">
            {t("doctorSchedule.sectionTitle")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            {t("doctorSchedule.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("doctorSchedule.subtitle")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-apollo-blue text-white">
                  <th className="text-left px-6 py-4 font-semibold text-sm">{t("doctorSchedule.day")}</th>
                  <th className="text-left px-6 py-4 font-semibold text-sm">{t("doctorSchedule.doctor")}</th>
                  <th className="text-left px-6 py-4 font-semibold text-sm">{t("doctorSchedule.specialty")}</th>
                  <th className="text-left px-6 py-4 font-semibold text-sm">{t("doctorSchedule.timing")}</th>
                  <th className="text-left px-6 py-4 font-semibold text-sm">{t("doctorSchedule.status")}</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b last:border-b-0 hover:bg-apollo-light/30 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{row.day}</td>
                    <td className="px-6 py-4 text-gray-700">{row.doctor}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.specialty}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-4 h-4 text-apollo-orange" />
                        {row.time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          row.statusKey === "available"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        <UserCheck className="w-3 h-3" />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {schedule.map((row, index) => (
              <div key={index} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{row.day}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      row.statusKey === "available"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700 font-medium">{row.doctor}</p>
                  <p className="text-muted-foreground">{row.specialty}</p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 text-apollo-orange" />
                    {row.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
