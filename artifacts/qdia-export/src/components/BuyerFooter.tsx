import { type ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { CONTACT, CERTIFICATIONS } from "@/lib/contact";
import { Mail, MapPin, Phone, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { isExporterOnly } from "@/lib/roles";

function FooterColTitle({ children }: { children: ReactNode }) {
  return (
    <p className="font-bold text-white text-sm mb-4 min-h-[20px] flex items-end">
      {children}
    </p>
  );
}

function FooterNavLink({
  href,
  label,
  icon: Icon,
}: {
  href?: string;
  label: string;
  icon?: typeof Phone;
}) {
  const className =
    "group flex items-center gap-2 text-white/55 hover:text-[#F5C518] transition-colors text-sm";

  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />}
      <span className="whitespace-nowrap">{label}</span>
      {href && (
        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      )}
    </>
  );

  if (href?.startsWith("/")) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  if (href) {
    return <a href={href} className={className}>{content}</a>;
  }
  return <div className={className}>{content}</div>;
}

function FooterBtn({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/80 bg-white/10 border border-white/15 hover:bg-[#F5C518] hover:text-[#1A1A2E] hover:border-[#F5C518] transition-colors"
    >
      {label}
    </Link>
  );
}

function MobileFooterSection({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5C518]/90 mb-2.5">{title}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {links.map(({ href, label }) => (
          <FooterBtn key={href} href={href} label={label} />
        ))}
      </div>
    </div>
  );
}

