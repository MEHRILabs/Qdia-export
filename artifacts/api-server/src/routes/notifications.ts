import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { registerFcmToken, sendPushToUser } from "../services/fcm";

const router: IRouter = Router();

router.post("/notifications/fcm/register", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    token: z.string().min(10),
    platform: z.enum(["web", "android", "ios"]).default("web"),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await registerFcmToken(req.user!.id, parsed.data.token, parsed.data.platform);
  res.json({ ok: true });
});

router.post("/notifications/test", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    title: z.string().default("QDIA Export"),
    body: z.string().default("Notification test"),
  }).safeParse(req.body);
  const result = await sendPushToUser(
    req.user!.id,
    parsed.success ? parsed.data.title : "QDIA Export",
    parsed.success ? parsed.data.body : "Test",
  );
  res.json(result);
});

export default router;
