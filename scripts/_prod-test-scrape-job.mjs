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

console.log("=== start job max_ok=3 ===");
const start = await fetch(`${BASE}/api/admin/scrape-photos/start`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ batch_size: 5, max_ok: 3 }),
});
console.log("start", start.status, (await start.text()).slice(0, 800));

for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const st = await fetch(`${BASE}/api/admin/scrape-photos/status`, { headers: h });
  const j = await st.json();
  console.log(
    `poll ${i}`,
    j.status,
    `ok=${j.ok}`,
    `proc=${j.processed}`,
    `fail=${j.failed}`,
    j.message,
    j.ids_ok?.slice?.(0, 5),
    j.errors?.slice?.(0, 2),
  );
  if (j.status !== "running" && j.status !== "stopping") break;
}

const prod = await fetch(`${BASE}/api/products?limit=5&sort=recent`, { headers: h });
const pj = await prod.json();
const sample = (pj.data || pj.products || []).slice(0, 5).map((p) => ({
  id: p.id,
  name: (p.name || "").slice(0, 40),
  image: (p.image_url || p.imageUrl || "").slice(0, 80),
  images0: (p.images?.[0] || "").slice(0, 40),
}));
console.log("catalog sample", JSON.stringify(sample, null, 2));
