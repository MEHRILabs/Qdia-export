import { useCallback, useEffect, useRef, useState } from "react";
import { platformApi } from "@/lib/platform-api";

export type WsMessage =
  | { type: "connected"; user_id: number }
  | { type: "message:new"; message: { id: number; sender_id: number; receiver_id: number; body: string; created_at: string; rfq_id?: number | null } }
  | { type: "message:sent"; message: { id: number; sender_id: number; receiver_id: number; body: string; created_at: string } }
  | { type: "order:update"; order: Record<string, unknown> }
  | { type: "dispute:update"; dispute: Record<string, unknown> }
  | { type: "typing"; sender_id: number };

type UseWebSocketOptions = {
  enabled?: boolean;
  onMessage?: (msg: WsMessage) => void;
  pollIntervalMs?: number;
  onPoll?: () => void;
};

export function useWebSocket({ enabled = true, onMessage, pollIntervalMs = 30000, onPoll }: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const connectedRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onPollRef = useRef(onPoll);
  onMessageRef.current = onMessage;
  onPollRef.current = onPoll;

  const sendTyping = useCallback((receiverId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", receiver_id: receiverId }));
    }
  }, []);

  useEffect(() => {
    if (!enabled || !localStorage.getItem("qdia_auth_token")) {
      setConnected(false);
      connectedRef.current = false;
      return;
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      try {
        const ws = new WebSocket(platformApi.webSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          connectedRef.current = true;
          setConnected(true);
        };
        ws.onclose = () => {
          connectedRef.current = false;
          setConnected(false);
          wsRef.current = null;
          if (!closed) reconnectTimer = setTimeout(connect, 4000);
        };
        ws.onerror = () => ws.close();
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as WsMessage;
            onMessageRef.current?.(msg);
          } catch { /* ignore */ }
        };
      } catch {
        connectedRef.current = false;
        setConnected(false);
        if (!closed) reconnectTimer = setTimeout(connect, 4000);
      }
    };

    connect();

    const pollTimer = setInterval(() => {
      if (!connectedRef.current && onPollRef.current) onPollRef.current();
    }, pollIntervalMs);

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      clearInterval(pollTimer);
      wsRef.current?.close();
      wsRef.current = null;
      connectedRef.current = false;
      setConnected(false);
    };
  }, [enabled, pollIntervalMs]);

  return { connected, sendTyping };
}
