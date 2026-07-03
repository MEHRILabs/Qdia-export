import type { AuthUser } from "@/lib/api-auth";

export function isSupplier(user: AuthUser | null | undefined): boolean {
  return user?.role === "supplier" || user?.role === "admin";
}

export function isBuyer(user: AuthUser | null | undefined): boolean {
  return user?.role === "buyer";
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === "admin";
}

export function defaultHomeForUser(user: AuthUser | null | undefined): string {
  return isSupplier(user) ? "/supplier" : "/";
}
