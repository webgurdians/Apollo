import { useState } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

function getLanguageFromStorage(): "en" | "bn" {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "bn") return saved;
  }
  return "en";
}

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<"en" | "bn">(getLanguageFromStorage);

  const changeLanguage = (lang: "en" | "bn") => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    setCurrentLang(lang);
  };

  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 print:hidden">
      <div className="bg-white rounded-full border shadow-xl p-1.5 flex items-center gap-1.5 backdrop-blur-md bg-white/95">
        <div className="p-1.5 rounded-full bg-apollo-blue/10 text-apollo-blue">
          <Globe className="w-4 h-4" />
        </div>

        <div className="flex items-center text-xs font-semibold select-none pr-1">
          <button
            onClick={() => changeLanguage("en")}
            className={`px-3 py-1 rounded-full transition-all ${
              currentLang === "en"
                ? "bg-apollo-blue text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            English
          </button>
          <button
            onClick={() => changeLanguage("bn")}
            className={`px-3 py-1 rounded-full transition-all ${
              currentLang === "bn"
                ? "bg-apollo-blue text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>
    </div>
  );
}
