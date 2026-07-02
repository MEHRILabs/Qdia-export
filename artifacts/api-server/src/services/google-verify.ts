import { logger } from "../lib/logger";

export interface GoogleTokenPayload {
  email: string;
  name: string;
  sub: string;
  picture?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) {
      logger.warn({ status: res.status }, "Google tokeninfo a échoué");
      return null;
    }
    const data = (await res.json()) as Record<string, string>;
    if (!data.email) {
      logger.warn("Token Google sans email");
      return null;
    }
    if (clientId && data.aud !== clientId) {
      logger.warn(
        { token_aud: data.aud, server_client_id: clientId },
        "Client ID Google différent — vérifie que VITE_GOOGLE_CLIENT_ID et GOOGLE_CLIENT_ID sont identiques",
      );
      return null;
    }
    return {
      email: data.email,
      name: data.name ?? data.email.split("@")[0],
      sub: data.sub,
      picture: data.picture,
    };
  } catch (err) {
    logger.warn({ err }, "Vérification token Google impossible");
    return null;
  }
}
