import { useState, useEffect } from "react";
import { Globe, GripHorizontal } from "lucide-react";
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
  
  // Draggable position state (starts at bottom-6, left-6)
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 24, y: 24 });

  const changeLanguage = (lang: "en" | "bn") => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    setCurrentLang(lang);
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPosStart({ x: position.x, y: position.y });
    e.preventDefault();
  };

  // Touch Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setPosStart({ x: position.x, y: position.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStart.x;
      const deltaY = dragStart.y - e.clientY; // Positioning from bottom

      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 200, posStart.x + deltaX)),
        y: Math.max(10, Math.min(window.innerHeight - 80, posStart.y + deltaY)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = dragStart.y - touch.clientY;

      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 200, posStart.x + deltaX)),
        y: Math.max(10, Math.min(window.innerHeight - 80, posStart.y + deltaY)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, dragStart, posStart]);

  // Hide on dashboard layouts dynamically if needed
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (
      path.startsWith("/admin") ||
      path.startsWith("/front-desk") ||
      path.startsWith("/ops") ||
      path.startsWith("/dev") ||
      path.startsWith("/doctor") ||
      path.startsWith("/pharmacy") ||
      path.startsWith("/diagnostics")
    ) {
      return null;
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: `${position.y}px`,
        left: `${position.x}px`,
        touchAction: "none",
      }}
      className="z-50 print:hidden select-none"
    >
      <div className="bg-white rounded-full border border-slate-200 shadow-2xl p-1.5 flex items-center gap-1.5 backdrop-blur-md bg-white/95">
        {/* Drag Handle & Globe */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="flex items-center gap-1 p-1.5 rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to move widget"
        >
          <GripHorizontal className="w-3 h-3 text-slate-400" />
          <Globe className="w-3.5 h-3.5 text-apollo-blue" />
        </div>

        {/* Translation Buttons */}
        <div className="flex items-center text-xs font-semibold pr-1">
          <button
            onClick={() => changeLanguage("en")}
            className={`px-3 py-1 rounded-full transition-all duration-200 ${
              currentLang === "en"
                ? "bg-apollo-blue text-white shadow-md font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            English
          </button>
          <button
            onClick={() => changeLanguage("bn")}
            className={`px-3 py-1 rounded-full transition-all duration-200 ${
              currentLang === "bn"
                ? "bg-apollo-blue text-white shadow-md font-bold"
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
