import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./lib/default-accounts.mjs";

const BASE = "https://qdia-export.onrender.com";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.token;
}

const token = await login();
const h = { Authorization: `Bearer ${token}` };

for (const id of [12, 180]) {
  const r = await fetch(`${BASE}/api/products/${id}`, { headers: h });
  const p = await r.json();
  const img = p.image_url || "";
  console.log({
    id,
    name: (p.name || "").slice(0, 50),
    image_prefix: img.slice(0, 60),
    image_len: img.length,
    images: (p.images || []).slice(0, 3).map((x) => String(x).slice(0, 50)),
    status: r.status,
  });

  const ir = await fetch(`${BASE}/api/products/${id}/image`, { headers: h });
  console.log("  /image", ir.status, ir.headers.get("content-type"), "bytes", (await ir.arrayBuffer()).byteLength);
}

const list = await fetch(`${BASE}/api/products?limit=8`, { headers: h });
const lj = await list.json();
const rows = lj.data || [];
console.log(
  "list first",
  rows.slice(0, 8).map((p) => ({
    id: p.id,
    img: (p.image_url || "").slice(0, 50),
    name: (p.name || "").slice(0, 30),
  })),
);
