import { Heart, Phone, MessageCircle, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-apollo-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="bg-white p-2 rounded-xl inline-block">
              <img src="/images/logo.png" alt="Apollo Information Centre Aranghata" className="h-12 w-auto object-contain" />
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  {t("nav.services")}
                </a>
              </li>
              <li>
                <a href="#doctors" className="hover:text-white transition-colors">
                  {t("nav.doctors")}
                </a>
              </li>
              <li>
                <a href="#appointment" className="hover:text-white transition-colors">
                  {t("nav.bookAppointment")}
                </a>
              </li>
              <li>
                <a href="#location" className="hover:text-white transition-colors">
                  {t("nav.location")}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.contactUs")}</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-apollo-orange" />
                <a href="tel:+917699933383" className="hover:text-white transition-colors">
                  +91 76999 33383
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-400" />
                <a
                  href="https://wa.me/917699933383"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.whatsappUs")}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-apollo-orange" />
                <span>Aranghata, Nadia, WB – 741501</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/50">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="text-sm text-white/50 flex items-center gap-1">
            {t("footer.madeWith", { heart: "♥" })}
          </p>
        </div>
      </div>
    </footer>
  );
}
