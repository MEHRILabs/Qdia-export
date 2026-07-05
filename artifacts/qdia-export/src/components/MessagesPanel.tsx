import { useCallback, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { platformApi } from "@/lib/platform-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { isAdmin } from "@/lib/roles";
import { MessageSquare, Wifi, WifiOff, Plus, Search, Loader2, Send } from "lucide-react";

interface Props {
  initialPartnerId?: number | null;
  initialRfqId?: number | null;
  compact?: boolean;
}

export function MessagesPanel({ initialPartnerId = null, initialRfqId = null, compact = false }: Props) {
  const { user } = useAuth();
  const { tr } = useI18n();
  const { toast } = useToast();
  const [partnerId, setPartnerId] = useState<number | null>(initialPartnerId);
  const [rfqId, setRfqId] = useState<number | null>(initialRfqId);
  const [body, setBody] = useState("");
  const [typingFrom, setTypingFrom] = useState<number | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user");
    const rfqParam = params.get("rfq");
    if (userParam) {
      const id = parseInt(userParam, 10);
      if (id > 0) setPartnerId(id);
    }
    if (rfqParam) {
      const id = parseInt(rfqParam, 10);
      if (id > 0) setRfqId(id);
    }
  }, []);

  useEffect(() => {
    if (initialPartnerId != null) setPartnerId(initialPartnerId);
    if (initialRfqId != null) setRfqId(initialRfqId);
  }, [initialPartnerId, initialRfqId]);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["message-threads"] });
    qc.invalidateQueries({ queryKey: ["message-contacts"] });
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
    enabled: !!user,
    refetchInterval: connected ? 5000 : 8000,
  });

  const { data: contacts } = useQuery({
    queryKey: ["message-contacts"],
    queryFn: () => platformApi.getMessageContacts(),
    enabled: !!user,
  });

  const { data: partnerInfo, isError: partnerError, isLoading: partnerLoading } = useQuery({
    queryKey: ["message-partner", partnerId],
    queryFn: () => platformApi.getMessagePartner(partnerId!),
    enabled: partnerId != null && !!user,
    retry: false,
  });

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["message-thread", partnerId],
    queryFn: () => platformApi.getMessageThread(partnerId!),
    enabled: partnerId != null && !!user,
    refetchInterval: connected ? 3000 : 6000,
  });

  const filteredContacts = useMemo(() => {
    const list = contacts?.data ?? [];
    const q = contactSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.company?.toLowerCase().includes(q),
    );
  }, [contacts, contactSearch]);

  const activePartnerName = useMemo(() => {
    if (partnerInfo?.name) return partnerInfo.name;
    const fromThread = threads?.data?.find(t => t.partner_id === partnerId);
    return fromThread?.partner_name ?? (partnerId ? `#${partnerId}` : "");
  }, [partnerInfo, threads, partnerId]);

  const send = async () => {
    if (!partnerId || !body.trim() || sending) return;
    setSending(true);
    try {
      await platformApi.sendMessage(partnerId, body.trim(), rfqId ?? undefined);
      setBody("");
      toast({ title: tr("messages.sent_ok") });
      refresh();
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const startChat = (contactId: number) => {
    setPartnerId(contactId);
    setShowContacts(false);
    setContactSearch("");
  };

  if (!user) {
    return <p className="p-4 text-sm text-muted-foreground">{tr("messages.login_required")}</p>;
  }

  return (
    <div className={`flex flex-col md:flex-row ${compact ? "h-[560px]" : "h-full min-h-[calc(100vh-120px)]"}`}>
      <aside className={`w-full md:w-80 border-r bg-[#FAFBFC] flex flex-col ${compact ? "max-h-[220px] md:max-h-none" : ""}`}>
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" /> {tr("messages.conversations")}
            </h2>
            <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
              {connected ? <Wifi className="h-3 w-3 text-green-600" /> : <WifiOff className="h-3 w-3" />}
              {connected ? tr("messages.live") : tr("messages.polling")}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-xs"
            onClick={() => setShowContacts(v => !v)}
          >
            <Plus className="h-3.5 w-3.5" /> {tr("messages.new_conversation")}
          </Button>
          {showContacts && (
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 text-xs"
                  placeholder={tr("messages.search_contact")}
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => startChat(c.id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#F0F4FF] border-b last:border-b-0"
                  >
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-muted-foreground truncate">
                      {c.role === "supplier" ? tr("messages.role_supplier") : tr("messages.role_buyer")}
                      {c.company ? ` · ${c.company}` : ""}
                    </p>
                  </button>
                ))}
                {!filteredContacts.length && (
                  <p className="p-3 text-xs text-muted-foreground">{tr("messages.no_contacts")}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads?.data?.map(t => (
            <button
              key={t.partner_id}
              type="button"
              onClick={() => setPartnerId(t.partner_id)}
              className={`w-full text-left p-3 border-b hover:bg-white transition-colors ${partnerId === t.partner_id ? "bg-white border-l-4 border-l-[#0461A5]" : ""}`}
            >
              <div className="flex items-center justify-between gap-1">
                <p className="font-semibold text-sm truncate">{t.partner_name}</p>
                {t.partner_role && (
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {t.partner_role === "supplier" ? "🇩🇿" : t.partner_role === "admin" ? "Admin" : "Buyer"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{t.last_message}</p>
              {t.unread > 0 && (
                <span className="text-[10px] bg-[#0461A5] text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">{t.unread}</span>
              )}
            </button>
          ))}
          {!threads?.data?.length && !showContacts && (
            <p className="p-4 text-sm text-muted-foreground">{tr("messages.no_messages")}</p>
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-h-0 bg-white">
        {partnerId ? (
          <>
            <div className="px-4 py-3 border-b bg-[#FAFBFC]">
              <p className="font-bold text-sm">{activePartnerName}</p>
              {partnerInfo?.email && (
                <p className="text-xs text-muted-foreground">{partnerInfo.email}</p>
              )}
              {partnerLoading && (
                <p className="text-xs text-muted-foreground">{tr("common.loading")}</p>
              )}
              {partnerError && (
                <p className="text-xs text-red-600">{tr("messages.partner_not_found")}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {thread?.data?.map(m => (
                <div
                  key={m.id}
                  className={`max-w-[85%] p-3 rounded-xl text-sm ${m.sender_id === user?.id ? "bg-[#0461A5] text-white ml-auto" : "bg-gray-100 mr-auto"}`}
                >
                  {m.body}
                  <p className={`text-[10px] mt-1 ${m.sender_id === user?.id ? "text-white/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))}
              {!thread?.data?.length && !threadLoading && (
                <p className="text-sm text-muted-foreground text-center py-8">{tr("messages.start_conversation")}</p>
              )}
              {typingFrom === partnerId && (
                <p className="text-xs text-muted-foreground italic">{tr("messages.typing")}</p>
              )}
            </div>
            <div className="p-4 border-t flex gap-2">
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={tr("messages.placeholder")}
                rows={2}
                className="flex-1"
                disabled={sending}
              />
              <Button onClick={() => void send()} disabled={!body.trim() || sending || partnerError || partnerLoading} className="gap-1">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {tr("common.send")}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3 p-6 text-center">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p>{tr("messages.select_conversation")}</p>
            {isAdmin(user) && (
              <Button size="sm" variant="outline" onClick={() => setShowContacts(true)}>
                <Plus className="h-4 w-4 mr-1" /> {tr("messages.new_conversation")}
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
