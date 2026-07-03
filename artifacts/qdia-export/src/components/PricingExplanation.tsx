import { Info } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export function PricingExplanation() {
  const { tr } = useI18n();

  const steps = [
    tr("agent.pricing_formula_exw"),
    tr("agent.pricing_formula_fob"),
    tr("agent.pricing_formula_cfr"),
    tr("agent.pricing_formula_cif"),
  ];

  const tables = [
    tr("agent.pricing_table_ports"),
    tr("agent.pricing_table_customs"),
    tr("agent.pricing_table_freight"),
    tr("agent.pricing_table_rates"),
  ];

  return (
    <div className="rounded-lg border border-[#0461A5]/20 bg-[#F0F4FF]/60 p-4 text-sm space-y-3">
      <p className="font-semibold text-[#073B74] flex items-center gap-2">
        <Info className="h-4 w-4" /> {tr("agent.pricing_how_title")}
      </p>
      <ol className="list-decimal list-inside space-y-1 text-[#656566] text-xs">
        {steps.map(s => <li key={s}>{s}</li>)}
      </ol>
      <div>
        <p className="text-xs font-semibold text-[#073B74] mb-1">{tr("agent.pricing_tables_used")}</p>
        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#656566]">
          {tables.map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>
      <p className="text-[11px] text-[#9CA3AF] italic">{tr("agent.pricing_tariffs_note")}</p>
    </div>
  );
}
