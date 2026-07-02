import { appConfig, hasFirebase } from "./app-config";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

let messagingReady = false;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Script failed: ${src}`));
    document.head.appendChild(s);
  });
}

type FirebaseCompat = {
  apps: unknown[];
  initializeApp: (c: object) => unknown;
  analytics: () => unknown;
  messaging: { isSupported: () => Promise<boolean> };
};

/** Initialise Firebase (analytics) si VITE_FIREBASE_* est configuré */
export async function initFirebase(): Promise<void> {
  if (!hasFirebase()) return;

  await injectScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
  await injectScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics-compat.js");

  const fb = (window as Window & { firebase?: FirebaseCompat }).firebase;
  if (fb && !fb.apps.length) {
    fb.initializeApp(appConfig.firebase);
    try { fb.analytics(); } catch { /* analytics optionnel */ }
  }
}

/** Enregistre le token FCM côté serveur (nécessite permission utilisateur) */
export async function registerWebPush(): Promise<boolean> {
  if (!hasFirebase() || !("Notification" in window) || !VAPID_KEY) return false;
  if (Notification.permission === "denied") return false;

  await injectScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") return false;

  const fb = (window as Window & { firebase?: FirebaseCompat }).firebase;
  if (!fb) return false;

  const supported = await fb.messaging.isSupported().catch(() => false);
  if (!supported) return false;

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  }

  const messaging = (fb as FirebaseCompat & { messaging: () => { getToken: (o: object) => Promise<string> } }).messaging();
  const token = await messaging.getToken({
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  });

  const authToken = localStorage.getItem("qdia_auth_token");
  if (!token || !authToken) return false;

  const base = import.meta.env.VITE_API_URL ?? "";
  await fetch(`${base}/api/notifications/fcm/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token, platform: "web" }),
  });

  messagingReady = true;
  return messagingReady;
}
