import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useI18n } from "@/contexts/I18nContext";
import {
  ALL_CATEGORIES,
  getCategoryDisplay,
  type CatalogCategoryOption,
} from "@/lib/catalog-categories";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: CatalogCategoryOption[];
  className?: string;
};

export function CategoryFilter({ value, onChange, options, className }: Props) {
  const { tr } = useI18n();
  const active = getCategoryDisplay(tr, value, options);

  return (
    <div className={className}>
      <motion.div
        key={value}
        initial={{ scale: 0.98, opacity: 0.85 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 sm:w-[240px] h-11 transition-shadow data-[state=open]:ring-2 data-[state=open]:ring-[#0461A5]/25">
            <span className="flex items-center gap-2 truncate">
              {active.emoji && <span className="shrink-0">{active.emoji}</span>}
              <span className="truncate">{active.label}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>{tr("catalog.all_categories")}</SelectItem>
            {options.filter(o => (o.count ?? 0) > 0).map(({ slug, labelKey, emoji, count }) => (
              <SelectItem key={slug} value={slug}>
                <span className="inline-flex items-center gap-2">
                  <span>{emoji}</span>
                  <span>{tr(labelKey)}</span>
                  {count != null && count > 0 && (
                    <span className="text-[10px] text-[#9CA3AF] tabular-nums">({count.toLocaleString()})</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      <AnimatePresence mode="wait">
        {value !== ALL_CATEGORIES && (
          <motion.div
            key={value}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E8F2FB] border border-[#0461A5]/20 px-3 py-1.5 text-xs font-semibold text-[#0461A5]">
              {active.emoji && (
                <motion.span
                  initial={{ rotate: -12, scale: 0.6 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  {active.emoji}
                </motion.span>
              )}
              <span>{active.label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
