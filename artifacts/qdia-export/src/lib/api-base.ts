/** URL API : en dev utilise le proxy Vite (/api → :8080) */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return p;
  const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  return base ? `${base}${p}` : p;
}
