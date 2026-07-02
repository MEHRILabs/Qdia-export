import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { SlidersHorizontal } from "lucide-react";

export type CatalogFilters = {
  moqMin: string;
  moqMax: string;
  priceMin: string;
  priceMax: string;
  originWilaya: string;
  supplierId: string;
  incoterm: string;
};

interface Props {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  onReset: () => void;
}

const WILAYAS = [
  "Alger", "Oran", "Constantine", "Annaba", "Béjaïa", "Biskra", "Ghardaïa",
  "Tizi Ouzou", "Sétif", "Blida", "Mostaganem", "Tlemcen",
];

export function AdvancedCatalogFilters({ filters, onChange, onReset }: Props) {
  const { tr } = useI18n();
  const set = (key: keyof CatalogFilters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm flex items-center gap-2 text-[#073B74]">
          <SlidersHorizontal className="h-4 w-4" /> {tr("filters.title")}
        </p>
        <Button variant="ghost" size="sm" onClick={onReset}>{tr("filters.reset")}</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">{tr("filters.moq_min")}</Label>
          <Input type="number" value={filters.moqMin} onChange={e => set("moqMin", e.target.value)} placeholder="100" />
        </div>
        <div>
          <Label className="text-xs">{tr("filters.moq_max")}</Label>
          <Input type="number" value={filters.moqMax} onChange={e => set("moqMax", e.target.value)} placeholder="10000" />
        </div>
        <div>
          <Label className="text-xs">{tr("filters.price_min")}</Label>
          <Input type="number" value={filters.priceMin} onChange={e => set("priceMin", e.target.value)} placeholder="USD" />
        </div>
        <div>
          <Label className="text-xs">{tr("filters.price_max")}</Label>
          <Input type="number" value={filters.priceMax} onChange={e => set("priceMax", e.target.value)} placeholder="USD" />
        </div>
        <div>
          <Label className="text-xs">{tr("filters.origin")}</Label>
          <Select value={filters.originWilaya || "ALL"} onValueChange={v => set("originWilaya", v === "ALL" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={tr("filters.origin")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{tr("common.all")}</SelectItem>
              {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{tr("filters.supplier_id")}</Label>
          <Input type="number" value={filters.supplierId} onChange={e => set("supplierId", e.target.value)} placeholder="ID" />
        </div>
        <div>
          <Label className="text-xs">{tr("catalog.incoterm")}</Label>
          <Select value={filters.incoterm || "ALL"} onValueChange={v => set("incoterm", v === "ALL" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{tr("common.all")}</SelectItem>
              {["EXW", "FOB", "CFR", "CIF"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  moqMin: "",
  moqMax: "",
  priceMin: "",
  priceMax: "",
  originWilaya: "",
  supplierId: "",
  incoterm: "",
};
