import { Link, useRoute } from "wouter";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { useI18n } from "@/contexts/I18nContext";

const PAGE_KEYS = ["cgu", "confidentialite", "cookies"] as const;

export default function Legal() {
  const { tr } = useI18n();
  const [, params] = useRoute("/legal/:page?");
  const page = (params?.page ?? "cgu") as typeof PAGE_KEYS[number];
  const safePage = PAGE_KEYS.includes(page) ? page : "cgu";

  const tabLabel = (k: typeof PAGE_KEYS[number]) =>
    k === "cgu" ? tr("legal_page.cgu_tab") : k === "confidentialite" ? tr("legal_page.privacy_tab") : tr("legal_page.cookies_tab");

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-8 max-w-3xl mx-auto">
        <div className="flex gap-4 mb-6 text-sm">
          {PAGE_KEYS.map(k => (
            <Link key={k} href={`/legal/${k}`} className={safePage === k ? "font-bold text-[#0461A5]" : "text-muted-foreground hover:underline"}>
              {tabLabel(k)}
            </Link>
          ))}
        </div>
        <h1 className="text-2xl font-black mb-4">{tr(`legal_page.${safePage}_title`)}</h1>
        <p className="text-[#334257] leading-relaxed">{tr(`legal_page.${safePage}_body`)}</p>
      </main>
      <BuyerFooter />
    </div>
  );
}
