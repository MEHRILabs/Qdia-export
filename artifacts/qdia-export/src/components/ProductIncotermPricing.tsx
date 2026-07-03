import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export type IncotermKey = "exw" | "fob" | "cfr" | "cif";

const INCOTERMS: { key: IncotermKey; label: string; descKey: string }[] = [
  { key: "exw", label: "EXW", descKey: "product_detail.incoterm_exw" },
  { key: "fob", label: "FOB", descKey: "product_detail.incoterm_fob" },
  { key: "cfr", label: "CFR", descKey: "product_detail.incoterm_cfr" },
  { key: "cif", label: "CIF", descKey: "product_detail.incoterm_cif" },
];

interface Prices {
  exw?: number | null;
  fob?: number | null;
  cfr?: number | null;
  cif?: number | null;
}

interface Props {
  prices: Prices;
  unitLabel: string;
  selected: IncotermKey;
  onSelect: (key: IncotermKey) => void;
}

export function ProductIncotermPricing({ prices, unitLabel, selected, onSelect }: Props) {
  const { tr } = useI18n();

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2 bg-[#F0F4FF] border-b text-xs text-[#656566] flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide">{tr("product_detail.select_incoterm")}</span>
        <span className="text-[#0461A5] font-medium hidden sm:inline">
          {tr("product_detail.incoterm_selected")} : {selected.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-4 bg-[#F0F4FF] border-b text-xs font-semibold text-[#656566] uppercase text-center">
        {INCOTERMS.map(({ key, label }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className={`p-2.5 border-r last:border-r-0 ${selected === key ? "text-[#0461A5]" : ""}`}
          >
            {label}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-4 text-center divide-x relative">
        {INCOTERMS.map(({ key, descKey }, i) => {
          const value = prices[key];
          const isActive = selected === key;

          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.06, type: "spring", stiffness: 320, damping: 26 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0461A5] focus-visible:ring-inset ${
                isActive ? "z-10" : "hover:bg-[#FAFBFC]"
              }`}
              aria-pressed={isActive}
              aria-label={`${key.toUpperCase()} — ${tr(descKey)}`}
            >
              {isActive && (
                <motion.div
                  layoutId="product-incoterm-highlight"
                  className="absolute inset-1 rounded-lg bg-[#E8F2FB] border-2 border-[#0461A5] shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <div className="relative z-10">
                <motion.div
                  key={`${key}-${value}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg font-black text-[#0461A5]"
                >
                  ${value?.toLocaleString() ?? "—"}
                </motion.div>
                <div className="text-[10px] text-[#9CA3AF] mt-0.5">{unitLabel}</div>
                <div className="text-[9px] text-[#9CA3AF] mt-1 leading-tight hidden sm:block">{tr(descKey)}</div>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-1.5 flex justify-center"
                  >
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#0461A5] bg-white/80 rounded-full px-1.5 py-0.5 border border-[#0461A5]/30">
                      <Check className="h-2.5 w-2.5" />
                      {tr("product_detail.selected")}
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
