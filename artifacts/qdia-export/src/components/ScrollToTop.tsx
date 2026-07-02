import { useEffect } from "react";
import { useLocation } from "wouter";

/** Remonte en haut de page à chaque changement de route */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return null;
}
