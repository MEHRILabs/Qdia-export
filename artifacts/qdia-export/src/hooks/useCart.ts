import { useQuery } from "@tanstack/react-query";
import { platformApi, type CartItem } from "@/lib/platform-api";
import { useAuth } from "@/contexts/AuthContext";

export const CART_QUERY_KEY = ["cart"] as const;

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => platformApi.getCart(),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useCartCount() {
  const { data } = useCart();
  return data?.data?.length ?? 0;
}

export type { CartItem };
