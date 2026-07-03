import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { authJsonHeaders } from "@/lib/api-auth";

const STORAGE_KEY = "qdia_agent_session_id";

export interface AgentSessionState {
  id: string;
  current_step: string;
  chat_history: { role: "user" | "assistant"; content: string }[];
  extracted_data: Record<string, unknown>;
  generated_product: Record<string, unknown> | null;
  pricing_result: Record<string, unknown> | null;
  studio_images: { version: number; action: string; image_base64: string }[];
}

export function useAgentSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<AgentSessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (id: string) => {
    const resp = await fetch(apiUrl(`/api/ai/sessions/${id}`), { headers: authJsonHeaders() });
    if (!resp.ok) return null;
    const data = await resp.json() as AgentSessionState;
    setSession(data);
    return data;
  }, []);

  const create = useCallback(async () => {
    const resp = await fetch(apiUrl("/api/ai/sessions"), { method: "POST", headers: authJsonHeaders() });
    if (!resp.ok) throw new Error("Session");
    const data = await resp.json() as AgentSessionState;
    setSessionId(data.id);
    setSession(data);
    localStorage.setItem(STORAGE_KEY, data.id);
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = await refresh(stored);
          if (data) {
            setSessionId(stored);
            setLoading(false);
            return;
          }
        }
        await create();
      } catch {
        await create();
      } finally {
        setLoading(false);
      }
    })();
  }, [create, refresh]);

  const reset = useCallback(async () => {
    if (!sessionId) return create();
    const resp = await fetch(apiUrl(`/api/ai/sessions/${sessionId}/reset`), { method: "POST", headers: authJsonHeaders() });
    if (!resp.ok) return create();
    return refresh(sessionId);
  }, [sessionId, create, refresh]);

  const markComplete = useCallback(async (productId: number) => {
    if (!sessionId) return;
    await fetch(apiUrl(`/api/ai/sessions/${sessionId}/complete`), {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ product_id: productId }),
    });
    await refresh(sessionId);
  }, [sessionId, refresh]);

  return { sessionId, session, loading, refresh, create, reset, markComplete };
}
