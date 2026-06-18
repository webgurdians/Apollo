import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Clock, Shield, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

const WHATSAPP_NUMBER = "917699933383";
const PHONE_NUMBER = "+917699933383";

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-apollo-light via-white to-white" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-apollo-blue/5 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-apollo-blue/10 text-apollo-blue px-4 py-2 rounded-full text-sm font-medium">
              <Shield className="w-4 h-4" />
              {t("hero.badge")}
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {t("hero.headline")}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                {t("hero.subhead")}
              </p>
            </div>

            {/* Trust Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border text-sm">
                <Clock className="w-4 h-4 text-apollo-orange" />
                <span className="font-medium">{t("hero.sameDay")}</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border text-sm">
                <MapPin className="w-4 h-4 text-apollo-orange" />
                <span className="font-medium">{t("hero.aranghata")}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="gap-2 bg-apollo-orange hover:bg-apollo-orange/90 text-white text-base px-8 py-6 shadow-lg shadow-apollo-orange/25"
                onClick={() =>
                  window.open(
                    `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Apollo%20Aranghata,%20I%20want%20to%20book%20an%20appointment`,
                    "_blank"
                  )
                }
              >
                <MessageCircle className="w-5 h-5" />
                {t("hero.bookWhatsApp")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-apollo-blue text-apollo-blue hover:bg-apollo-light text-base px-8 py-6"
                onClick={() => window.location.href = `tel:${PHONE_NUMBER}`}
              >
                <Phone className="w-5 h-5" />
                {t("hero.callNow")}
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-apollo-blue to-apollo-dark border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p>
                <span className="font-semibold text-foreground">500+</span> {t("hero.patientsServed")}
              </p>
            </div>
          </div>

          {/* Right - Visual Card */}
          <div className="relative hidden lg:block">
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 border">
              <div className="absolute -top-4 -right-4 bg-apollo-orange text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg">
                {t("hero.openToday")}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-12 h-12 bg-apollo-blue rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t("hero.apolloInfoCentre")}</h3>
                    <p className="text-sm text-muted-foreground">{t("hero.aranghataWB")}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">{t("hero.opdConsultation")}</span>
                    <span className="text-sm font-semibold text-apollo-blue">{t("hero.available")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">{t("hero.bloodTests")}</span>
                    <span className="text-sm font-semibold text-apollo-blue">{t("hero.available")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">{t("hero.ecgXray")}</span>
                    <span className="text-sm font-semibold text-apollo-blue">{t("hero.available")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">{t("hero.chennaiReferral")}</span>
                    <span className="text-sm font-semibold text-apollo-blue">{t("hero.available")}</span>
                  </div>
                </div>

                <Button 
                  className="w-full gap-2 bg-apollo-blue hover:bg-apollo-dark text-white"
                  onClick={() => {
                    const el = document.getElementById("appointment");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {t("hero.bookAppointment")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
