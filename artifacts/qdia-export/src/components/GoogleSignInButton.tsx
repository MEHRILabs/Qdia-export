import { useEffect, useRef, useState } from "react";
import { renderGoogleButton, type GoogleCredential } from "@/lib/google-auth";

interface Props {
  onCredential: (cred: GoogleCredential) => void;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({ onCredential, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    renderGoogleButton(el, cred => {
      if (!cancelled) onCredential(cred);
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erreur Google Sign-In";
      if (!cancelled) {
        setError(msg);
        onError?.(msg);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="flex justify-center min-h-[44px]" />
      {error && <p className="text-[11px] text-red-500 text-center px-4">{error}</p>}
    </div>
  );
}
