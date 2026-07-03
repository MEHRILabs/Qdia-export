import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq, and, gt } from "drizzle-orm";
import { db, usersTable, otpCodesTable } from "@workspace/db";
import { sendSmsOtp } from "./sms-twilio";
import { verifyGoogleIdToken } from "./google-verify";
import { logger } from "../lib/logger";

import { getJwtSecretBytes, isProduction } from "../lib/env-security";

const JWT_SECRET = getJwtSecretBytes();
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? "7d";

export interface AuthTokenPayload {
  sub: string;
  email?: string;
  phone?: string;
  name: string;
  role: string;
  provider: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  provider: string;
  supplier_id?: number | null;
  company_name?: string | null;
  wilaya?: string | null;
  logo_url?: string | null;
  subscription_tier?: string;
}

function toPublicUser(u: typeof usersTable.$inferSelect): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    provider: u.provider,
    supplier_id: u.supplierId,
    company_name: u.companyName,
    wilaya: u.wilaya,
    logo_url: u.logoUrl,
    subscription_tier: u.subscriptionTier,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signToken(user: PublicUser) {
  return new SignJWT({
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    name: user.name,
    role: user.role,
    provider: user.provider,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: String(payload.sub),
      email: payload.email as string | undefined,
      phone: payload.phone as string | undefined,
      name: payload.name as string,
      role: payload.role as string,
      provider: payload.provider as string,
    };
  } catch {
    return null;
  }
}

export async function registerEmail(input: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1);
  if (existing.length) throw new Error("Cet email est déjà utilisé.");

  const [user] = await db.insert(usersTable).values({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    name: input.name ?? input.email.split("@")[0],
    role: input.role === "supplier" ? "supplier" : "buyer",
    provider: "email",
    verified: true,
  }).returning();

  const publicUser = toPublicUser(user);
  return { user: publicUser, token: await signToken(publicUser) };
}

export async function loginEmail(email: string, password: string) {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user?.passwordHash && (await verifyPassword(password, user.passwordHash))) {
      const publicUser = toPublicUser(user);
      return { user: publicUser, token: await signToken(publicUser) };
    }
  } catch (err) {
    logger.warn({ err, email }, "Connexion BDD échouée");
    if (isProduction()) throw new Error("Identifiants invalides.");
  }

  const demo = await tryDemoLogin(email, password);
  if (demo) return demo;

  throw new Error("Identifiants invalides.");
}

const DEMO_ACCOUNTS: Array<PublicUser & { password: string }> = [
  { id: 1, name: "Exportateur Demo", email: "supplier@qdiadz.com", role: "supplier", provider: "email", password: "demo1234", supplier_id: 1 },
  { id: 2, name: "Admin QDIA", email: "admin@qdiadz.com", role: "admin", provider: "email", password: "demo1234" },
];

function tryDemoLogin(email: string, password: string) {
  if (isProduction()) return null;
  const acc = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
  if (!acc) return null;
  const { password: _, ...publicUser } = acc;
  return signToken(publicUser).then(token => ({ user: publicUser, token }));
}

export async function loginGoogle(input: { email: string; name: string; googleId?: string; idToken?: string }) {
  if (isProduction() && !input.idToken) {
    throw new Error("Token Google requis.");
  }

  if (input.idToken) {
    const verified = await verifyGoogleIdToken(input.idToken);
    if (!verified) {
      throw new Error("Token Google invalide.");
    }
    input = { email: verified.email, name: verified.name, googleId: verified.sub };
  } else if (!input.email) {
    throw new Error("Token Google invalide.");
  }

  if (!input.email) throw new Error("Email Google manquant.");

  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1);

  if (!user) {
    [user] = await db.insert(usersTable).values({
      email: input.email,
      name: input.name,
      googleId: input.googleId ?? `google-${input.email}`,
      provider: "google",
      role: "supplier",
      verified: true,
    }).returning();
  }

  const publicUser = toPublicUser(user);
  return { user: publicUser, token: await signToken(publicUser) };
}

export async function sendPhoneOtp(phone: string) {
  const normalized = phone.replace(/\s/g, "");
  const useDevCode = process.env.NODE_ENV === "development" && !process.env.TWILIO_ACCOUNT_SID;
  const code = useDevCode ? "123456" : String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otpCodesTable).values({ phone: normalized, code, expiresAt: expires });

  const smsSent = await sendSmsOtp(normalized, code);
  if (useDevCode) {
    logger.info({ phone: normalized, code }, "OTP demo (dev)");
  } else if (!smsSent) {
    logger.warn({ phone: normalized }, "OTP généré mais SMS non envoyé");
  }

  return {
    sent: true,
    sms: smsSent,
    expires_in: 600,
  };
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const normalized = phone.replace(/\s/g, "");
  const [otp] = await db.select().from(otpCodesTable).where(
    and(
      eq(otpCodesTable.phone, normalized),
      eq(otpCodesTable.code, code),
      eq(otpCodesTable.used, false),
      gt(otpCodesTable.expiresAt, new Date()),
    ),
  ).limit(1);

  if (!otp) throw new Error("Code OTP invalide ou expiré.");

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otp.id));

  let [user] = await db.select().from(usersTable).where(eq(usersTable.phone, normalized)).limit(1);
  if (!user) {
    [user] = await db.insert(usersTable).values({
      phone: normalized,
      name: "Exportateur DZ",
      provider: "phone",
      role: "supplier",
      verified: true,
    }).returning();
  }

  const publicUser = toPublicUser(user);
  return { user: publicUser, token: await signToken(publicUser) };
}

export async function getUserById(id: number) {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (user) return toPublicUser(user);
  } catch (err) {
    logger.warn({ err, id }, "getUserById BDD échouée");
    if (isProduction()) return null;
  }
  if (isProduction()) return null;
  const acc = DEMO_ACCOUNTS.find(a => a.id === id);
  if (!acc) return null;
  const { password: _, ...publicUser } = acc;
  return publicUser;
}
