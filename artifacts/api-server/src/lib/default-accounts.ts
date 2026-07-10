/** Comptes administrateur QDIA */
export const ADMIN_EMAIL = process.env.QDIA_ADMIN_EMAIL ?? "administration@qdiadz.com";
export const ADMIN_PASSWORD = process.env.QDIA_ADMIN_PASSWORD ?? "QDIA@Admin2026";
export const ADMIN_NAME = process.env.QDIA_ADMIN_NAME ?? "Administration QDIA";

/** Second administrateur (backup / équipe) */
export const ADMIN2_EMAIL = process.env.QDIA_ADMIN2_EMAIL ?? "admin2@qdiadz.com";
export const ADMIN2_PASSWORD = process.env.QDIA_ADMIN2_PASSWORD ?? "QDIA@Admin2-2026";
export const ADMIN2_NAME = process.env.QDIA_ADMIN2_NAME ?? "Admin QDIA 2";

/** Liste des e-mails admin autorisés (ne pas rétrograder en supplier). */
export function adminEmails(): string[] {
  return [ADMIN_EMAIL, ADMIN2_EMAIL].map(e => e.toLowerCase());
}
