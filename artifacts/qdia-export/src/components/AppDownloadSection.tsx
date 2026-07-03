import { motion } from "framer-motion";
import { Smartphone, Download, Sparkles, ShieldCheck, Package } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const APK_URL = `${BASE}/downloads/qdia-export.apk`;

const FEATURE_KEYS = [
  { icon: Sparkles, key: "home.app_feature_ia" as const },
  { icon: ShieldCheck, key: "home.app_feature_verified" as const },
  { icon: Package, key: "home.app_feature_catalog" as const },
];

function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5a1.5 1.5 0 0 0 3 0V19h2v3.5a1.5 1.5 0 0 0 3 0V19h1c.55 0 1-.45 1-1V8H6v10ZM3.5 8A1.5 1.5 0 0 0 2 9.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 3.5 8Zm17 0a1.5 1.5 0 0 0-1.5 1.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 20.5 8Zm-4.97-5.84 1.3-1.3a.5.5 0 0 0-.71-.71l-1.48 1.48A5.9 5.9 0 0 0 12 1c-.96 0-1.86.23-2.66.63L7.85.15a.5.5 0 1 0-.71.71l1.31 1.31A5.9 5.9 0 0 0 6 7h12a5.9 5.9 0 0 0-2.47-4.84ZM10 5H9V4h1v1Zm5 0h-1V4h1v1Z" />
    </svg>
  );
}

function AppleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" fill="currentColor" className={className} aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

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
            {/* Android — téléchargement APK direct */}
            <motion.a
              href={APK_URL}
              download="qdia-export.apk"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              animate={{ boxShadow: ["0 0 0 0 rgba(245,197,24,0)", "0 0 0 8px rgba(245,197,24,0.18)", "0 0 0 0 rgba(245,197,24,0)"] }}
              transition={{ boxShadow: { duration: 2.5, repeat: Infinity } }}
              className="group flex items-center gap-3 bg-[#F5C518] text-[#1A1A2E] rounded-xl h-14 px-5 min-w-[210px] shadow-lg shadow-[#F5C518]/25"
            >
              <AndroidIcon className="h-7 w-7 shrink-0" />
              <div className="text-start leading-tight">
                <span className="block text-[9px] uppercase tracking-wide opacity-70 font-bold">
                  {tr("home.get_on")}
                </span>
                <span className="text-sm font-black">{tr("home.download_apk")}</span>
              </div>
              <Download className="h-4 w-4 ms-auto opacity-70 group-hover:translate-y-0.5 transition-transform" />
            </motion.a>

            {/* iOS — bientôt disponible */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative flex items-center gap-3 bg-white/5 border border-white/25 text-white rounded-xl h-14 px-5 min-w-[210px] backdrop-blur-sm cursor-not-allowed"
              aria-disabled="true"
              role="button"
              title={tr("home.soon_badge")}
            >
              <AppleIcon className="h-7 w-7 shrink-0 text-white/90" />
              <div className="text-start leading-tight">
                <span className="block text-[9px] uppercase tracking-wide opacity-60 font-bold">
                  {tr("home.get_on")}
                </span>
                <span className="text-sm font-black">App Store</span>
              </div>
              <span className="ms-auto text-[9px] font-black bg-[#04BB7B] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                {tr("home.soon_badge")}
              </span>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-[11px] text-white/50 mt-4"
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
