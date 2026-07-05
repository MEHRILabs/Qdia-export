import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { MessagesPanel } from "@/components/MessagesPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { isSupplier } from "@/lib/roles";
import { MessageSquare } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function MessagesContent() {
  const { user } = useAuth();
  const { tr } = useI18n();
  const supplierLayout = isSupplier(user);

  if (supplierLayout) {
    return (
      <div className="h-dvh max-h-dvh flex flex-col md:flex-row overflow-hidden">
        <SupplierSidebar activePath="/messages" />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <header className="border-b bg-card h-14 flex items-center px-4 shrink-0 md:hidden">
            <Link href="/supplier" className="font-bold text-sm text-primary">
              {tr("mobile.brand_short")}
            </Link>
            <span className="mx-auto font-bold text-sm flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              {tr("messages.title")}
            </span>
            <span className="w-16" aria-hidden />
          </header>
          <div className="hidden md:block p-4 border-b bg-card shrink-0">
            <h1 className="font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> {tr("messages.title")}
            </h1>
          </div>
          <MessagesPanel />
        </main>
      </div>
    );
  }

  return (
    <div className="h-dvh max-h-dvh qdia-buyer-page flex flex-col overflow-hidden">
      <BuyerHeader />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="hidden md:flex p-6 border-b bg-white shrink-0">
          <h1 className="text-xl font-black flex items-center gap-2 text-[#073B74]">
            <MessageSquare className="h-6 w-6 text-[#0461A5]" /> {tr("messages.title")}
          </h1>
        </div>
        <MessagesPanel />
      </main>
      <div className="hidden md:block shrink-0">
        <BuyerFooter />
      </div>
    </div>
  );
}

export default function Messages() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  );
}
