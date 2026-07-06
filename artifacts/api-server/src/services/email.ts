import { logger } from "../lib/logger";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

function recipients(opts: EmailOptions): string[] {
  return (Array.isArray(opts.to) ? opts.to : [opts.to]).filter((e): e is string => Boolean(e?.includes("@")));
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const toList = recipients(opts);
  if (!toList.length) return false;

  const fromName = process.env.MAIL_FROM_NAME ?? "QDIA Export";
  const fromAddress = process.env.MAIL_FROM_ADDRESS ?? "noreply@qdiadz.com";
  const from = `${fromName} <${fromAddress}>`;
  const html = opts.html ?? (opts.text ? opts.text.replace(/\n/g, "<br>") : undefined);

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      for (const to of toList) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to, subject: opts.subject, html, text: opts.text }),
        });
        if (!res.ok) {
          logger.warn({ status: res.status, body: await res.text() }, "Échec envoi Resend");
          return false;
        }
      }
      return true;
    } catch (err) {
      logger.warn({ err }, "Erreur Resend");
      return false;
    }
  }

  if (!process.env.MAIL_HOST) {
    logger.info({ to: toList, subject: opts.subject }, "Email non configuré (MAIL_HOST / RESEND_API_KEY)");
    return false;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 587),
      secure: process.env.MAIL_PORT === "465",
      auth: process.env.MAIL_USERNAME
        ? { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD ?? "" }
        : undefined,
    });
    await transporter.sendMail({
      from,
      to: toList.join(", "),
      subject: opts.subject,
      text: opts.text,
      html,
    });
    return true;
  } catch (err) {
    logger.warn({ err }, "Erreur SMTP");
    return false;
  }
}

export function orderEmailHtml(title: string, lines: string[]): string {
  const body = lines.map(l => `<p style="margin:0 0 8px">${l}</p>`).join("");
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#073B74;max-width:560px">
<h2 style="color:#0461A5">${title}</h2>${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
<p style="color:#656566;font-size:12px">QDIA Export</p></body></html>`;
}
