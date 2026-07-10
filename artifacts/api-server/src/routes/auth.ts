import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  registerEmail, loginEmail, loginGoogle, sendPhoneOtp, verifyPhoneOtp,
} from "../services/auth";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rate-limit";

const router: IRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(120).optional(),
  role: z.enum(["buyer", "supplier"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(4).max(128),
});

const googleSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  google_id: z.string().optional(),
  id_token: z.string().optional(),
  role: z.enum(["buyer", "supplier"]).optional(),
});

const phoneSendSchema = z.object({ phone: z.string().min(8) });
const phoneVerifySchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(4),
  role: z.enum(["buyer", "supplier"]).optional(),
});

router.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await registerEmail(body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur inscription" });
  }
});

router.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginEmail(body.email, body.password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "Erreur connexion" });
  }
});

router.post("/auth/google", authLimiter, async (req, res) => {
  try {
    const body = googleSchema.parse(req.body);
    const result = await loginGoogle({
      email: body.email,
      name: body.name,
      googleId: body.google_id,
      idToken: body.id_token,
      role: body.role,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur Google OAuth" });
  }
});

router.post("/auth/phone/send", authLimiter, async (req, res) => {
  try {
    const body = phoneSendSchema.parse(req.body);
    const result = await sendPhoneOtp(body.phone);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur envoi OTP" });
  }
});

router.post("/auth/phone/verify", authLimiter, async (req, res) => {
  try {
    const body = phoneVerifySchema.parse(req.body);
    const result = await verifyPhoneOtp(body.phone, body.code, body.role);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "OTP invalide" });
  }
});

router.get("/auth/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
