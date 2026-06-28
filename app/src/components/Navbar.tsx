import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, MessageCircle, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

const WHATSAPP_NUMBER = "917699933383";
const PHONE_NUMBER = "+917699933383";

export default function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isBookPage = location.pathname === "/book-appointment";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: t("nav.services"), id: "services" },
    { label: t("nav.doctors"), id: "doctors" },
    { label: t("nav.bookAppointment"), id: "book-appointment", isRoute: true },
    { label: t("nav.location"), id: "location" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md"
          : "bg-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/">
              <img src="/images/logo.png" alt="Apollo Information Centre Aranghata" className="h-11 w-auto object-contain cursor-pointer" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => (link as any).isRoute ? navigate(link.id) : scrollToSection(link.id)}
                className="text-sm font-medium text-muted-foreground hover:text-apollo-blue transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {!isBookPage && (
              <Button
                size="sm"
                className="gap-2 bg-apollo-blue hover:bg-apollo-dark text-white"
                onClick={() => navigate("/book-appointment")}
              >
                <Calendar className="w-4 h-4" />
                Book Now
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-apollo-blue text-apollo-blue hover:bg-apollo-light"
              onClick={() => window.location.href = `tel:${PHONE_NUMBER}`}
            >
              <Phone className="w-4 h-4" />
              {t("nav.call")}
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-apollo-orange hover:bg-apollo-orange/90 text-white"
              onClick={() =>
                window.open(
                  `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Apollo%20Aranghata,%20I%20want%20to%20book%20an%20appointment`,
                  "_blank"
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              {t("nav.whatsapp")}
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-apollo-blue" />
            ) : (
              <Menu className="w-6 h-6 text-apollo-blue" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  (link as any).isRoute ? navigate(link.id) : scrollToSection(link.id);
                }}
                className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-apollo-blue py-2"
              >
                {link.label}
              </button>
            ))}
            <div className="flex gap-3 pt-3 border-t">
              {!isBookPage && (
                <Button
                  className="flex-1 gap-2 bg-apollo-blue hover:bg-apollo-dark text-white"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/book-appointment");
                  }}
                >
                  <Calendar className="w-4 h-4" />
                  Book Now
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 gap-2 border-apollo-blue text-apollo-blue"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.location.href = `tel:${PHONE_NUMBER}`;
                }}
              >
                <Phone className="w-4 h-4" />
                {t("nav.call")}
              </Button>
              <Button
                className="flex-1 gap-2 bg-apollo-orange hover:bg-apollo-orange/90 text-white"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.open(
                    `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Apollo%20Aranghata,%20I%20want%20to%20book%20an%20appointment`,
                    "_blank"
                  );
                }}
              >
                <MessageCircle className="w-4 h-4" />
                {t("nav.whatsapp")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
