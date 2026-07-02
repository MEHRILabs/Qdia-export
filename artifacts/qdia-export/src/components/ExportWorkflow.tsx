import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EXPORT_STEPS } from "@/lib/nav";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowRight } from "lucide-react";

export function ExportWorkflow() {
  const { tr } = useI18n();

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-[#F0F4FF] to-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#0461A5]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-2">{tr("home.workflow_badge")}</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#1A1A2E] mb-3">
            {tr("home.workflow_title")}
          </h2>
          <p className="text-[#656566] max-w-xl mx-auto text-sm leading-relaxed">
            {tr("home.workflow_subtitle")}
          </p>
        </motion.div>

        <div className="relative">
          <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#0461A5]/30 to-transparent" aria-hidden />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {EXPORT_STEPS.map(({ step, titleKey, descKey, href, icon: Icon }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link href={href} className="group relative text-center lg:text-left block">
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="inline-flex lg:flex items-center justify-center lg:justify-start gap-3 mb-4">
                      <span className="relative z-10 h-10 w-10 rounded-full bg-[#0461A5] text-white text-sm font-black flex items-center justify-center ring-4 ring-white group-hover:bg-[#073B74] group-hover:scale-110 transition-all duration-300 shadow-md">
                        {step}
                      </span>
                      <Icon className="h-4 w-4 text-[#0461A5] hidden lg:block opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-bold text-[#1A1A2E] text-sm mb-1 group-hover:text-[#0461A5] transition-colors">{tr(titleKey)}</h3>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed max-w-[200px] mx-auto lg:mx-0">{tr(descKey)}</p>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.45 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="gold" size="lg" className="min-w-[220px] font-bold qdia-hero-cta-glow" asChild>
            <Link href="/agent-ia?new=1">{tr("home.workflow_start")} <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
          <Button variant="outline" size="lg" className="min-w-[220px] border-[#0461A5] text-[#0461A5]" asChild>
            <Link href="/studio">{tr("studio.title")}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
