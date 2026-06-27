import { MessageSquare, CalendarCheck, CreditCard, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const steps = [
  {
    step: "01",
    icon: MessageSquare,
    titleKey: "step1Title",
    descKey: "step1Desc",
    color: "bg-apollo-blue",
  },
  {
    step: "02",
    icon: CalendarCheck,
    titleKey: "step2Title",
    descKey: "step2Desc",
    color: "bg-apollo-orange",
  },
  {
    step: "03",
    icon: CreditCard,
    titleKey: "step3Title",
    descKey: "step3Desc",
    color: "bg-green-500",
  },
];

export default function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-gradient-to-b from-apollo-light/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-apollo-orange font-semibold text-sm uppercase tracking-wider">
            {t("howItWorks.sectionTitle")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            {t("howItWorks.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line for desktop */}
          <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-apollo-blue via-apollo-orange to-green-500" />

          {steps.map((item, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all text-center relative z-10">
                {/* Step Number Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className={`${item.color} text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md`}>
                    {item.step}
                  </div>
                </div>

                <div className="pt-4">
                  <div className={`w-16 h-16 ${item.color}/10 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <item.icon className={`w-8 h-8 ${item.color === 'bg-apollo-blue' ? 'text-apollo-blue' : item.color === 'bg-apollo-orange' ? 'text-apollo-orange' : 'text-green-500'}`} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {t(`howItWorks.${item.titleKey}`)}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(`howItWorks.${item.descKey}`)}
                  </p>
                </div>
              </div>

              {/* Arrow for mobile */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-4 md:hidden">
                  <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
