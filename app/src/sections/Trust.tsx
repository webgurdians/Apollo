import { Shield, Award, Users, Stethoscope } from "lucide-react";
import { useTranslation } from "react-i18next";

const trustPoints = [
  {
    icon: Award,
    titleKey: "apolloBrand",
    descKey: "apolloBrandDesc",
  },
  {
    icon: Users,
    titleKey: "localPresence",
    descKey: "localPresenceDesc",
  },
  {
    icon: Stethoscope,
    titleKey: "expertDoctors",
    descKey: "expertDoctorsDesc",
  },
  {
    icon: Shield,
    titleKey: "qualityCare",
    descKey: "qualityCareDesc",
  },
];

export default function Trust() {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t("trust.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("trust.subtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((point, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-gradient-to-br from-white to-apollo-light/50 border hover:border-apollo-blue/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 bg-apollo-blue/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-apollo-blue group-hover:text-white transition-colors">
                <point.icon className="w-6 h-6 text-apollo-blue group-hover:text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                {t(`trust.${point.titleKey}`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`trust.${point.descKey}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
