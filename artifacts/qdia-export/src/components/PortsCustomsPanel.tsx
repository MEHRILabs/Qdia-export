import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Ship, Globe, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logisticsApi, type CustomsCalcResult } from "@/lib/api-auth";
import { PortsMap } from "@/components/PortsMap";
import { FALLBACK_PORTS_GROUPED, toMapMarkers } from "@/lib/ports-data";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  productCategory?: string;
  portDepart?: string;
  fobPrice?: number;
  compact?: boolean;
  showPricing?: boolean;
  /** Carte animée pleine largeur (accueil) — moins de texte, plus visuel */
  variant?: "default" | "hero";
}

export function PortsCustomsPanel({
  productCategory = "Agriculture & Food",
  portDepart,
  fobPrice = 50000,
  compact,
  showPricing = false,
  variant = "default",
}: Props) {
  const { tr } = useI18n();
  const isHero = variant === "hero";
  const [ports, setPorts] = useState(FALLBACK_PORTS_GROUPED);
  const [destination, setDestination] = useState<"FR" | "AE" | "DZ" | "TN">("FR");
  const [customs, setCustoms] = useState<CustomsCalcResult | null>(null);
  const [loading, setLoading] = useState(false);

  const destinations = useMemo(() => [
    { code: "DZ" as const, label: "🇩🇿 Algérie", port: "DZALG" },
    { code: "TN" as const, label: "🇹🇳 Tunisie", port: "TNRDS" },
    { code: "FR" as const, label: "🇫🇷 France", port: "FRMRS" },
    { code: "AE" as const, label: "🇦🇪 UAE", port: "AEDXB" },
  ], []);

  useEffect(() => {
    logisticsApi.getPorts()
      .then(r => {
        if (r.grouped?.algeria?.length) setPorts(r.grouped);
      })
      .catch(() => setPorts(FALLBACK_PORTS_GROUPED));
  }, []);

  const allPorts = useMemo(
    () => [...ports.algeria, ...ports.international],
    [ports],
  );

  const mapMarkers = useMemo(() => toMapMarkers(allPorts), [allPorts]);

  const calcCustoms = async (dest: string, portCode?: string) => {
    if (!showPricing) return;
    setLoading(true);
    try {
      const cifEstimate = fobPrice * 1.15;
      const result = await logisticsApi.calculateCustoms({
        product_category: productCategory,
        destination_code: dest,
        cif_value_dzd: cifEstimate,
        port_code: portCode,
      });
      setCustoms(result);
    } catch {
      setCustoms(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!showPricing) {
      setCustoms(null);
      return;
    }
    const dest = destinations.find(d => d.code === destination);
    const port = ports.algeria.find(p =>
      portDepart && (p.name.includes(portDepart) || p.city.includes(portDepart)),
    )?.code ?? dest?.port;
    void calcCustoms(destination, port);
  }, [destination, productCategory, portDepart, fobPrice, ports, destinations, showPricing]);

  if (isHero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl overflow-hidden border border-[#0461A5]/15 bg-gradient-to-br from-[#f0f7ff] via-white to-[#fffbeb] shadow-lg"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#0461A5]/10"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[#F5C518]/15"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          />
        </div>

        <div className="relative p-4 md:p-6 space-y-4">
          <PortsMap
            markers={mapMarkers}
            height={compact ? 200 : 280}
            highlightCountry={destination}
            animated
          />

          <div className="flex flex-wrap justify-center gap-2">
            {destinations.map(d => (
              <motion.div key={d.code} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  size="sm"
                  variant={destination === d.code ? "default" : "outline"}
                  className={`rounded-full px-4 ${destination === d.code ? "bg-[#0461A5] shadow-md" : "bg-white/80"}`}
                  onClick={() => setDestination(d.code)}
                >
                  {d.label}
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-[#656566] flex items-center justify-center gap-2">
            <Ship className="h-3.5 w-3.5 text-[#0461A5]" />
            {tr("customs_panel.pricing_at_order")}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`rounded-xl border border-[#0461A5]/20 bg-white ${compact ? "p-4" : "p-5"} space-y-4`}>
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-[#0461A5]" />
        <h3 className="font-bold text-[#073B74]">{tr("customs_panel.title")}</h3>
      </div>

      <PortsMap markers={mapMarkers} height={compact ? 180 : 240} highlightCountry={destination} />

      <div className="flex flex-wrap gap-2">
        {destinations.map(d => (
          <Button
            key={d.code}
            type="button"
            size="sm"
            variant={destination === d.code ? "default" : "outline"}
            className={destination === d.code ? "bg-[#0461A5]" : ""}
            onClick={() => setDestination(d.code)}
          >
            {d.label}
          </Button>
        ))}
      </div>

      {!showPricing && (
        <p className="text-xs text-[#656566] bg-[#F0F4FF] rounded-lg p-3 flex items-start gap-2">
          <FileCheck className="h-4 w-4 text-[#0461A5] shrink-0 mt-0.5" />
          {tr("customs_panel.pricing_at_order")}
        </p>
      )}

      {showPricing && customs && (
        <div className="bg-[#F0F4FF] rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold text-[#073B74] flex items-center gap-1">
            <FileCheck className="h-4 w-4" /> {tr("customs_panel.customs_for").replace("{country}", customs.destination_country)}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-[#9CA3AF]">{tr("customs_panel.duty")}</span><p className="font-bold">{customs.duty_dzd.toLocaleString()} DZD</p></div>
            <div><span className="text-[#9CA3AF]">{tr("customs_panel.vat")}</span><p className="font-bold">{customs.vat_dzd.toLocaleString()} DZD</p></div>
            <div><span className="text-[#9CA3AF]">{tr("customs_panel.customs_fee")}</span><p className="font-bold">{customs.customs_fee_dzd.toLocaleString()} DZD</p></div>
            <div><span className="text-[#9CA3AF]">{tr("customs_panel.documents")}</span><p className="font-bold">{customs.documentation_fee_dzd.toLocaleString()} DZD</p></div>
          </div>
          <p className="text-[#0461A5] font-black">
            {tr("customs_panel.total")} : {customs.total_customs_dzd.toLocaleString()} DZD
          </p>
          {customs.notes && <p className="text-[11px] text-[#656566] italic">{customs.notes}</p>}
          {customs.hs_code && <p className="text-[10px] text-[#9CA3AF]">{tr("customs_panel.hs_code")} : {customs.hs_code}</p>}
        </div>
      )}
      {showPricing && loading && <p className="text-xs text-[#9CA3AF]">{tr("customs_panel.calculating")}</p>}
    </div>
  );
}
