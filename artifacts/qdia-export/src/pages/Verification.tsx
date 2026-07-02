import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { ShieldCheck, CheckCircle2, Clock, Award, Loader2 } from "lucide-react";

export default function Verification() {
  const { tr } = useI18n();
  const [data, setData] = useState<Awaited<ReturnType<typeof platformApi.verificationStatus>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.verificationStatus()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const progress = data?.progress_pct ?? 0;
  const badge = data?.badge ?? "Bronze";

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <SupplierSidebar activePath="/verification" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tr("verification_page.title")}</h1>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mt-1">
                {tr("verification_page.level").replace("{level}", String(data?.level ?? 0)).replace("{badge}", badge)}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {tr("verification_page.subtitle")}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">{tr("verification_page.progress_title")}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">{tr("verification_page.completed").replace("{pct}", String(progress))}</p>
              </CardContent>
            </Card>

            <div className="space-y-3 mb-8">
              {(data?.steps ?? []).map(step => (
                <div key={step.id} className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.done ? tr("verification_page.validated") : tr("verification_page.in_progress")}</div>
                  </div>
                </div>
              ))}
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">{tr("verification_page.badge_title").replace("{badge}", badge)}</p>
                    <p className="text-xs text-muted-foreground">{tr("verification_page.badge_desc")}</p>
                  </div>
                </div>
                <Button asChild><Link href="/agent-ia">{tr("verification_page.publish_product")}</Link></Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
