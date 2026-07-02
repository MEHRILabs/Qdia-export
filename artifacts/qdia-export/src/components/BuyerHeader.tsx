import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { Wand2, LogIn, LogOut, User, Store, Sparkles, Globe, Menu, MapPin, BookOpen, ShoppingCart, Package, Truck, Shield } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { Locale } from "@/lib/i18n";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function StudioIAButton({ label }: { label: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.97 }}
      animate={{
        boxShadow: [
          "0 0 16px rgba(245, 197, 24, 0.35)",
          "0 0 28px rgba(245, 197, 24, 0.55)",
          "0 0 16px rgba(245, 197, 24, 0.35)",
        ],
      }}
      transition={{ boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } }}
      className="rounded-lg"
    >
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 bg-[#F5C518] text-[#1A1A2E] px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#E0B015] transition-colors"
      >
        <motion.span
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Wand2 className="h-4 w-4" />
        </motion.span>
        {label}
      </Link>
    </motion.div>
  );
}

function EspaceFournisseurButton({ label }: { label: string }) {
  const [location, setLocation] = useLocation();
  const active = location.startsWith("/supplier") || location.startsWith("/dashboard");

  const goSupplier = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setLocation("/supplier");
  }, [setLocation]);

  return (
    <Link
      href="/supplier"
      onClick={goSupplier}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors shadow-[0_0_16px_rgba(245,197,24,0.35)] hover:scale-[1.02] active:scale-[0.98] ${
        active
          ? "bg-[#E0B015] text-[#1A1A2E] ring-2 ring-white/30"
          : "bg-[#F5C518] text-[#1A1A2E] hover:bg-[#E0B015]"
      }`}
    >
      <Store className="h-4 w-4" />
      {label}
      <Sparkles className="h-3.5 w-3.5" />
    </Link>
  );
}

export function BuyerHeader() {
  const { user, logout } = useAuth();
  const { locale, setLocale, tr } = useI18n();
  const [, setLocation] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "1") {
      const returnTo = params.get("returnTo");
      if (returnTo) sessionStorage.setItem("qdia_return_to", decodeURIComponent(returnTo));
      setAuthOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
    const openAuth = () => setAuthOpen(true);
    window.addEventListener("qdia-open-auth", openAuth);
    return () => window.removeEventListener("qdia-open-auth", openAuth);
  }, []);

  const onAuthSuccess = useCallback(() => {
    const returnTo = sessionStorage.getItem("qdia_return_to") ?? "/supplier";
    sessionStorage.removeItem("qdia_return_to");
    setLocation(returnTo);
  }, [setLocation]);

  const langs: { code: Locale; label: string; name: string }[] = [
    { code: "fr", label: "FR", name: "Français" },
    { code: "en", label: "EN", name: "English" },
    { code: "ar", label: "AR", name: "العربية" },
  ];

  const currentLang = langs.find(l => l.code === locale) ?? langs[0];

  return (
    <>
      <header className="qdia-navbar sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto h-14 sm:h-16 px-3 sm:px-4 md:px-6 flex items-center gap-2 sm:gap-3 md:gap-5">
          <BrandLogo variant="header" />

          <nav className="hidden md:flex items-center gap-3">
            <EspaceFournisseurButton label={tr("header.supplier_space")} />
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="md:hidden inline-flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors"
                  aria-label={tr("header.menu")}
                >
                  <Menu className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1" onCloseAutoFocus={e => e.preventDefault()}>
                <DropdownMenuItem asChild>
                  <Link href="/supplier" className="cursor-pointer text-sm py-2">
                    <Store className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("header.supplier_space")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/studio" className="cursor-pointer text-sm py-2">
                    <Wand2 className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("header.studio_ia")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/products" className="cursor-pointer text-sm py-2">
                    <BookOpen className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("header.explore_catalog")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/panier" className="cursor-pointer text-sm py-2">
                    <ShoppingCart className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("cart.title")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/commandes" className="cursor-pointer text-sm py-2">
                    <Package className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("orders.title")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/suivi" className="cursor-pointer text-sm py-2">
                    <Truck className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("tracking.page_title")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/trade-assurance" className="cursor-pointer text-sm py-2">
                    <Shield className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("trade_assurance.title")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/#emplacement" className="cursor-pointer text-sm py-2">
                    <MapPin className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("header.location")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tr("header.lang")}</div>
                {langs.map(l => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLocale(l.code)}
                    className={`cursor-pointer text-sm py-2 ${locale === l.code ? "font-bold text-[#0461A5]" : ""}`}
                  >
                    <Globe className="h-3.5 w-3.5 mr-2 inline opacity-60" /> {l.name} ({l.label})
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {user ? (
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer text-sm py-2">
                    <LogOut className="h-4 w-4 mr-2 inline" /> {tr("header.logout")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setAuthOpen(true)} className="cursor-pointer text-sm py-2 font-semibold">
                    <LogIn className="h-4 w-4 mr-2 inline text-[#0461A5]" /> {tr("header.login")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden md:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                  title={tr("header.lang")}
                >
                  <Globe className="h-4 w-4 text-[#F5C518]" />
                  <span>{currentLang.label}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40" onCloseAutoFocus={e => e.preventDefault()}>
                {langs.map(l => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLocale(l.code)}
                    className={`cursor-pointer ${locale === l.code ? "font-bold text-[#0461A5]" : ""}`}
                  >
                    {l.name} ({l.label})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="hidden md:block">
              <StudioIAButton label={tr("header.studio_ia")} />
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden md:inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                  >
                    <User className="h-4 w-4 text-[#F5C518]" />
                    <span className="max-w-[100px] truncate hidden sm:inline">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={e => e.preventDefault()}>
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {user.email ?? user.phone ?? tr("auth.login")}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/facturation" className="cursor-pointer">{tr("facturation.title")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/panier" className="cursor-pointer">{tr("cart.title")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/commandes" className="cursor-pointer">{tr("orders.title")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/suivi" className="cursor-pointer">{tr("tracking.page_title")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/trade-assurance" className="cursor-pointer">{tr("trade_assurance.title")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/supplier" className="cursor-pointer">{tr("header.supplier_space")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">{tr("nav.dashboard")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" /> {tr("header.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.button
                type="button"
                onClick={() => setAuthOpen(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="hidden md:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white px-4 py-2 rounded-lg text-[13px] font-bold transition-colors"
              >
                <LogIn className="h-4 w-4" />
                {tr("header.login")}
              </motion.button>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} onSuccess={onAuthSuccess} />
    </>
  );
}

export { BuyerFooter } from "@/components/BuyerFooter";
