import { useCallback } from "react";
import { useLocation } from "wouter";

/** Navigation SPA fiable (wouter + menus Radix). */
export function useAppNavigate() {
  const [, setLocation] = useLocation();

  return useCallback((path: string) => {
    setLocation(path);
    const target = path.split("?")[0] ?? path;
    queueMicrotask(() => {
      const current = window.location.pathname;
      if (current !== target && !current.endsWith(target)) {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    });
  }, [setLocation]);
}
