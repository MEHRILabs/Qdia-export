/** Scrape photos manquantes sur prod (admin). Usage: node scripts/_prod-scrape-batch.mjs [limit] */
const BASE = process.env.QDIA_API_URL || "https://qdia-export.onrender.com";
const limit = Math.min(Number(process.argv[2] || 50), 100);

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
console.log("login OK, scrape limit=", limit);

const started = Date.now();
const scrape = await fetch(`${BASE}/api/admin/scrape-photos`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ limit }),
});
const text = await scrape.text();
console.log("status", scrape.status);
console.log(text.slice(0, 2500));
console.log("elapsed_s", Math.round((Date.now() - started) / 1000));

try {
  const status = await fetch(`${BASE}/api/products/enrich/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("enrich_status", await status.text());
} catch (e) {
  console.log("status_err", e.message);
}
