import { MapPin, Phone, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function Location() {
  const { t } = useTranslation();

  return (
    <section id="location" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-apollo-orange font-semibold text-sm uppercase tracking-wider">
            {t("location.sectionTitle")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            {t("location.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("location.subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden border shadow-sm h-[400px] md:h-[450px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3671.0538965005886!2d88.62471701103233!3d23.238569477610053!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f8d100596d97fd%3A0xdaceae62b7ea4ef!2sAPOLLO%20HOSPITAL%20CHENNAI%20ARANGHATA%20INFORMATION%20CENTRE!5e0!3m2!1sen!2sin!4v1718826000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Apollo Hospital Chennai Aranghata Information Centre"
                className="grayscale-[20%]"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-apollo-light/50 rounded-2xl p-6 border">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("location.contactInfo")}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-apollo-blue/10 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-apollo-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">{t("location.address")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("location.addressLine1")}<br />
                      {t("location.addressLine2")}<br />
                      {t("location.addressLine3")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-apollo-blue/10 rounded-lg flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-apollo-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">{t("location.phone")}</h4>
                    <a
                      href="tel:+917699933383"
                      className="text-sm text-apollo-blue font-medium hover:underline"
                    >
                      +91 76999 33383
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-apollo-blue/10 rounded-lg flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-apollo-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">{t("location.timings")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("location.timingMonSat")}<br />
                      {t("location.timingSun")}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6 gap-2 bg-apollo-blue hover:bg-apollo-dark text-white"
                onClick={() =>
                  window.open(
                    "https://www.google.com/maps/place/APOLLO+HOSPITAL+CHENNAI+ARANGHATA+INFORMATION+CENTRE/@23.2385646,88.6272919",
                    "_blank"
                  )
                }
              >
                <Navigation className="w-4 h-4" />
                {t("location.getDirections")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
