import { apiUrl } from "./api-base";
import type { Product } from "@workspace/api-client-react";

const BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL ?? "");

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("qdia_auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body as T;
}

export interface SupplierContact {
  supplier_user_id: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface CheckoutResult {
  id: number;
  transaction_id?: number;
  supplier_contact?: SupplierContact | null;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  incoterm: string;
  notes?: string;
  product_name?: string | null;
  product_image?: string | null;
  product_sku?: string | null;
  supplier_name?: string | null;
  moq?: number | null;
  moq_unit?: string | null;
  unit_price?: number | null;
  line_total?: number | null;
  currency?: string;
}

export const platformApi = {
  quoteRfq: (id: number, data: { quote_price: number; quote_message?: string; quote_incoterm?: string }) =>
    api(`/api/rfq/${id}`, { method: "PATCH", body: JSON.stringify({ action: "quote", ...data }) }),

  acceptRfq: (id: number) =>
    api(`/api/rfq/${id}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) }),

  rejectRfq: (id: number) =>
    api(`/api/rfq/${id}`, { method: "PATCH", body: JSON.stringify({ action: "reject" }) }),

  shipRfq: (id: number, tracking_number: string) =>
    api(`/api/rfq/${id}`, { method: "PATCH", body: JSON.stringify({ action: "ship", tracking_number }) }),

  getMessages: () => api<{ data: Array<{ id: number; body: string; sender_id: number; created_at: string }> }>("/api/messages"),

  sendMessage: (receiver_id: number, body: string, rfq_id?: number) =>
    api<{ id: number; sender_id: number; receiver_id: number; body: string; created_at: string }>(
      "/api/messages",
      { method: "POST", body: JSON.stringify({ receiver_id, body, rfq_id }) },
    ),

  getFavorites: () => api<{ product_ids: number[] }>("/api/favorites"),

  toggleFavorite: async (productId: number, add: boolean) => {
    if (add) await api(`/api/favorites/${productId}`, { method: "POST" });
    else await api(`/api/favorites/${productId}`, { method: "DELETE" });
  },

  getReviews: (productId: number) =>
    api<{ average: number; count: number; reviews: Array<{ rating: number; comment?: string }> }>(`/api/products/${productId}/reviews`),

  postReview: (productId: number, rating: number, comment?: string) =>
    api(`/api/products/${productId}/reviews`, { method: "POST", body: JSON.stringify({ rating, comment }) }),

  updateProfile: (data: { name?: string; company_name?: string; wilaya?: string; logo_url?: string }) =>
    api("/api/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),

  verificationStatus: () =>
    api<{ level: number; progress_pct: number; steps: Array<{ id: string; label: string; done: boolean }>; badge: string }>("/api/verification/status"),

  complianceAlerts: (destination: string, category: string) =>
    api<{ alerts: string[] }>(`/api/compliance/alerts?destination=${destination}&category=${encodeURIComponent(category)}`),

  priceBenchmark: (product_name: string, destination: string, price_usd?: number) =>
    api("/api/pricing/benchmark", { method: "POST", body: JSON.stringify({ product_name, destination, price_usd }) }),

  deleteProduct: (id: number) => api(`/api/products/${id}`, { method: "DELETE" }),

  createEscrow: (rfq_id: number, payment_method: "escrow" | "swift" | "lc", refs?: { swift_reference?: string; lc_number?: string }) =>
    api("/api/payments/escrow", { method: "POST", body: JSON.stringify({ rfq_id, payment_method, ...refs }) }),

  acceptRfqWithPayment: (id: number, payment_method: "escrow" | "swift" | "lc", refs?: { swift_reference?: string; lc_number?: string }) =>
    api(`/api/rfq/${id}`, { method: "PATCH", body: JSON.stringify({ action: "accept", payment_method, ...refs }) }),

  getTransactions: () => api<{ data: Array<Record<string, unknown>>; commission_rate_pct: number }>("/api/payments/transactions"),

  fundPayment: (id: number, data?: { swift_reference?: string; lc_number?: string }) =>
    api(`/api/payments/${id}/fund`, { method: "POST", body: JSON.stringify(data ?? {}) }),

  releasePayment: (id: number) => api(`/api/payments/${id}/release`, { method: "POST" }),

  subscriptionCheckout: (plan: "bronze" | "gold") =>
    api<{ mode: string; tier: string; url: string | null }>("/api/subscriptions/checkout", { method: "POST", body: JSON.stringify({ plan }) }),

  migrateMysql: () => api<{ connected: boolean; imported: number; errors: string[] }>("/api/admin/migrate-mysql", { method: "POST" }),

  getInvoices: () => api<{ data: Array<Record<string, unknown>>; commission_rate_pct: number }>("/api/billing/invoices"),

  getRfqs: () => api<{ data: Array<Record<string, unknown>> }>("/api/rfq"),

  getMessageThreads: () => api<{ data: Array<{ partner_id: number; partner_name: string; last_message: string; last_at: string | null; unread: number; rfq_id: number | null; partner_role?: string }> }>("/api/messages/threads"),

  getMessageContacts: () => api<{ data: Array<{ id: number; name: string; email?: string | null; role?: string; company?: string | null }> }>("/api/messages/contacts"),

  getMessagePartner: (partnerId: number) =>
    api<{ id: number; name: string; email?: string | null; role?: string; company?: string | null }>(`/api/messages/partner/${partnerId}`),

  getMessageThread: (partnerId: number) =>
    api<{ data: Array<{ id: number; sender_id: number; body: string; created_at: string }> }>(`/api/messages/thread/${partnerId}`),

  updateProduct: (id: number, data: Record<string, unknown>) =>
    api(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  uploadProductImage: (id: number, fileBase64: string) =>
    api<Record<string, unknown>>(`/api/products/${id}/image`, {
      method: "POST",
      body: JSON.stringify({ file_base64: fileBase64 }),
    }),

  enrichProduct: (id: number, opts?: { generate_photos?: boolean; skip_pricing?: boolean }) =>
    api<{ ok: boolean; product_id: number; photo_updated?: boolean; pricing_updated?: boolean }>(
      `/api/products/enrich/${id}`,
      { method: "POST", body: JSON.stringify(opts ?? { generate_photos: true, skip_pricing: true }) },
    ),

  generateProductSheet: (body: {
    description: string;
    target_market?: string;
    cost_dzd?: number;
    image_base64?: string;
  }) =>
    api<{
      name_fr?: string;
      description_fr?: string;
      description_en?: string;
      category?: string;
      moq?: number;
      moq_unit?: string;
      port_depart?: string;
      pricing?: { fob_usd?: number; cif_usd?: number };
      _fallback?: boolean;
      _fallback_reason?: string;
    }>("/api/ai/generate-product", { method: "POST", body: JSON.stringify(body) }),

  getSupplier: (id: number) => api<Record<string, unknown>>(`/api/suppliers/${id}`),

  invoiceAiLines: (body: Record<string, unknown>) =>
    api<{ lines: Array<{ description: string; hs_code?: string; quantity: number; unit: string; unit_price: number; total: number }>; source: string; notes?: string }>(
      "/api/billing/invoices/ai-lines",
      { method: "POST", body: JSON.stringify(body) },
    ),

  invoicePreviewPdf: (body: Record<string, unknown>) =>
    apiUrl("/api/billing/invoices/preview-pdf"),

  catalogPdfUrl: () => apiUrl("/api/documents/catalog.pdf"),
  certificatePdfUrl: (productId: number) => apiUrl(`/api/documents/products/${productId}/certificate.pdf`),
  invoicePdfUrl: (id: number) => apiUrl(`/api/billing/invoices/${id}.pdf`),

  webSocketUrl: () => {
    const token = localStorage.getItem("qdia_auth_token") ?? "";
    if (import.meta.env.DEV) {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}/api/ws?token=${encodeURIComponent(token)}`;
    }
    const base = (import.meta.env.VITE_API_URL ?? window.location.origin)
      .replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:")
      .replace(/\/$/, "");
    return `${base}/api/ws?token=${encodeURIComponent(token)}`;
  },

