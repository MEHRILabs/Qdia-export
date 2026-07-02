import { Link } from "wouter";
import { motion } from "framer-motion";
import { IMAGES } from "@/lib/images";

interface BrandLogoProps {
  variant?: "header" | "sidebar" | "footer";
}

const IMG_SIZE = {
  header: "h-9 sm:h-11 w-auto max-w-[88px] sm:max-w-[140px]",
  sidebar: "h-11 w-auto max-w-[140px]",
  footer: "h-10 w-auto max-w-[130px]",
};

const TEXT_STYLE = {
  header: { title: "text-white", accent: "text-[#F5C518]" },
  sidebar: { title: "text-white", accent: "text-[#F5C518]" },
  footer: { title: "text-white", accent: "text-[#F5C518]" },
};

export function BrandLogo({ variant = "header" }: BrandLogoProps) {
  const colors = TEXT_STYLE[variant];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 shrink-0 group ${variant === "footer" ? "mb-3" : ""}`}
    >
      <motion.img
        src={IMAGES.logo}
        alt="QDIA Export DZ"
        className={`${IMG_SIZE[variant]} object-contain bg-white rounded-xl px-2 py-1.5 shadow-sm`}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.98 }}
        animate={{ y: [0, -2, 0] }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          scale: { type: "spring", stiffness: 400, damping: 22 },
        }}
      />
      <motion.div
        className="leading-none min-w-0"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <span className={`block text-[11px] sm:text-[15px] font-black tracking-tight truncate ${colors.title} group-hover:text-white transition-colors`}>
          Qdia export DZ
        </span>
        <span className={`hidden sm:block text-[11px] font-bold tracking-[0.12em] uppercase mt-0.5 ${colors.accent}`}>
          Marketplace B2B 🇩🇿
        </span>
      </motion.div>
    </Link>
  );
}
