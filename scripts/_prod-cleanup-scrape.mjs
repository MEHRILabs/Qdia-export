/** One-shot : purge junk scrapé + remap catégories sur prod. */
const BASE = process.env.QDIA_API_URL || "https://qdia-export.onrender.com";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.QDIA_ADMIN_EMAIL || "administration@qdiadz.com",
      password: process.env.QDIA_ADMIN_PASSWORD || "QDIA@Admin2026",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login ${res.status} ${JSON.stringify(data)}`);
  return data.token;
}

const token = await login();
const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

console.log("purge scraped…");
const purge = await fetch(`${BASE}/api/admin/purge-unsafe-photos`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ scraped: true, aggressive: true }),
});
console.log("purge", purge.status, await purge.text());

console.log("fix categories…");
const fix = await fetch(`${BASE}/api/admin/fix-categories`, {
  method: "POST",
  headers: h,
  body: "{}",
});
console.log("fix-cats", fix.status, await fix.text());
