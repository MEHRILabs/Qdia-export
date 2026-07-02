import { eq } from "drizzle-orm";
import { db, fcmTokensTable } from "@workspace/db";
import { logger } from "../lib/logger";

const FCM_SERVER_KEY = process.env.FIREBASE_LEGACY_SERVER_KEY ?? process.env.FCM_SERVER_KEY;

export async function registerFcmToken(userId: number, token: string, platform = "web") {
  await db.insert(fcmTokensTable).values({ userId, token, platform })
    .onConflictDoNothing({ target: [fcmTokensTable.userId, fcmTokensTable.token] });
}

export async function sendPushToUser(userId: number, title: string, body: string, data?: Record<string, string>) {
  if (!FCM_SERVER_KEY) {
    logger.info({ userId, title }, "FCM non configuré — notification ignorée");
    return { sent: 0 };
  }

  const tokens = await db.select().from(fcmTokensTable).where(eq(fcmTokensTable.userId, userId));
  let sent = 0;

  for (const row of tokens) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: row.token,
          notification: { title, body, icon: "/logo.png" },
          data: data ?? {},
        }),
      });
      if (res.ok) sent++;
    } catch (err) {
      logger.warn({ err, userId }, "Échec envoi FCM");
    }
  }
  return { sent };
}

export async function sendPushToUsers(userIds: number[], title: string, body: string) {
  const results = await Promise.all(userIds.map(id => sendPushToUser(id, title, body)));
  return { sent: results.reduce((s, r) => s + r.sent, 0) };
}
