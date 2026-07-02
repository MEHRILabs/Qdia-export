import { logger } from "../lib/logger";

export async function sendSmsOtp(phone: string, code: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    logger.info({ phone }, "Twilio non configuré — OTP non envoyé par SMS");
    return false;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const body = new URLSearchParams({
    To: phone.startsWith("+") ? phone : `+${phone}`,
    From: from,
    Body: `QDIA Export — votre code de vérification : ${code}`,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ phone, err }, "Échec envoi SMS Twilio");
    return false;
  }
  return true;
}
