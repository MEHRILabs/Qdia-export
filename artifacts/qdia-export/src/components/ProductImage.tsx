import { Camera } from "lucide-react";
import { hasRealProductImage, resolveProductImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  /** "cover" pour les vignettes, "contain" pour la fiche produit */
  fit?: "cover" | "contain";
  /** taille du placeholder (compact pour petites vignettes) */
  compact?: boolean;
}

/**
 * Affiche la vraie photo produit, ou un placeholder « QDIA Photo » élégant
 * tant qu'aucune image IA n'a été générée.
 */
export function ProductImage({
  src,
  alt = "",
  className,
  fit = "cover",
  compact = false,
}: ProductImageProps) {
  if (hasRealProductImage(src)) {
    return (
      <img
        src={resolveProductImageUrl(src)}
        alt={alt}
        loading="lazy"
        className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 text-center select-none",
        "bg-gradient-to-br from-[#EAF3FC] via-[#F4F9FE] to-[#FFF8E8]",
        className,
      )}
      aria-label="Photo à générer"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-white/70 ring-1 ring-[#0461A5]/15 shadow-sm",
          compact ? "h-9 w-9" : "h-14 w-14",
        )}
      >
        <Camera className={cn("text-[#0461A5]", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>
      <span
        className={cn(
          "font-bold tracking-tight text-[#0461A5]/70",
          compact ? "text-[9px]" : "text-xs",
        )}
      >
        {compact ? "QDIA" : "Photo"}
      </span>
      {!compact && (
        <span className="text-[10px] font-medium text-[#9CA3AF]/80">IA</span>
      )}
    </div>
  );
}
