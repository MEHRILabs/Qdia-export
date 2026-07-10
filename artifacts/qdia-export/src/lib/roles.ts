/**
 * RBAC QDIA — trois rôles, trois espaces UI distincts.
 *
 * | Rôle      | Shell              | Accueil      | Capacités principales                          |
 * |-----------|--------------------|--------------|------------------------------------------------|
 * | buyer     | BuyerHeader/Footer | /            | catalogue, panier, RFQ, commandes, favoris     |
 * | supplier  | SupplierSidebar     | /dashboard   | produits, assistant, studio, devis, facturation|
 * | admin     | SupplierSidebar    | /admin       | revue catalogue, users, export usine, stats    |
 *             | (variant=admin)    |              |                                                |
 *
 * Les routes sont protégées via ProtectedRoute + requireRole (API).
 * Un rôle n'accède jamais au dashboard d'un autre (redirection defaultHome).
 */
import type { AuthUser } from "@/lib/api-auth";

export type AppRole = "buyer" | "supplier" | "admin";

/** Accès outils fournisseur (routes protégées) — admin inclus. */
export function isSupplier(user: AuthUser | null | undefined): boolean {
  return user?.role === "supplier" || user?.role === "admin";
}

/** Vrai uniquement pour un compte exportateur (pas admin). Pour l'UI header. */
export function isExporterOnly(user: AuthUser | null | undefined): boolean {
  return user?.role === "supplier";
}

export function isBuyer(user: AuthUser | null | undefined): boolean {
  return user?.role === "buyer";
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === "admin";
}

/** Acheteur connecté OU visiteur (parcours achat). */
export function showBuyerUi(user: AuthUser | null | undefined): boolean {
  return !user || user.role === "buyer";
}

export function defaultHomeForUser(user: AuthUser | null | undefined): string {
  if (isAdmin(user)) return "/admin";
  if (user?.role === "supplier") return "/dashboard";
  return "/";
}

/** Libellé métier du rôle (UI, pas technique). */
export function roleLabelKey(role: string | undefined): string {
  switch (role) {
    case "admin":
      return "header.admin_space";
    case "supplier":
      return "header.supplier_space";
    default:
      return "header.buyer_space";
  }
}
