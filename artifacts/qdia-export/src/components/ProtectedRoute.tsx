import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  roles?: Array<"supplier" | "admin" | "buyer">;
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const returnTo = encodeURIComponent(location || "/");
      sessionStorage.setItem("qdia_return_to", location || "/");
      setLocation(`/?login=1&returnTo=${returnTo}`);
      return;
    }
    if (roles && !roles.includes(user.role as "supplier" | "admin" | "buyer")) {
      setLocation("/");
    }
  }, [user, isLoading, roles, setLocation, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0461A5]" />
      </div>
    );
  }

  if (!user || (roles && !roles.includes(user.role as "supplier" | "admin" | "buyer"))) {
    return null;
  }

  return <>{children}</>;
}
