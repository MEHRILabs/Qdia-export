import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken, getUserById } from "./auth";
import { logger } from "../lib/logger";

type Client = { ws: WebSocket; userId: number };

const clients = new Map<number, Set<WebSocket>>();

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "Token required");
      return;
    }
    try {
      const payload = await verifyToken(token);
      if (!payload) {
        ws.close(4002, "Invalid token");
        return;
      }
      const user = await getUserById(parseInt(payload.sub, 10));
      if (!user) {
        ws.close(4003, "Invalid user");
        return;
      }
      const uid = user.id;
      if (!clients.has(uid)) clients.set(uid, new Set());
      clients.get(uid)!.add(ws);

      ws.send(JSON.stringify({ type: "connected", user_id: uid }));

      ws.on("close", () => {
        clients.get(uid)?.delete(ws);
        if (clients.get(uid)?.size === 0) clients.delete(uid);
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as { type: string; receiver_id?: number; body?: string };
          if (msg.type === "typing" && msg.receiver_id) {
            sendToUser(msg.receiver_id, { type: "typing", sender_id: uid });
          }
        } catch { /* ignore */ }
      });
    } catch {
      ws.close(4002, "Invalid token");
    }
  });

  logger.info("WebSocket server attached at /api/ws");
}

export function sendToUser(userId: number, payload: Record<string, unknown>) {
  const set = clients.get(userId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

export function broadcastMessage(msg: {
  id: number;
  sender_id: number;
  receiver_id: number;
  body: string;
  rfq_id?: number | null;
  created_at: string;
}) {
  sendToUser(msg.receiver_id, { type: "message:new", message: msg });
  sendToUser(msg.sender_id, { type: "message:sent", message: msg });
}

export function broadcastOrderUpdate(userId: number, order: Record<string, unknown>) {
  sendToUser(userId, { type: "order:update", order });
}

export function broadcastDisputeUpdate(userIds: number[], dispute: Record<string, unknown>) {
  for (const uid of userIds) sendToUser(uid, { type: "dispute:update", dispute });
}
