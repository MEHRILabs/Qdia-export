import { useEffect, useState, useMemo } from "react";
import { Ship, Globe, FileCheck, Calculator, Anchor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logisticsApi, type PortInfo, type CustomsCalcResult } from "@/lib/api-auth";
import { PortsMap } from "@/components/PortsMap";
import { FALLBACK_PORTS_GROUPED, toMapMarkers } from "@/lib/ports-data";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  productCategory: string;
  portDepart?: string;
  fobPrice?: number;
  compact?: boolean;
}

export function PortsCustomsPanel({ productCategory, portDepart, fobPrice = 50000, compact }: Props) {
  const { tr } = useI18n();
  const [ports, setPorts] = useState<{ algeria: PortInfo[]; international: PortInfo[] }>(FALLBACK_PORTS_GROUPED);
  const [destination, setDestination] = useState<"FR" | "AE" | "DZ">("FR");
  const [customs, setCustoms] = useState<CustomsCalcResult | null>(null);
  const [loading, setLoading] = useState(false);

  const destinations = useMemo(() => [
    { code: "FR" as const, label: `${tr("customs_panel.dest_fr")} 🇫🇷`, port: "FRMRS" },
    { code: "AE" as const, label: `${tr("customs_panel.dest_ae")} 🇦🇪`, port: "AEDXB" },
    { code: "DZ" as const, label: `${tr("customs_panel.dest_dz")} 🇩🇿`, port: "DZALG" },
  ], [tr]);

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
    const dest = destinations.find(d => d.code === destination);
    const port = ports.algeria.find(p =>
      portDepart && (p.name.includes(portDepart) || p.city.includes(portDepart)),
    )?.code ?? dest?.port;
    calcCustoms(destination, port);
  }, [destination, productCategory, portDepart, fobPrice, ports, destinations]);

  return (
    <div className={`rounded-xl border border-[#0461A5]/20 bg-white ${compact ? "p-4" : "p-5"} space-y-4`}>
      <div className="flex items-center gap-2">
        <Anchor className="h-5 w-5 text-[#0461A5]" />
        <h3 className="font-bold text-[#073B74]">{tr("customs_panel.title")}</h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold text-[#0461A5] uppercase tracking-wide mb-2 flex items-center gap-1">
            <Ship className="h-3.5 w-3.5" /> {tr("customs_panel.algeria_ports")} 🇩🇿
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ports.algeria.map(p => (
              <Badge key={p.code} variant="outline" className="text-[11px] border-[#0461A5]/30 text-[#0461A5]">
                {p.city} · {p.code}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-[#334257] uppercase tracking-wide mb-2 flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" /> {tr("customs_panel.intl_ports")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ports.international.map(p => (
              <Badge key={p.code} variant="secondary" className="text-[11px]">
                {p.country} — {p.city}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <PortsMap markers={mapMarkers} height={compact ? 180 : 240} />

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

      {customs && (
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
          <p className="text-[#0461A5] font-black flex items-center gap-1">
            <Calculator className="h-4 w-4" />
            {tr("customs_panel.total")} : {customs.total_customs_dzd.toLocaleString()} DZD
          </p>
          {customs.notes && <p className="text-[11px] text-[#656566] italic">{customs.notes}</p>}
          {customs.hs_code && <p className="text-[10px] text-[#9CA3AF]">{tr("customs_panel.hs_code")} : {customs.hs_code}</p>}
        </div>
      )}
      {loading && <p className="text-xs text-[#9CA3AF]">{tr("customs_panel.calculating")}</p>}
    </div>
  );
}
