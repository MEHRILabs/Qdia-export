/** Config frontend QDIA Export (variables VITE_ depuis .env racine) */

export const appConfig = {
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
  googleMapsKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
  },
} as const;

export const hasGoogleAuth = () => Boolean(appConfig.googleClientId);
export const hasGoogleMaps = () => Boolean(appConfig.googleMapsKey);
export const hasFirebase = () => Boolean(appConfig.firebase.apiKey && appConfig.firebase.projectId);
