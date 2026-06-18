import { Stethoscope, FlaskConical, Plane, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const serviceDefs = [
  {
    icon: Stethoscope,
    titleKey: "opdTitle",
    descKey: "opdDesc",
    featuresKey: "opdFeatures",
    ctaKey: "opdCta",
  },
  {
    icon: FlaskConical,
    titleKey: "diagTitle",
    descKey: "diagDesc",
    featuresKey: "diagFeatures",
    ctaKey: "diagCta",
  },
  {
    icon: Plane,
    titleKey: "referralTitle",
    descKey: "referralDesc",
    featuresKey: "referralFeatures",
    ctaKey: "referralCta",
  },
];

export default function Services() {
  const { t } = useTranslation();

  const scrollToAppointment = () => {
    const el = document.getElementById("appointment");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="services" className="py-16 bg-gradient-to-b from-white to-apollo-light/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-apollo-orange font-semibold text-sm uppercase tracking-wider">
            {t("services.title")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            {t("services.headline")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("services.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {serviceDefs.map((svc, index) => {
            const features = t(`services.${svc.featuresKey}`, { returnObjects: true }) as string[];
            return (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 border shadow-sm hover:shadow-xl hover:border-apollo-blue/20 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-apollo-blue/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-apollo-blue transition-colors">
                  <svc.icon className="w-7 h-7 text-apollo-blue group-hover:text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t(`services.${svc.titleKey}`)}
                </h3>
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                  {t(`services.${svc.descKey}`)}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {features.map((feature, i) => (
                    <span
                      key={i}
                      className="text-xs bg-apollo-light text-apollo-blue px-3 py-1 rounded-full font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  className="gap-2 text-apollo-blue hover:text-apollo-dark hover:bg-apollo-light p-0 h-auto font-semibold"
                  onClick={scrollToAppointment}
                >
                  {t(`services.${svc.ctaKey}`)}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
