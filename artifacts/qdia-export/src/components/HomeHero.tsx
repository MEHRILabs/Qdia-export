import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/lib/images";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { ProductImage } from "@/components/ProductImage";
import { useI18n } from "@/contexts/I18nContext";
import {
  ArrowRight, Sparkles, Globe, Package, Users, TrendingUp,
  ShieldCheck, Ship,
} from "lucide-react";

const STAT_KEYS = [
  { value: "500+", labelKey: "home.stat_suppliers", icon: Users },
  { value: "48", labelKey: "home.stat_wilayas", icon: Globe },
  { value: "32+", labelKey: "home.stat_countries", icon: TrendingUp },
  { value: "6", labelKey: "home.stat_sectors", icon: Package },
] as const;

const MARQUEE_ITEMS = [
  "Huile d'olive", "Dattes Deglet Nour", "Miel du Sahara", "Couscous",
  "Textiles kabyles", "Poterie artisanale", "Phosphate", "Dattes bio",
];

const FLOATING = DEMO_PRODUCTS.slice(0, 3);

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" as const },
  }),
};

export function HomeHero() {
  const { tr } = useI18n();

  return (
    <section className="qdia-hero-immersive relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0">
        <motion.img
          src={IMAGES.hero}
          alt=""
          className="qdia-hero-kenburns absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1.12 }}
          transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <div className="absolute inset-0 qdia-hero-gradient" />
        <div className="qdia-hero-grid absolute inset-0 opacity-[0.07]" aria-hidden />
      </div>

      {/* Orbes lumineux */}
      <motion.div
        className="qdia-hero-orb qdia-hero-orb-gold"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="qdia-hero-orb qdia-hero-orb-blue"
        animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-8 md:pt-14 md:pb-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Texte */}
          <div>
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-white/25 shadow-lg"
            >
              <span className="relative flex h-2 w-2">
                <span className="qdia-pulse-dot absolute inline-flex h-full w-full rounded-full bg-[#F5C518]" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F5C518]" />
              </span>
              🇩🇿 {tr("home.badge")}
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-black text-white leading-[1.08] mb-4 tracking-tight"
            >
              {tr("home.title_line1")}{" "}
              <span className="qdia-hero-highlight">{tr("home.title_highlight")}</span>
              <br />
              {tr("home.title_line2")}
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-base md:text-lg text-white/85 mb-6 leading-relaxed max-w-lg"
            >
              {tr("home.subtitle")}
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-3 mb-8"
            >
              <Button variant="gold" size="lg" className="font-bold qdia-hero-cta-glow gap-2 h-12 px-6" asChild>
                <Link href="/products">
                  {tr("home.cta_catalog")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white bg-white/10 hover:bg-white/20 font-semibold h-12 backdrop-blur-sm"
                asChild
              >
                <Link href="/rfq">{tr("home.cta_rfq")}</Link>
              </Button>
              <Button
                size="lg"
                className="btn-qdia-ai h-12 gap-2 border-0"
                asChild
              >
                <Link href="/agent-ia?new=1">
                  <Sparkles className="h-4 w-4" /> {tr("home.cta_ai")}
                </Link>
              </Button>
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-4 text-xs text-white/70"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#04BB7B]" /> {tr("home.trust_suppliers")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Ship className="h-3.5 w-3.5 text-[#F5C518]" /> {tr("home.trust_incoterms")}
              </span>
            </motion.div>
          </div>

          {/* Cartes produits flottantes */}
          <div className="relative hidden lg:block h-[380px]">
            {FLOATING.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={`qdia-hero-float-card absolute ${["top-0 right-4", "top-24 left-0", "bottom-4 right-12"][i]}`}
                style={{ zIndex: 3 - i }}
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3.5 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Link href={`/products/${product.id}`} className="block group">
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-3 w-[200px] hover:scale-[1.03] transition-transform duration-300">
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#F8FAFC] mb-2">
                        <ProductImage
                          src={product.image_url}
                          alt={product.name}
                          compact
                          className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <p className="text-[11px] font-bold text-[#1A1A2E] line-clamp-2 leading-tight mb-1">{product.name}</p>
                      <p className="text-sm font-black text-[#0461A5]">
                        ${product.prices?.fob?.toLocaleString()}
                        <span className="text-[10px] font-normal text-[#9CA3AF] ml-1">FOB</span>
                      </p>
                    </div>
                  </Link>
                </motion.div>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="absolute bottom-8 left-8 bg-[#073B74]/90 backdrop-blur-md text-white rounded-xl px-4 py-3 border border-white/20 shadow-xl"
            >
              <p className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">Export live</p>
              <p className="text-lg font-black text-[#F5C518]">+127 devis</p>
              <p className="text-[11px] text-white/70">ce mois-ci</p>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {STAT_KEYS.map(({ value, labelKey, icon: Icon }) => (
            <div
              key={labelKey}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 px-4 py-3 hover:bg-white/15 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-[#F5C518]/20 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-[#F5C518]" />
              </div>
              <div>
                <p className="text-xl font-black text-white leading-none">{value}</p>
                <p className="text-[11px] text-white/65 mt-0.5">{tr(labelKey)}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bandeau défilant */}
      <div className="relative z-10 border-t border-white/10 bg-[#073B74]/60 backdrop-blur-sm overflow-hidden py-2.5">
        <div className="qdia-marquee-track flex gap-8 whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={`${item}-${i}`} className="inline-flex items-center gap-2 text-sm text-white/80 font-medium">
              <span className="text-[#F5C518]">◆</span> {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
