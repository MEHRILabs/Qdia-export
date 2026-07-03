import type { PublicUser } from "../services/auth";

export function canAccessInvoice(
  user: PublicUser,
  inv: { buyerId: number | null; supplierId: number | null },
): boolean {
  if (user.role === "admin") return true;
  return inv.buyerId === user.id || inv.supplierId === user.id;
}

export function canAccessTransaction(
  user: PublicUser,
  tx: { buyerId: number; supplierId: number | null },
): boolean {
  if (user.role === "admin") return true;
  return tx.buyerId === user.id || tx.supplierId === user.id;
}

export function canAccessRfq(
  user: PublicUser,
  rfq: { buyerId: number | null; supplierId: number | null; status: string },
): boolean {
  if (user.role === "admin") return true;
  if (rfq.buyerId === user.id) return true;
  if (rfq.supplierId === user.id) return true;
  if (user.role === "supplier" && rfq.status === "pending") return true;
  return false;
}

export function canModifyProduct(
  user: PublicUser,
  product: { supplierId: number | null },
): boolean {
  if (user.role === "admin") return true;
  if (user.role !== "supplier") return false;
  if (!product.supplierId || !user.supplier_id) return user.role === "supplier";
  return product.supplierId === user.supplier_id;
}
