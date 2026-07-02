import { useState } from "react";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { registerWebPush } from "@/lib/firebase";
import { useI18n } from "@/contexts/I18nContext";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tr } = useI18n();
  const [name, setName] = useState(user?.name ?? "");
  const [company, setCompany] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await platformApi.updateProfile({ name, company_name: company, wilaya });
      toast({ title: tr("profile_page.updated") });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (plan: "bronze" | "gold") => {
    try {
      const r = await platformApi.subscriptionCheckout(plan);
      if (r.url) window.location.href = r.url;
      else toast({ title: tr("profile_page.subscription_activated").replace("{tier}", r.tier) });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  const enablePush = async () => {
    const ok = await registerWebPush();
    toast({ title: ok ? tr("profile_page.notifications_on") : tr("profile_page.notifications_off"), variant: ok ? "default" : "destructive" });
  };

  return (
    <div className="min-h-screen flex">
      <SupplierSidebar activePath="/profile" />
      <main className="flex-1 p-8 max-w-lg space-y-8">
        <section>
          <h1 className="text-2xl font-bold mb-6">{tr("profile.title")}</h1>
          <div className="space-y-4">
            <div><Label>{tr("profile.name")}</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>{tr("profile.company")}</Label><Input value={company} onChange={e => setCompany(e.target.value)} placeholder={tr("profile_page.company_placeholder")} /></div>
            <div><Label>{tr("profile.wilaya")}</Label><Input value={wilaya} onChange={e => setWilaya(e.target.value)} placeholder={tr("profile_page.wilaya_placeholder")} /></div>
            <p className="text-xs text-muted-foreground">Email: {user?.email ?? "—"} · Rôle: {user?.role} · Tier: {(user as { subscription_tier?: string })?.subscription_tier ?? "bronze"}</p>
            <Button onClick={save} disabled={loading} className="w-full">{tr("common.save")}</Button>
          </div>
        </section>

        <section className="border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">{tr("profile_page.subscriptions")}</h2>
          <Button variant="outline" className="w-full" onClick={() => subscribe("bronze")}>{tr("profile.subscription_bronze")}</Button>
          <Button className="w-full" onClick={() => subscribe("gold")}>{tr("profile.subscription_gold")}</Button>
        </section>

        <section className="border rounded-xl p-4">
          <Button variant="secondary" className="w-full" onClick={enablePush}>{tr("profile.enable_notifications")}</Button>
        </section>
      </main>
    </div>
  );
}
