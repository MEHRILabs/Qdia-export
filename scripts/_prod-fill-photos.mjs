/**
 * Remplit les photos manquantes sur prod via Bing + PUT image_url (https durable).
 * Usage: node scripts/_prod-fill-photos.mjs [limit]
 */
const BASE = process.env.QDIA_API_URL || "https://qdia-export.onrender.com";
const limit = Math.min(Number(process.argv[2] || 20), 50);

async function login(retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: process.env.QDIA_ADMIN_EMAIL || "ops.admin@qdiadz.com",
          password: process.env.QDIA_ADMIN_PASSWORD || "QdiaOps#Secure2026",
        }),
      });
      const text = await res.text();
      if (res.ok) {
        const data = JSON.parse(text);
        if (data.token) return data.token;
      }
      console.log(`login retry ${i + 1}/${retries} status=${res.status}`);
    } catch (e) {
      console.log(`login retry ${i + 1}/${retries}`, e.message);
    }
    await new Promise((r) => setTimeout(r, 8000 * (i + 1)));
  }
  throw new Error("login impossible (Render 502 / indisponible)");
}

function extract(html) {
  const urls = new Set();
  for (const re of [/"murl"\s*:\s*"(https?:\/\/[^"]+)"/gi, /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi]) {
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        urls.add(decodeURIComponent(m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/")));
      } catch {}
    }
  }
  return [...urls];
}

function needsPhoto(url) {
  if (!url?.trim()) return true;
  const u = url.trim();
  if (u.includes("qdia-photo-placeholder")) return true;
  if (u.startsWith("/uploads/") && u.endsWith(".svg")) return true;
  // anciennes URLs locales Render souvent mortes
  if (u.startsWith("/uploads/catalog/")) return true;
  return false;
}

async function findImage(name) {
  const bing = await fetch(
    `https://www.bing.com/images/async?q=${encodeURIComponent(name + " product packshot")}&async=1&first=1&count=35`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    },
  );
  if (!bing.ok) return null;
  const urls = extract(await bing.text());
  for (const u of urls.slice(0, 8)) {
    try {
      const img = await fetch(u, { headers: { "User-Agent": "QDIA-Export-Bot/1.0" } });
      if (!img.ok) continue;
      const buf = Buffer.from(await img.arrayBuffer());
      const mime = (img.headers.get("content-type") || "").split(";")[0];
      if (!mime.startsWith("image/") || buf.byteLength < 8000) continue;
      return u;
    } catch {}
  }
  return null;
}

const token = await login();
console.log("login OK");

async function putImage(id, url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      const put = await fetch(`${BASE}/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ image_url: url, images: [url] }),
      });
      if (put.ok) return true;
      const body = await put.text();
      if (put.status === 502 || put.status === 503 || put.status === 504) {
        await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
        continue;
      }
      console.log(`FAIL put ${put.status} ${body.slice(0, 80)}`);
      return false;
    } catch {
      await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
    }
  }
  console.log("FAIL put retries");
  return false;
}

const list = await fetch(`${BASE}/api/products?limit=100&page=1`, {
  headers: { Authorization: `Bearer ${token}` },
});
const payload = await list.json();
const products = (payload.data || []).filter((p) => needsPhoto(p.image_url)).slice(0, limit);
console.log(`à traiter: ${products.length}`);

let ok = 0;
let fail = 0;
for (const p of products) {
  process.stdout.write(`[${p.id}] ${String(p.name).slice(0, 40)} … `);
  try {
    const url = await findImage(p.name);
    if (!url) {
      console.log("FAIL aucune");
      fail++;
      continue;
    }
    const saved = await putImage(p.id, url);
    if (!saved) {
      fail++;
      continue;
    }
    ok++;
    console.log("OK");
    await new Promise((r) => setTimeout(r, 800));
  } catch (e) {
    fail++;
    console.log("ERR", e.message);
  }
}

console.log(JSON.stringify({ ok, fail, total: products.length }, null, 2));
