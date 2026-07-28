/** Purge toutes les photos non-placeholder du catalogue prod (scrapes hors-sujet). */
const BASE = process.env.QDIA_API_URL || "https://qdia-export.onrender.com";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.QDIA_ADMIN_EMAIL || "ops.admin@qdiadz.com",
      password: process.env.QDIA_ADMIN_PASSWORD || "QdiaOps#Secure2026",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login ${res.status} ${JSON.stringify(data)}`);
  return data.token;
}

const token = await login();
const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

console.log("purge-unsafe scraped…");
const purge = await fetch(`${BASE}/api/admin/purge-unsafe-photos`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ scraped: true, aggressive: true }),
});
console.log("purge", purge.status, await purge.text());

const toClear = [];
let offset = 0;
while (offset < 2000) {
  const r = await fetch(`${BASE}/api/products?scope=admin&limit=100&offset=${offset}`, { headers: h });
  const j = await r.json();
  const rows = j.data || [];
  if (!rows.length) break;
  for (const p of rows) {
    const img = String(p.image_url || "");
    if (!img) continue;
    if (img.includes("placeholder") || img.endsWith(".svg")) continue;
    // data / api proxy / http = scrapes à retirer
    if (
      img.startsWith("data:") ||
      img.startsWith("http") ||
      img.includes("/api/products/") ||
      img.includes("google") ||
      img.includes("bing") ||
      img.includes("gstatic")
    ) {
      toClear.push(p.id);
    }
  }
  offset += rows.length;
  if (rows.length < 100) break;
}

console.log("ids to clear via reject:", toClear.length, toClear.slice(0, 20));

let rejected = 0;
for (let i = 0; i < toClear.length; i += 40) {
  const batch = toClear.slice(i, i + 40);
  const res = await fetch(`${BASE}/api/admin/photo-reviews/reject`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ ids: batch }),
  });
  const body = await res.json();
  console.log("reject batch", res.status, body);
  rejected += body.rejected ?? batch.length;
}

console.log("done rejected≈", rejected);
