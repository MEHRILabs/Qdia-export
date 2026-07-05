import { useCallback, useState, useEffect, useMemo, useRef } from "react";
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
import { MessageSquare, Wifi, WifiOff, Plus, Search, Loader2, Send } from "lucide-react";

type MessageRow = {
  id: number;
  sender_id: number;
  receiver_id?: number;
  body: string;
  created_at: string;
};

type SidebarItem = {
  partner_id: number;
  partner_name: string;
  partner_role?: string;
  last_message: string;
  last_at: string | null;
  unread: number;
};

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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const refresh = useCallback(async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ["message-threads"] }),
      qc.refetchQueries({ queryKey: ["message-contacts"] }),
      partnerId != null ? qc.refetchQueries({ queryKey: ["message-thread", partnerId] }) : Promise.resolve(),
    ]);
  }, [qc, partnerId]);

  const { connected } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === "message:new" || msg.type === "message:sent") void refresh();
      if (msg.type === "typing") setTypingFrom(msg.sender_id);
    },
    onPoll: () => void refresh(),
  });

  const { data: threads } = useQuery({
    queryKey: ["message-threads"],
    queryFn: () => platformApi.getMessageThreads(),
    enabled: !!user,
    refetchInterval: 4000,
    staleTime: 0,
  });

  const { data: contacts } = useQuery({
    queryKey: ["message-contacts"],
    queryFn: () => platformApi.getMessageContacts(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: partnerInfo } = useQuery({
    queryKey: ["message-partner", partnerId],
    queryFn: () => platformApi.getMessagePartner(partnerId!),
    enabled: partnerId != null && !!user,
    retry: 1,
  });

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["message-thread", partnerId],
    queryFn: () => platformApi.getMessageThread(partnerId!),
    enabled: partnerId != null && !!user,
    refetchInterval: 3000,
    staleTime: 0,
  });

  const messages = (thread?.data ?? []) as MessageRow[];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, partnerId]);

  const sidebarItems = useMemo(() => {
    const map = new Map<number, SidebarItem>();
    for (const t of threads?.data ?? []) {
      map.set(t.partner_id, {
        partner_id: t.partner_id,
        partner_name: t.partner_name,
        partner_role: t.partner_role,
        last_message: t.last_message,
        last_at: t.last_at,
        unread: t.unread,
      });
    }
    for (const c of contacts?.data ?? []) {
      if (!map.has(c.id)) {
        map.set(c.id, {
          partner_id: c.id,
          partner_name: c.name,
          partner_role: c.role,
          last_message: c.role === "admin" ? tr("messages.admin_support") : tr("messages.new_contact"),
          last_at: null,
          unread: 0,
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.partner_role === "admin" && b.partner_role !== "admin") return -1;
      if (b.partner_role === "admin" && a.partner_role !== "admin") return 1;
      return (b.last_at ?? "").localeCompare(a.last_at ?? "");
    });
  }, [threads, contacts, tr]);

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
    const fromSidebar = sidebarItems.find(t => t.partner_id === partnerId);
    return fromSidebar?.partner_name ?? (partnerId ? `#${partnerId}` : "");
  }, [partnerInfo, sidebarItems, partnerId]);

  const roleLabel = (role?: string) => {
    if (role === "admin") return tr("messages.role_admin");
    if (role === "supplier") return tr("messages.role_supplier");
    return tr("messages.role_buyer");
  };

  const send = async () => {
    if (!partnerId || !body.trim() || sending) return;
    const text = body.trim();
    setSending(true);
    try {
      const msg = await platformApi.sendMessage(partnerId, text, rfqId ?? undefined);
      setBody("");
      qc.setQueryData<{ data: MessageRow[] }>(["message-thread", partnerId], old => ({
        data: [...(old?.data ?? []), msg as MessageRow],
      }));
      await refresh();
      toast({ title: tr("messages.sent_ok") });
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
                      {roleLabel(c.role)}
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
          {sidebarItems.map(t => (
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
                    {t.partner_role === "admin" ? "Admin" : t.partner_role === "supplier" ? "🇩🇿" : "Buyer"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{t.last_message}</p>
              {t.unread > 0 && (
                <span className="text-[10px] bg-[#0461A5] text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">{t.unread}</span>
              )}
            </button>
          ))}
          {!sidebarItems.length && !showContacts && (
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
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadLoading && !messages.length && (
                <p className="text-sm text-muted-foreground text-center py-8">{tr("common.loading")}</p>
              )}
              {messages.map(m => (
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
              {!messages.length && !threadLoading && (
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
              <Button onClick={() => void send()} disabled={!body.trim() || sending} className="gap-1 shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {tr("common.send")}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3 p-6 text-center">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p>{tr("messages.select_conversation")}</p>
            <Button size="sm" variant="outline" onClick={() => setShowContacts(true)}>
              <Plus className="h-4 w-4 mr-1" /> {tr("messages.new_conversation")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
