import { useCallback, useState, useEffect } from "react";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { platformApi } from "@/lib/platform-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MessageSquare, Wifi, WifiOff } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const { tr } = useI18n();
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [typingFrom, setTypingFrom] = useState<number | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const userId = new URLSearchParams(window.location.search).get("user");
    if (userId) {
      const id = parseInt(userId, 10);
      if (id > 0) setPartnerId(id);
    }
  }, []);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["message-threads"] });
    if (partnerId != null) qc.invalidateQueries({ queryKey: ["message-thread", partnerId] });
  }, [qc, partnerId]);

  const { connected } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === "message:new" || msg.type === "message:sent") refresh();
      if (msg.type === "typing") setTypingFrom(msg.sender_id);
    },
    onPoll: refresh,
  });

  const { data: threads } = useQuery({
    queryKey: ["message-threads"],
    queryFn: () => platformApi.getMessageThreads(),
    refetchInterval: connected ? false : 15000,
  });

  const { data: thread } = useQuery({
    queryKey: ["message-thread", partnerId],
    queryFn: () => platformApi.getMessageThread(partnerId!),
    enabled: partnerId != null,
    refetchInterval: connected ? false : 10000,
  });

  const send = async () => {
    if (!partnerId || !body.trim()) return;
    await platformApi.sendMessage(partnerId, body.trim());
    setBody("");
    refresh();
  };

  return (
    <div className="min-h-screen flex">
      <SupplierSidebar activePath="/messages" />
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-0px)]">
        <aside className="w-full md:w-72 border-r bg-[#FAFBFC] overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> {tr("messages.conversations")}</h1>
            <Badge variant="outline" className="text-[10px] gap-1">
              {connected ? <Wifi className="h-3 w-3 text-green-600" /> : <WifiOff className="h-3 w-3" />}
              {connected ? tr("messages.live") : tr("messages.polling")}
            </Badge>
          </div>
          {threads?.data?.map(t => (
            <button
              key={t.partner_id}
              type="button"
              onClick={() => setPartnerId(t.partner_id)}
              className={`w-full text-left p-4 border-b hover:bg-white transition-colors ${partnerId === t.partner_id ? "bg-white border-l-4 border-l-[#0461A5]" : ""}`}
            >
              <p className="font-semibold text-sm truncate">{t.partner_name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{t.last_message}</p>
              {t.unread > 0 && <span className="text-[10px] bg-[#0461A5] text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">{t.unread}</span>}
            </button>
          ))}
          {!threads?.data?.length && <p className="p-4 text-sm text-muted-foreground">{tr("messages.no_messages")}</p>}
        </aside>
        <section className="flex-1 flex flex-col">
          {partnerId ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread?.data?.map(m => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] p-3 rounded-xl text-sm ${m.sender_id === user?.id ? "bg-[#0461A5] text-white ml-auto" : "bg-gray-100 mr-auto"}`}
                  >
                    {m.body}
                    <p className={`text-[10px] mt-1 ${m.sender_id === user?.id ? "text-white/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
                {typingFrom === partnerId && (
                  <p className="text-xs text-muted-foreground italic">{tr("messages.typing")}</p>
                )}
              </div>
              <div className="p-4 border-t flex gap-2">
                <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder={tr("messages.placeholder")} rows={2} className="flex-1" />
                <Button onClick={() => void send()} disabled={!body.trim()}>{tr("common.send")}</Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {tr("messages.select_conversation")}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