  listProductsFiltered: (params: {
    search?: string;
    category?: string;
    category_id?: number;
    incoterm?: string;
    moq_min?: number;
    moq_max?: number;
    price_min?: number;
    price_max?: number;
    origin_wilaya?: string;
    supplier_id?: number;
    limit?: number;
    page?: number;
  }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") q.set(k, String(v));
    });
    const qs = q.toString();
    return api<{ data: Product[]; total?: number }>(`/api/products${qs ? `?${qs}` : ""}`);
  },

  getCart: () =>
    api<{ data: CartItem[] }>("/api/cart"),

  addToCart: (data: { product_id: number; quantity: number; incoterm?: string; notes?: string }) =>
    api("/api/cart", { method: "POST", body: JSON.stringify(data) }),

  updateCartItem: (itemId: number, quantity: number) =>
    api(`/api/cart/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),

  removeFromCart: (itemId: number) =>
    api(`/api/cart/${itemId}`, { method: "DELETE" }),

  checkoutCart: (payment_method: "escrow" | "swift" | "lc" = "escrow") =>
    api<CheckoutResult>("/api/cart/checkout", { method: "POST", body: JSON.stringify({ payment_method }) }),

  getOrders: () =>
    api<{ data: Array<Record<string, unknown>> }>("/api/orders"),

  patchOrder: (orderId: number, data: { status?: string; tracking_number?: string; carrier?: string }) =>
    api(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteOrder: (orderId: number) =>
    api(`/api/orders/${orderId}`, { method: "DELETE" }),

  getProductContact: (productId: number) =>
    api<SupplierContact & { product_id: number; product_name: string; supplier_id: number }>(`/api/products/${productId}/contact`),

  getProductPricing: (productId: number, destination: string, quantity = 1) =>
    api<{
      mode: string;
      incoterms: string[];
      default_incoterm: string;
      origin_country: string;
      buyer_country: string;
      export_authorized: boolean;
      prices: { exw: number; fob: number; cfr: number; cif: number; ddp: number };
      customs: Record<string, unknown>;
      line_total_usd: { fob: number; cif: number; ddp: number };
    }>(`/api/products/${productId}/pricing?destination=${encodeURIComponent(destination)}&quantity=${quantity}`),

  reorder: (orderId: number) =>
    api<{ data: Array<{ id: number; product_id: number; quantity: number; incoterm: string }>; message: string }>(
      `/api/orders/${orderId}/reorder`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  getDisputes: () =>
    api<{ data: Array<Record<string, unknown>> }>("/api/disputes"),

  createDispute: (data: {
    transaction_id: number;
    reason: string;
    order_id?: number;
    supplier_id?: number;
    description?: string;
  }) => api("/api/disputes", { method: "POST", body: JSON.stringify(data) }),

  mediateDispute: (id: number, action: "refund" | "resolve" | "reject", notes?: string, refund_amount?: number) =>
    api(`/api/disputes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action, notes, refund_amount }),
    }),

  createOemRequest: (data: {
    product_id: number;
    request_type: "oem" | "odm";
    specs: string;
    supplier_id?: number;
    logo_url?: string;
    quantity?: number;
  }) => api("/api/oem-requests", { method: "POST", body: JSON.stringify(data) }),

  createSampleRequest: (data: {
    product_id: number;
    shipping_address: string;
    quantity?: number;
    supplier_id?: number;
  }) => api("/api/sample-requests", { method: "POST", body: JSON.stringify(data) }),

  getSupplierReviews: (supplierId: number) =>
    api<{ average: number; count: number; reviews: Array<{ rating: number; comment?: string; created_at?: string }> }>(
      `/api/suppliers/${supplierId}/reviews`,
    ),

  postSupplierReview: (supplierId: number, rating: number, comment?: string) =>
    api(`/api/suppliers/${supplierId}/reviews`, { method: "POST", body: JSON.stringify({ rating, comment }) }),

  trackParcel: (number: string, carrier?: "dhl" | "fedex" | "maersk") => {
    const q = new URLSearchParams({ number });
    if (carrier) q.set("carrier", carrier);
    return api<{
      carrier: string;
      tracking_number: string;
      status: string;
      events: Array<{ status: string; location: string; description: string; event_at: string }>;
    }>(`/api/tracking?${q.toString()}`);
  },

  getRecommendations: (productId?: number, limit = 8) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (productId != null) q.set("product_id", String(productId));
    return api<{ data: Array<Record<string, unknown>> }>(`/api/products/recommendations?${q.toString()}`);
  },

  getProductCategories: () =>
    api<{ data: Array<{ name: string; count: number }> }>("/api/products/meta/categories"),

  lookupProduct: (code: string) =>
    api<Record<string, unknown>>(`/api/products/lookup?code=${encodeURIComponent(code)}`),

  getEnrichmentStatus: () =>
    api<{
      total: number;
      without_photo: number;
      without_pricing: number;
      ready_for_review: number;
      published: number;
    }>("/api/products/enrich/status"),

  createProduct: (data: Record<string, unknown>) =>
    api<Record<string, unknown>>("/api/products", { method: "POST", body: JSON.stringify(data) }),

  bulkExportAuth: (data: {
    export_authorized: boolean;
    ids?: number[];
    filter?: "pending" | "authorized" | "all";
    limit?: number;
  }) => api<{ updated: number; ids: number[] }>("/api/products/bulk-export-auth", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  enrichProductsBatch: (opts?: { limit?: number; generate_photos?: boolean; skip_pricing?: boolean; only_without_photo?: boolean }) =>
    api<{
      enriched: number;
      skipped: number;
      photos_generated: number;
      pricing_updated: number;
      errors: string[];
    }>("/api/products/enrich", { method: "POST", body: JSON.stringify(opts ?? { limit: 50 }) }),

  /** Un lot court (max 5 côté serveur — timeout Render). Pour 20/30, enchaîner côté UI. */
  scrapeCatalogPhotos: (limit = 1, opts?: { skip_purge?: boolean }) =>
    api<{ processed: number; ok: number; skipped: number; errors: string[]; ids_ok?: number[] }>(
      "/api/admin/scrape-photos",
      {
        method: "POST",
        body: JSON.stringify({
          limit: Math.min(Math.max(1, limit), 2),
          skip_purge: opts?.skip_purge !== false,
        }),
      },
    ),

  purgeUnsafePhotos: () =>
    api<{ cleared: number; ids: number[] }>("/api/admin/purge-unsafe-photos", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  listPhotoReviews: (ids?: number[]) =>
    api<{
      data: Array<{
        id: number;
        name: string;
        category: string | null;
        brand: string;
        image_url: string;
        pending: boolean;
        candidate_count: number;
        candidate_index: number;
      }>;
    }>(`/api/admin/photo-reviews${ids?.length ? `?ids=${ids.join(",")}` : ""}`),

  syncPendingPhotosToCatalog: () =>
    api<{ synced: number }>("/api/admin/photo-reviews/sync-catalog", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  approvePhotoReviews: (ids: number[]) =>
    api<{ approved: number }>("/api/admin/photo-reviews/approve", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  rejectPhotoReviews: (ids: number[]) =>
    api<{ rejected: number }>("/api/admin/photo-reviews/reject", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  nextPhotoReviewCandidate: (id: number) =>
    api<{
      ok: boolean;
      cycled: boolean;
      image_url?: string;
      candidate_count: number;
      reason?: string;
      item: {
        id: number;
        name: string;
        category: string | null;
        brand: string;
        image_url: string;
        pending: boolean;
        candidate_count: number;
        candidate_index: number;
      } | null;
    }>("/api/admin/photo-reviews/next-candidate", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),

  rescrapePhotoReview: (id: number) =>
    api<{
      ok: boolean;
      image_url?: string;
      reason?: string;
      item: {
        id: number;
        name: string;
        category: string | null;
        brand: string;
        image_url: string;
        pending: boolean;
        candidate_count: number;
        candidate_index: number;
      } | null;
    }>("/api/admin/photo-reviews/rescrape", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),

  getScrapeJobStatus: () =>
    api<{
      status: "idle" | "running" | "stopping" | "done" | "error";
      batch_size: number;
      total_products: number;
      without_photo: number;
      with_photo: number;
      processed: number;
      ok: number;
      failed: number;
      skipped: number;
      current_batch: number;
      last_product_id: number | null;
      last_product_name: string | null;
      message: string;
      errors: string[];
    }>("/api/admin/scrape-photos/status"),

  startScrapeJob: (batch_size = 50) =>
    api<{ status: string; message: string; without_photo: number; with_photo: number; total_products: number }>(
      "/api/admin/scrape-photos/start",
      { method: "POST", body: JSON.stringify({ batch_size }) },
    ),

  stopScrapeJob: () =>
    api<{ status: string; message: string }>("/api/admin/scrape-photos/stop", { method: "POST", body: "{}" }),

  listAdminExportProducts: (filter: "pending" | "authorized" | "all" = "pending", limit = 200) => {
    const q = new URLSearchParams({ scope: "admin", limit: String(limit), export_status: "published" });
    if (filter === "pending") q.set("export_authorized", "false");
    else if (filter === "authorized") q.set("export_authorized", "true");
    return api<{ data: Array<Record<string, unknown>> }>(`/api/products?${q.toString()}`);
  },

  duplicateProduct: (id: number) =>
    api<Record<string, unknown>>(`/api/products/${id}/duplicate`, { method: "POST" }),

  patchProductExport: (id: number, data: { export_authorized?: boolean; stock_countries?: string[] }) =>
    api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  patchProductStatus: (id: number, export_status: "published" | "pending" | "suspended" | "draft") =>
    api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify({ export_status }) }),
};
