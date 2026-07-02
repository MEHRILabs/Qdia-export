import { motion } from "framer-motion";
import { Smartphone, Download, Apple, Play, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

const FEATURES = [
  { icon: Sparkles, text: "Agent IA export" },
  { icon: ShieldCheck, text: "Fournisseurs vérifiés" },
  { icon: Download, text: "Studio photo offline" },
];

export function AppDownloadSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#073B74] to-[#0461A5] py-8 md:py-16 px-4 sm:px-6">
      <motion.div
        className="absolute top-0 left-0 w-72 h-72 rounded-full bg-[#F5C518]/10 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#04BB7B]/10 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-6xl mx-auto relative grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-white/20">
            <Smartphone className="h-3.5 w-3.5 text-[#F5C518]" /> Application mobile
          </span>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight">
            Téléchargez <span className="text-[#F5C518]">QDIA Export DZ</span>
          </h2>
          <p className="text-white/75 text-sm md:text-base mb-6 leading-relaxed max-w-md">
            Publiez vos produits algériens, gérez vos prix et studio photo depuis votre téléphone — partout, à tout moment 🇩🇿
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.span
                key={text}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full"
              >
                <Icon className="h-3 w-3 text-[#F5C518]" /> {text}
              </motion.span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="bg-white text-[#1A1A2E] hover:bg-white/90 font-bold gap-3 h-12 px-5 min-w-[200px]"
                asChild
              >
                <a href="https://play.google.com/store/apps/details?id=dz.qdia.export" target="_blank" rel="noreferrer">
                  <Play className="h-5 w-5 text-[#0461A5]" fill="currentColor" />
                  <div className="text-left leading-tight">
                    <span className="text-[9px] block opacity-60 uppercase">Disponible sur</span>
                    <span className="text-sm font-black">Google Play</span>
                  </div>
                </a>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white bg-white/5 hover:bg-white/15 font-bold gap-3 h-12 px-5 min-w-[200px]"
                asChild
              >
                <a href="https://apps.apple.com/app/qdia-export" target="_blank" rel="noreferrer">
                  <Apple className="h-5 w-5" />
                  <div className="text-left leading-tight">
                    <span className="text-[9px] block opacity-60 uppercase">Disponible sur</span>
                    <span className="text-sm font-black">App Store</span>
                  </div>
                </a>
              </Button>
            </motion.div>
          </div>
          <p className="text-[11px] text-white/45 mt-4">Ou lancez en local : <code className="text-white/60">flutter run</code> dans artifacts/qdia_mobile</p>
        </motion.div>

        {/* Mockup téléphone */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex justify-center"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="w-[260px] h-[520px] rounded-[2.5rem] bg-[#1A1A2E] border-4 border-[#334257] shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 inset-x-0 h-7 bg-[#1A1A2E] flex items-center justify-center z-10">
                <div className="w-20 h-4 bg-[#0d0d1a] rounded-full" />
              </div>
              <div className="h-full bg-gradient-to-b from-[#073B74] to-[#0461A5] pt-10 px-4 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
                    <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-black">QDIA Export</p>
                    <p className="text-[#F5C518] text-[9px] font-bold">DZ 🇩🇿</p>
                  </div>
                </div>
                {["Huile d'olive Béjaïa", "Dattes Deglet Nour", "Studio IA"].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-2 border border-white/15"
                  >
                    <p className="text-white text-xs font-semibold">{item}</p>
                    <p className="text-[#F5C518] text-[10px] mt-0.5">FOB · Export ready</p>
                  </motion.div>
                ))}
                <div className="mt-auto mb-6">
                  <div className="bg-[#F5C518] rounded-xl py-2.5 text-center">
                    <p className="text-[#1A1A2E] text-xs font-black">Publier avec l'IA →</p>
                  </div>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-3 -right-3 bg-[#04BB7B] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg"
            >
              Beta
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
