import React from "react";
import { Link, useParams } from "wouter";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Star, ShieldCheck, ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProductDetail() {
  const params = useParams();
  const productId = parseInt(params.id || "0");

  const { data: product, isLoading } = useGetProduct(productId, {
    query: {
      enabled: !!productId,
      queryKey: getGetProductQueryKey(productId)
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 z-10 sticky top-0" />
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="p-8 text-center">Product not found</div>;
  }

  const prices = product.prices || {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 z-10 sticky top-0">
        <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">
          <img src="/public/logo.png" alt="QDIA Export" className="h-8 w-8 object-contain" />
          QDIA Export
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors text-primary">Catalog</Link>
          <Link href="/rfq" className="text-sm font-medium hover:text-primary transition-colors">Post RFQ</Link>
          <Link href="/supplier" className="text-sm font-medium hover:text-primary transition-colors">Supplier Center</Link>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span>{product.category}</span>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-foreground truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-xl border overflow-hidden flex items-center justify-center p-4">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-muted-foreground">No Image</div>
              )}
            </div>
            {product.images && product.images.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.slice(0, 4).map((img, i) => (
                  <div key={i} className="aspect-square bg-white rounded-lg border overflow-hidden p-2 cursor-pointer hover:border-primary transition-colors">
                    <img src={img} alt={`${product.name} thumbnail`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified Supplier
                </Badge>
                <Badge variant="outline" className="border-secondary/30 text-secondary-foreground bg-secondary/5">
                  🇩🇿 Made in Algeria
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-3">{product.name}</h1>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="ml-1 font-medium">{product.rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <span className="text-muted-foreground">{product.review_count || 0} Reviews</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{product.orders_fulfilled || 0} Orders fulfilled</span>
              </div>
            </div>

            {/* Incoterms Price Table */}
            <div className="rounded-xl border bg-card overflow-hidden mb-8 shadow-sm">
              <div className="grid grid-cols-4 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                <div className="p-3 border-r">EXW</div>
                <div className="p-3 border-r">FOB</div>
                <div className="p-3 border-r">CFR</div>
                <div className="p-3">CIF</div>
              </div>
              <div className="grid grid-cols-4 text-center divide-x">
                <div className="p-4">
                  <div className="text-lg font-bold">${prices.exw?.toLocaleString() ?? '--'}</div>
                  <div className="text-[10px] text-muted-foreground uppercase mt-1">{prices.unit || 'unit'}</div>
                </div>
                <div className="p-4 bg-primary/5 text-primary">
                  <div className="text-lg font-bold">${prices.fob?.toLocaleString() ?? '--'}</div>
                  <div className="text-[10px] opacity-70 uppercase mt-1">{prices.unit || 'unit'}</div>
                </div>
                <div className="p-4">
                  <div className="text-lg font-bold">${prices.cfr?.toLocaleString() ?? '--'}</div>
                  <div className="text-[10px] text-muted-foreground uppercase mt-1">{prices.unit || 'unit'}</div>
                </div>
                <div className="p-4">
                  <div className="text-lg font-bold">${prices.cif?.toLocaleString() ?? '--'}</div>
                  <div className="text-[10px] text-muted-foreground uppercase mt-1">{prices.unit || 'unit'}</div>
                </div>
              </div>
            </div>

            {/* Product Specs */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Minimum Order Qty</span>
                <span className="font-medium">{product.moq} {product.moq_unit}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Port of Departure</span>
                <span className="font-medium">{product.port_depart}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Packaging</span>
                <span className="font-medium">{product.packaging || 'Standard Export'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Processing</span>
                <span className="font-medium">{product.processing || 'N/A'}</span>
              </div>
            </div>

            {/* Certifications */}
            {product.certifications && product.certifications.length > 0 && (
              <div className="mb-8 border-t pt-6">
                <h3 className="text-sm font-semibold mb-3">Compliance & Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {product.certifications.map((cert, i) => (
                    <Badge key={i} variant="outline" className="bg-background">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Supplier Card */}
            <div className="rounded-xl border bg-muted/30 p-5 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    {product.supplier_name || 'Algerian Supplier'}
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-sm text-muted-foreground">{product.supplier_location || 'Algeria'} • {product.origin_wilaya}</p>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="font-medium">6 YRS on QDIA</div>
                  <div className="text-muted-foreground">98% Response Rate</div>
                  <div className="text-muted-foreground">240+ Transactions</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button size="lg" className="flex-1 h-12 text-base font-semibold shadow-sm" asChild>
                <Link href={`/rfq?product=${encodeURIComponent(product.name)}`}>Request for Quotation</Link>
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-12 text-base font-semibold">
                Contact Supplier
              </Button>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
