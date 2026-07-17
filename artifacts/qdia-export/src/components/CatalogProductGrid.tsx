import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Sparkles, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { AdminEditPhotoDialog } from "@/components/AdminEditPhotoDialog";
import { translateCategoryName } from "@/lib/nav";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/roles";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

type Props = {
  categoryKey: string;
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  showPublishCta?: boolean;
  onProductsChange?: (updater: (prev: Product[]) => Product[]) => void;
};

export function CatalogProductGrid({
  categoryKey,
  products,
  isLoading,
  isError,
  showPublishCta,
  onProductsChange,
}: Props) {
  const { tr } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const admin = isAdmin(user);
  const [photoEdit, setPhotoEdit] = useState<{ id: number; name: string; image_url?: string | null } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const removePhoto = async (product: Product) => {
    if (!confirm(tr("admin.photo_remove_confirm") || "Retirer la photo de ce produit ?")) return;
    setBusyId(product.id);
    try {
      await platformApi.rejectPhotoReviews([product.id]);
      onProductsChange?.((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, image_url: null } : p)),
      );
      toast({ title: tr("admin.photo_removed") || "Photo retirée" });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={categoryKey}
          variants={gridVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5"
        >
          {products.map(product => (
            <motion.div key={product.id} variants={cardVariants} layout className="relative">
              <Link href={`/products/${product.id}`} className="qdia-product-card group overflow-hidden block h-full">
                <div className="aspect-[4/3] overflow-hidden relative bg-[#F8FAFC]">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 start-3 badge-algeria text-[10px]">🇩🇿 {tr("common.algeria")}</span>
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-[#9CA3AF] mb-1">
                    {translateCategoryName(tr, product.category)}
                  </p>
                  <h3 className="font-bold text-[#1A1A2E] text-sm line-clamp-2 leading-snug mb-2">{product.name}</h3>
                  <p className="text-xl font-black text-[#0461A5]">
                    ${product.prices?.fob?.toLocaleString() ?? "—"}
                    <span className="text-xs font-normal text-[#9CA3AF] ms-1">{tr("product.fob")}</span>
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    MOQ {product.moq} {product.moq_unit} · {product.port_depart}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="incoterm" className="text-[10px]">{tr("product.fob")}</Badge>
                    <span className="text-xs font-semibold text-[#0461A5] group-hover:underline">
                      {tr("common.view_details")}
                    </span>
                  </div>
                </div>
              </Link>

              {admin && (
                <div className="absolute top-2 end-2 z-20 flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1 bg-white/95 shadow border text-xs font-bold"
                    disabled={busyId === product.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPhotoEdit({
                        id: product.id,
                        name: product.name,
                        image_url: product.image_url,
                      });
                    }}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {tr("admin.edit_photo")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0 shadow"
                    disabled={busyId === product.id || !product.image_url}
                    title={tr("admin.photo_remove")}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void removePhoto(product);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </motion.div>
          ))}

          {products.length === 0 && (
            <motion.div
              variants={cardVariants}
              className="col-span-full py-16 text-center space-y-4"
            >
              <p className="text-[#9CA3AF]">{isError ? tr("catalog.load_error") : tr("catalog.no_results")}</p>
              {showPublishCta && (
                <Button asChild>
                  <Link href="/agent-ia?new=1">
                    <Sparkles className="h-4 w-4 me-2" /> {tr("catalog.publish_first")}
                  </Link>
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <AdminEditPhotoDialog
        open={!!photoEdit}
        product={photoEdit}
        onClose={() => setPhotoEdit(null)}
        onSaved={(imageUrl) => {
          if (!photoEdit) return;
          const id = photoEdit.id;
          onProductsChange?.((prev) =>
            prev.map((p) => (p.id === id ? { ...p, image_url: imageUrl } : p)),
          );
          setPhotoEdit((prev) => (prev ? { ...prev, image_url: imageUrl } : null));
        }}
      />
    </>
  );
}