function DesktopFooter() {
  const { tr } = useI18n();
  const { user } = useAuth();

  const exportLinks = isExporterOnly(user) ? [
    { href: "/supplier", label: tr("header.supplier_space") },
    { href: "/studio", label: tr("header.studio_ia") },
    { href: "/dashboard", label: tr("nav.dashboard") },
    { href: "/agent-ia", label: tr("nav.agent_ia") },
  ] : [
    { href: "/commandes", label: tr("orders.title") },
    { href: "/favoris", label: tr("nav.favorites") },
    { href: "/panier", label: tr("cart.title") },
    { href: "/rfq", label: tr("home.cta_rfq") },
  ];

  const buyersColTitle = isExporterOnly(user) ? tr("footer.exporters") : tr("header.buyer_space");

  const platformLinks = [
    { href: "/products", label: tr("nav.catalog") },
    { href: "/rfq", label: tr("footer.rfq") },
    { href: "/", label: tr("nav.home") },
  ];

  const categoryLinks = [
    { href: "/products?category=Agriculture%20%26%20Food", label: tr("footer.category_agro") },
    { href: "/products?category=Textiles%20%26%20Apparel", label: tr("footer.category_textiles") },
    { href: "/products?category=Handicrafts%20%26%20Decor", label: tr("footer.category_handicrafts") },
    { href: "/products?category=Energy%20%26%20Chemicals", label: tr("footer.category_energy") },
    { href: "/products?category=Construction%20Materials", label: tr("footer.category_construction") },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-14 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6 text-sm items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="sm:col-span-2 lg:col-span-3"
          >
            <FooterColTitle>{tr("footer.brand_title")}</FooterColTitle>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
              <img
                src="/logo.png"
                alt={tr("footer.brand_title")}
                className="h-10 w-10 object-contain bg-white rounded-lg p-1"
              />
              <span className="text-[#F5C518] text-xs font-bold tracking-wide group-hover:text-[#E0B015] transition-colors">
                {tr("footer.marketplace_tag")}
              </span>
            </Link>
            <p className="text-white/60 leading-relaxed text-sm max-w-xs">
              {tr("footer.description")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <FooterColTitle>{buyersColTitle}</FooterColTitle>
            <nav className="flex flex-col gap-2">
              {exportLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-1 text-white/55 hover:text-[#F5C518] transition-colors text-sm"
                >
                  {label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </nav>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#F5C518]/80 mt-5 mb-2">
              {tr("footer.certifications")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CERTIFICATIONS.map((cert) => (
                <span
                  key={cert.id}
                  className="inline-flex items-center gap-1 bg-white/8 border border-white/15 text-white/70 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                >
                  {cert.emoji && <span>{cert.emoji}</span>}
                  {cert.label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-2"
          >
            <FooterColTitle>{tr("footer.platform")}</FooterColTitle>
            <nav className="flex flex-col gap-2">
              {platformLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-1 text-white/55 hover:text-[#F5C518] transition-colors text-sm"
                >
                  {label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </nav>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-2"
          >
            <FooterColTitle>{tr("footer.categories")}</FooterColTitle>
            <nav className="flex flex-col gap-2">
              {categoryLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-1 text-white/55 hover:text-[#F5C518] transition-colors text-sm"
                >
                  {label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </nav>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 min-w-[160px]"
          >
            <FooterColTitle>{tr("footer.contact")}</FooterColTitle>
            <nav className="flex flex-col gap-2.5">
              <FooterNavLink href={`tel:${CONTACT.phoneTel}`} label={CONTACT.phone} icon={Phone} />
              <FooterNavLink href={`mailto:${CONTACT.email}`} label={CONTACT.email} icon={Mail} />
              <FooterNavLink label={CONTACT.city} icon={MapPin} />
            </nav>
          </motion.div>
        </div>
      </div>

      <div className="border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <motion.p
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-xs text-white/45 text-center sm:text-left"
          >
            {tr("footer.copyright_full")}
          </motion.p>
          <div className="flex gap-6 text-xs text-white/40">
            <Link href="/legal/confidentialite" className="hover:text-white/70 transition-colors">{tr("footer.privacy")}</Link>
            <Link href="/legal/cgu" className="hover:text-white/70 transition-colors">{tr("footer.terms")}</Link>
            <Link href="/mes-rfq" className="hover:text-white/70 transition-colors">{tr("footer.my_rfqs")}</Link>
          </div>
        </div>
      </div>
    </>
  );
}

function MobileFooter() {
  const { tr } = useI18n();
  const { user } = useAuth();

  const mobileNav = [
    ...(isExporterOnly(user) ? [
      { href: "/supplier", label: tr("header.supplier_space") },
      { href: "/studio", label: tr("header.studio_ia") },
    ] : [
      { href: "/commandes", label: tr("orders.title") },
      { href: "/favoris", label: tr("nav.favorites") },
    ]),
    { href: "/products", label: tr("nav.catalog") },
    { href: "/#emplacement", label: tr("header.location") },
  ];

  const mobilePlatform = [
    { href: "/rfq", label: tr("footer.rfq") },
    ...(isExporterOnly(user) ? [
      { href: "/dashboard", label: tr("nav.dashboard") },
      { href: "/agent-ia", label: tr("nav.agent_ia") },
    ] : [
      { href: "/panier", label: tr("cart.title") },
      { href: "/commandes", label: tr("orders.title") },
    ]),
    { href: "/mes-rfq", label: tr("footer.my_rfqs") },
  ];

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-8 relative text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <img src="/logo.png" alt={tr("brand.name")} className="h-10 w-10 object-contain bg-white rounded-xl p-1 shadow-sm" />
            <span className="text-white font-black text-base group-hover:text-[#F5C518] transition-colors">{tr("brand.name")}</span>
          </Link>
          <p className="text-white/50 text-[11px] mt-2 leading-snug max-w-xs mx-auto">
            {tr("footer.mobile_tagline")}
          </p>
        </motion.div>

        <MobileFooterSection title={tr("header.navigation")} links={mobileNav} />
        <MobileFooterSection title={tr("footer.platform")} links={mobilePlatform} />

        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5C518]/90 mb-2.5">{tr("footer.contact")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <a href={`tel:${CONTACT.phoneTel}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/80 bg-white/10 border border-white/15 hover:bg-white/20 transition-colors">
              <Phone className="h-3 w-3" /> {CONTACT.phone}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/80 bg-white/10 border border-white/15 hover:bg-white/20 transition-colors">
              <Mail className="h-3 w-3" /> {tr("footer.email_label")}
            </a>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 bg-white/5 border border-white/10">
              <MapPin className="h-3 w-3" /> {CONTACT.city}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {CERTIFICATIONS.map((cert) => (
            <span key={cert.id} className="inline-flex items-center gap-0.5 bg-white/8 border border-white/10 text-white/55 text-[9px] font-semibold px-2 py-0.5 rounded-full">
              {cert.emoji && <span>{cert.emoji}</span>}
              {cert.label}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 relative">
        <div className="max-w-lg mx-auto px-4 py-3 text-center space-y-2">
          <p className="text-[10px] text-white/40">{tr("footer.copyright_mobile")}</p>
          <div className="flex justify-center gap-4 text-[10px] text-white/35">
            <Link href="/legal/confidentialite" className="hover:text-white/65 transition-colors">{tr("footer.privacy")}</Link>
            <Link href="/legal/cgu" className="hover:text-white/65 transition-colors">{tr("footer.terms")}</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export function BuyerFooter() {
  return (
    <footer className="mt-auto">
      <div className="qdia-footer relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(4,97,165,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,197,24,0.15) 0%, transparent 40%)",
          }}
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="md:hidden relative">
          <MobileFooter />
        </div>
        <div className="hidden md:block relative">
          <DesktopFooter />
        </div>
      </div>
    </footer>
  );
}
