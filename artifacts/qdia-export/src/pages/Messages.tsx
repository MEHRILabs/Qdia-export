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
      <div className="min-h-screen flex">
        <SupplierSidebar activePath="/messages" />
        <main className="flex-1 flex flex-col">
          <div className="p-4 border-b bg-card">
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
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 flex flex-col">
        <div className="p-4 md:p-6 border-b bg-white">
          <h1 className="text-xl font-black flex items-center gap-2 text-[#073B74]">
            <MessageSquare className="h-6 w-6 text-[#0461A5]" /> {tr("messages.title")}
          </h1>
        </div>
        <MessagesPanel />
      </main>
      <BuyerFooter />
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
