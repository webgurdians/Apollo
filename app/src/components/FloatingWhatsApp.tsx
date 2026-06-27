import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const WHATSAPP_NUMBER = "919876543210";

export default function FloatingWhatsApp() {
  const { t } = useTranslation();

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Apollo%20Aranghata,%20I%20want%20to%20book%20an%20appointment`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 animate-pulse-slow"
      aria-label={t("floatingWhatsApp.ariaLabel")}
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}
