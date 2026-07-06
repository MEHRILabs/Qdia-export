import { Link } from "wouter";
import { motion } from "framer-motion";
import type { Product } from "@workspace/api-client-react";
import { ProductImage } from "@/components/ProductImage";
import { Badge } from "@/components/ui/badge";
import { hasRealProductImage } from "@/lib/images";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowRight, Sparkles } from "lucide-react";

interface Props {
  product: Product;
  index?: number;
}

export function PremiumProductCard({ product, index = 0 }: Props) {
  const { tr, rtl } = useI18n();
  const hasPhoto = hasRealProductImage(product.image_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Link
        href={`/products/${product.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E5E7EB]/80 bg-white shadow-sm hover:shadow-xl hover:border-[#0461A5]/30 transition-all duration-500"
      >
        <div className="absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 group-hover:ring-[#F5C518]/60 transition-all duration-500 pointer-events-none z-10" />

        <div className="aspect-[4/3] overflow-hidden relative bg-[#F8FAFC]">
          <motion.div
            className="h-full w-full"
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductImage
              src={product.image_url}
              alt={product.name}
              className="w-full h-full"
            />
          </motion.div>

          <motion.span
            className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-[#1A1A2E]/85 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm"
            animate={{ boxShadow: ["0 0 0 rgba(245,197,24,0)", "0 0 14px rgba(245,197,24,0.45)", "0 0 0 rgba(245,197,24,0)"] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          >
            <Sparkles className="h-3 w-3 text-[#F5C518]" />
            {tr("home.premium_selection")}
          </motion.span>

          {hasPhoto && (
            <span className="absolute top-3 end-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#0461A5] shadow-sm">
              🇩🇿
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#073B74]/75 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span className="text-white text-sm font-bold flex items-center gap-1">
              {tr("common.view_details")}
              <ArrowRight className={`h-4 w-4 ${rtl ? "rotate-180" : ""}`} />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-bold text-[#1A1A2E] text-sm line-clamp-2 leading-snug mb-2 min-h-[2.5rem] group-hover:text-[#0461A5] transition-colors">
            {product.name}
          </h3>
          <p className="text-xl font-black text-[#0461A5]">
            ${product.prices?.fob?.toLocaleString() ?? "—"}
            <span className="text-xs font-normal text-[#9CA3AF] ms-1">{tr("product.fob")}</span>
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">MOQ {product.moq} {product.moq_unit}</p>
          <div className="mt-auto pt-3 flex items-center gap-2">
            <Badge variant="incoterm" className="text-[10px]">FOB</Badge>
            <span className="text-[11px] text-[#9CA3AF] truncate">{product.port_depart}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
