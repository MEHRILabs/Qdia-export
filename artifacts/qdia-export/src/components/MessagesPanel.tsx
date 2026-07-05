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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Wifi, WifiOff, Plus, Search, Loader2, Send,
  ChevronLeft, X, User,
} from "lucide-react";

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

const LOCALE_MAP = { fr: "fr-FR", en: "en-GB", ar: "ar-DZ" } as const;

function partnerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function avatarColor(role?: string) {
  if (role === "admin") return "bg-[#073B74] text-white";
  if (role === "supplier") return "bg-[#0461A5]/15 text-[#0461A5]";
  return "bg-gray-200 text-gray-700";
}

export function MessagesPanel({ initialPartnerId = null, initialRfqId = null, compact = false }: Props) {
  const { user } = useAuth();
  const { tr, locale } = useI18n();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [partnerId, setPartnerId] = useState<number | null>(initialPartnerId);
  const [rfqId, setRfqId] = useState<number | null>(initialRfqId);
  const [body, setBody] = useState("");
  const [typingFrom, setTypingFrom] = useState<number | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const dateLocale = LOCALE_MAP[locale] ?? "fr-FR";

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

  useEffect(() => {
    if (!isMobile || !partnerId) return;
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [isMobile, partnerId]);

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

  const filteredSidebarItems = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return sidebarItems;
    return sidebarItems.filter(t =>
      t.partner_name.toLowerCase().includes(q)
      || t.last_message.toLowerCase().includes(q),
    );
  }, [sidebarItems, listSearch]);

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

  const activePartner = useMemo(() => {
    const fromSidebar = sidebarItems.find(t => t.partner_id === partnerId);
    return {
      name: partnerInfo?.name ?? fromSidebar?.partner_name ?? (partnerId ? `#${partnerId}` : ""),
      role: partnerInfo?.role ?? fromSidebar?.partner_role,
      email: partnerInfo?.email,
    };
  }, [partnerInfo, sidebarItems, partnerId]);

  const formatTime = useCallback((iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return tr("messages.yesterday");
    return d.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
  }, [dateLocale, tr]);

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
      if (!isMobile) toast({ title: tr("messages.sent_ok") });
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

  const openChat = (contactId: number) => {
    setPartnerId(contactId);
    setShowContacts(false);
    setContactSearch("");
  };

  const backToList = () => {
    setPartnerId(null);
    setShowContacts(false);
  };

  const showList = !isMobile || partnerId == null;
  const showChat = !isMobile || partnerId != null;

  if (!user) {
    return <p className="p-4 text-sm text-muted-foreground">{tr("messages.login_required")}</p>;
  }

  const contactsOverlay = showContacts && (
    <div className={cn(
      "flex flex-col bg-white z-50",
      isMobile ? "fixed inset-0" : "absolute inset-x-0 top-full mt-1 border rounded-xl shadow-lg max-h-72",
    )}>
      <div className="flex items-center gap-2 p-3 border-b shrink-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowContacts(false)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-10 pl-9 rounded-full bg-gray-50 border-0"
            placeholder={tr("messages.search_contact")}
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            autoFocus={isMobile}
          />
        </div>
        {!isMobile && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowContacts(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => openChat(c.id)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 border-b last:border-b-0 text-left"
          >
            <div className={cn("h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0", avatarColor(c.role))}>
              {partnerInitials(c.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {roleLabel(c.role)}
                {c.company ? ` · ${c.company}` : ""}
              </p>
            </div>
          </button>
        ))}
        {!filteredContacts.length && (
          <p className="p-6 text-sm text-muted-foreground text-center">{tr("messages.no_contacts")}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "relative flex overflow-hidden bg-white",
      compact ? "h-[560px]" : "flex-1 min-h-0 w-full",
    )}>
      <aside className={cn(
        "flex flex-col bg-[#FAFBFC] border-r shrink-0",
        isMobile ? "w-full" : "w-80",
        !showList && "hidden",
        compact && !isMobile && "max-h-full",
      )}>
        <div className="relative p-3 border-b space-y-2.5 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold flex items-center gap-2 text-base md:text-sm">
              <MessageSquare className="h-5 w-5 md:h-4 md:w-4 text-[#0461A5]" />
              {tr("messages.conversations")}
            </h2>
            <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
              {connected ? <Wifi className="h-3 w-3 text-green-600" /> : <WifiOff className="h-3 w-3" />}
              {connected ? tr("messages.live") : tr("messages.polling")}
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-10 pl-9 rounded-full bg-gray-50 border-gray-200 text-sm"
              placeholder={tr("messages.search_conversations")}
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 h-10 md:h-8 text-sm md:text-xs rounded-full md:rounded-md border-[#0461A5]/30 text-[#0461A5] hover:bg-[#0461A5]/5"
            onClick={() => setShowContacts(v => !v)}
          >
            <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" /> {tr("messages.new_conversation")}
          </Button>

          {!isMobile && contactsOverlay}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filteredSidebarItems.map(t => (
            <button
              key={t.partner_id}
              type="button"
              onClick={() => openChat(t.partner_id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3.5 border-b transition-colors text-left active:bg-gray-100",
                "md:py-3 hover:bg-white",
                partnerId === t.partner_id && !isMobile && "bg-white border-l-4 border-l-[#0461A5]",
              )}
            >
              <div className={cn(
                "rounded-full flex items-center justify-center font-bold shrink-0",
                isMobile ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs",
                avatarColor(t.partner_role),
              )}>
                {partnerInitials(t.partner_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{t.partner_name}</p>
                  {t.last_at && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(t.last_at)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{t.last_message}</p>
                  {t.unread > 0 && (
                    <span className="text-[10px] bg-[#0461A5] text-white min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shrink-0 font-bold">
                      {t.unread > 9 ? "9+" : t.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {!filteredSidebarItems.length && !showContacts && (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {listSearch ? tr("messages.no_search_results") : tr("messages.no_messages")}
              </p>
              {!listSearch && (
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setShowContacts(true)}>
                  <Plus className="h-4 w-4 mr-1" /> {tr("messages.new_conversation")}
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>

      {isMobile && contactsOverlay}

      <section className={cn(
        "flex-1 flex flex-col min-h-0 min-w-0 bg-[#ECEFF1]",
        !showChat && "hidden md:flex",
      )}>
        {partnerId ? (
          <>
            <div className="px-3 py-2.5 md:px-4 md:py-3 border-b bg-white flex items-center gap-2 shrink-0 shadow-sm">
              {isMobile && (
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-1" onClick={backToList} aria-label={tr("common.back")}>
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              <div className={cn(
                "rounded-full flex items-center justify-center font-bold shrink-0",
                isMobile ? "h-10 w-10 text-sm" : "h-9 w-9 text-xs",
                avatarColor(activePartner.role),
              )}>
                {partnerInitials(activePartner.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{activePartner.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activePartner.role ? roleLabel(activePartner.role) : activePartner.email}
                </p>
              </div>
              {activePartner.role && (
                <Badge variant="secondary" className="text-[10px] shrink-0 hidden sm:flex">
                  {activePartner.role === "admin" ? "Admin" : activePartner.role === "supplier" ? "🇩🇿 Export" : "Buyer"}
                </Badge>
              )}
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:p-4 space-y-2 md:space-y-3"
            >
              {threadLoading && !messages.length && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {messages.map(m => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[88%] md:max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[15px] md:text-sm leading-relaxed shadow-sm",
                      mine
                        ? "bg-[#0461A5] text-white rounded-br-md"
                        : "bg-white text-gray-900 rounded-bl-md",
                    )}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={cn(
                        "text-[10px] mt-1 text-right",
                        mine ? "text-white/60" : "text-muted-foreground",
                      )}>
                        {new Date(m.created_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {!messages.length && !threadLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2 px-6">
                  <User className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{tr("messages.start_conversation")}</p>
                </div>
              )}
              {typingFrom === partnerId && (
                <p className="text-xs text-muted-foreground italic px-2">{tr("messages.typing")}</p>
              )}
            </div>

            <div className="border-t bg-white px-2 py-2 md:p-4 flex items-end gap-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <Textarea
                ref={inputRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={tr("messages.placeholder")}
                rows={1}
                className={cn(
                  "flex-1 resize-none rounded-2xl border-gray-200 bg-gray-50",
                  "min-h-[44px] max-h-32 py-3 px-4 text-base md:text-sm",
                )}
                disabled={sending}
              />
              <Button
                onClick={() => void send()}
                disabled={!body.trim() || sending}
                size="icon"
                className={cn(
                  "shrink-0 rounded-full bg-[#0461A5] hover:bg-[#073B74]",
                  isMobile ? "h-11 w-11" : "h-10 w-10 md:h-auto md:w-auto md:rounded-md md:px-4",
                )}
              >
                {sending
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : isMobile
                    ? <Send className="h-5 w-5" />
                    : <><Send className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{tr("common.send")}</span></>}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-muted-foreground text-sm gap-3 p-6 text-center bg-white">
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
