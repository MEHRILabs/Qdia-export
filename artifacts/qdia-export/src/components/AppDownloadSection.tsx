import { motion } from "framer-motion";
import { Smartphone, Download, Sparkles, ShieldCheck, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const APK_URL = `${BASE}/downloads/qdia-export.apk`;

const FEATURE_KEYS = [
  { icon: Sparkles, key: "home.app_feature_ia" as const },
  { icon: ShieldCheck, key: "home.app_feature_verified" as const },
  { icon: Package, key: "home.app_feature_catalog" as const },
];

const FLOAT_ITEMS = [
  { label: "Huile d'olive Béjaïa", price: "FOB · Export" },
  { label: "Dattes Deglet Nour", price: "MOQ 1000 kg" },
  { label: "Studio IA photo", price: "Prêt export 🇩🇿" },
];

export function AppDownloadSection() {
  const { tr } = useI18n();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#073B74] to-[#0461A5] py-14 md:py-20 px-4 sm:px-6">
      <motion.div
        className="absolute top-0 left-0 w-80 h-80 rounded-full bg-[#F5C518]/12 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-[#04BB7B]/12 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -35, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 blur-2xl"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-6xl mx-auto relative grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-white/20 backdrop-blur-sm"
          >
            <Smartphone className="h-3.5 w-3.5 text-[#F5C518]" />
            {tr("home.app_mobile_badge")}
          </motion.span>

          <h2 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight">
            {tr("home.download_app").replace("QDIA Export DZ", "").trim()}{" "}
            <span className="text-[#F5C518]">QDIA Export DZ</span>
          </h2>
          <p className="text-white/75 text-sm md:text-base mb-7 leading-relaxed max-w-md">
            {tr("home.download_subtitle")}
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {FEATURE_KEYS.map(({ icon: Icon, key }, i) => (
              <motion.span
                key={key}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.08 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/90 text-xs font-medium px-3 py-2 rounded-full backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-[#F5C518]" />
                {tr(key)}
              </motion.span>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="bg-[#F5C518] text-[#1A1A2E] hover:bg-[#e6b616] font-black gap-3 h-14 px-6 min-w-[240px] shadow-lg shadow-[#F5C518]/25"
                asChild
              >
                <a href={APK_URL} download="qdia-export.apk">
                  <Download className="h-5 w-5" />
                  <div className="text-left leading-tight">
                    <span className="text-[9px] block opacity-70 uppercase tracking-wide">
                      {tr("home.download_apk_sub")}
                    </span>
                    <span className="text-sm font-black">{tr("home.download_apk")}</span>
                  </div>
                </a>
              </Button>
            </motion.div>
            <motion.div
              animate={{ boxShadow: ["0 0 0 0 rgba(245,197,24,0)", "0 0 0 8px rgba(245,197,24,0.15)", "0 0 0 0 rgba(245,197,24,0)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="rounded-xl"
            >
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white bg-white/5 hover:bg-white/15 font-bold gap-2 h-14 px-5"
                asChild
              >
                <a href={APK_URL}>
                  <Zap className="h-4 w-4 text-[#F5C518]" />
                  {tr("home.apk_version")}
                </a>
              </Button>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-[11px] text-white/45 mt-4"
          >
            {tr("home.apk_install_hint")}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center"
        >
          <motion.div
            animate={{ y: [0, -14, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[#F5C518]/20 blur-3xl rounded-full scale-75" />
            <div className="w-[270px] h-[540px] rounded-[2.75rem] bg-[#0d0d1a] border-4 border-[#334257] shadow-2xl shadow-black/40 overflow-hidden relative z-10">
              <div className="absolute top-0 inset-x-0 h-8 bg-[#0d0d1a] flex items-center justify-center z-10">
                <div className="w-24 h-5 bg-black rounded-full" />
              </div>
              <div className="h-full bg-gradient-to-b from-[#073B74] via-[#0461A5] to-[#04BB7B]/30 pt-11 px-4 flex flex-col">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-2 mb-5"
                >
                  <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center shadow-md">
                    <img src={`${BASE}/logo.png`} alt="" className="h-6 w-6 object-contain" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-black">QDIA Export</p>
                    <p className="text-[#F5C518] text-[10px] font-bold">DZ 🇩🇿</p>
                  </div>
                </motion.div>

                {FLOAT_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.35 + i * 0.12 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-3 mb-2.5 border border-white/15"
                  >
                    <p className="text-white text-xs font-semibold">{item.label}</p>
                    <p className="text-[#F5C518] text-[10px] mt-0.5 font-medium">{item.price}</p>
                  </motion.div>
                ))}

                <motion.div
                  className="mt-auto mb-7"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="bg-[#F5C518] rounded-xl py-3 text-center shadow-lg shadow-[#F5C518]/30">
                    <p className="text-[#1A1A2E] text-xs font-black">{tr("home.app_cta_mock")}</p>
                  </div>
                </motion.div>
              </div>
            </div>

            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="absolute -top-2 -right-2 bg-[#04BB7B] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg z-20"
            >
              APK
            </motion.div>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              className="absolute -left-6 top-1/3 bg-white/10 backdrop-blur border border-white/20 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
            >
              19k+ produits
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
