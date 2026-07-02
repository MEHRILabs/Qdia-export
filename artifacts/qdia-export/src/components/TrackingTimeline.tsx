import { CheckCircle2, Circle, Package, Ship, Truck } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  status: string;
  trackingNumber?: string | null;
}

export function TrackingTimeline({ status, trackingNumber }: Props) {
  const { tr } = useI18n();
  const steps = [
    { key: "accepted", label: tr("tracking.step_accepted"), icon: CheckCircle2 },
    { key: "funded", label: tr("tracking.step_funded"), icon: Circle },
    { key: "shipped", label: tr("tracking.step_shipped"), icon: Truck },
    { key: "delivered", label: tr("tracking.step_delivered"), icon: Package },
  ];
  const idx = status === "shipped" ? 2 : status === "accepted" ? 0 : status === "quoted" ? -1 : 1;

  return (
    <div className="mt-3 p-3 rounded-lg bg-[#F4F8FC] border border-[#0461A5]/15">
      <p className="text-xs font-bold text-[#073B74] mb-2 flex items-center gap-1">
        <Ship className="h-3.5 w-3.5" /> {tr("tracking.title")}
      </p>
      <div className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const done = i <= idx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center gap-2 text-xs">
              <Icon className={`h-4 w-4 shrink-0 ${done ? "text-[#04BB7B]" : "text-muted-foreground"}`} />
              <span className={done ? "font-semibold text-[#073B74]" : "text-muted-foreground"}>{step.label}</span>
            </div>
          );
        })}
      </div>
      {trackingNumber && (
        <p className="text-xs mt-2 font-mono bg-white rounded px-2 py-1 border">
          {tr("tracking.number")} <strong>{trackingNumber}</strong>
        </p>
      )}
    </div>
  );
}
