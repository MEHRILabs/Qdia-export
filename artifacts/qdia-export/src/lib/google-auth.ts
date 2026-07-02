import { appConfig, hasGoogleAuth } from "./app-config";

export interface GoogleCredential {
  email: string;
  name: string;
  googleId: string;
  idToken: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            use_fedcm_for_prompt?: boolean;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
              locale?: string;
            },
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
let initialized = false;
let currentCallback: ((cred: GoogleCredential) => void) | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Impossible de charger Google Sign-In")));
      if (window.google?.accounts?.id) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Google Sign-In"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function decodeJwtPayload(token: string): Record<string, string> {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Token Google invalide");
  const json = decodeURIComponent(
    atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      .split("")
      .map(c => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
      .join(""),
  );
  return JSON.parse(json);
}

function handleCredential(credential: string) {
  try {
    const claims = decodeJwtPayload(credential);
    currentCallback?.({
      email: claims.email ?? "",
      name: claims.name ?? claims.given_name ?? "Utilisateur Google",
      googleId: claims.sub ?? "",
      idToken: credential,
    });
  } catch {
    /* ignore malformed token */
  }
}

async function ensureInitialized(): Promise<void> {
  if (!hasGoogleAuth()) {
    throw new Error("VITE_GOOGLE_CLIENT_ID manquant dans .env");
  }
  await loadGsiScript();
  if (initialized) return;
  window.google!.accounts.id.initialize({
    client_id: appConfig.googleClientId,
    callback: response => handleCredential(response.credential),
    use_fedcm_for_prompt: false,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  initialized = true;
}

/**
 * Affiche le bouton Google officiel dans `element`.
 * Le callback est appelé quand l'utilisateur choisit son compte.
 */
export async function renderGoogleButton(
  element: HTMLElement,
  onCredential: (cred: GoogleCredential) => void,
): Promise<void> {
  await ensureInitialized();
  currentCallback = onCredential;
  element.innerHTML = "";
  window.google!.accounts.id.renderButton(element, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
    logo_alignment: "left",
    width: 320,
  });
}

/** Conservé pour compatibilité : ouvre le One Tap (fallback). */
export async function signInWithGoogle(): Promise<GoogleCredential> {
  await ensureInitialized();
  return new Promise((resolve, reject) => {
    currentCallback = resolve;
    window.google!.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        reject(new Error("Utilise le bouton Google affiché pour te connecter."));
      }
    });
  });
}
