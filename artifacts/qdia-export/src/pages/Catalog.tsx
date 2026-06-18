import React, { useState } from "react";
import { Link } from "wouter";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [incoterm, setIncoterm] = useState<string>("ALL");

  const { data: categories } = useListCategories();
  const { data: productList, isLoading } = useListProducts({
    search: search || undefined,
    category_id: categoryId,
    incoterm: incoterm === "ALL" ? undefined : incoterm,
    limit: 20
  });

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Product Catalog</h1>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search premium Algerian products..." 
                className="pl-9 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Select value={categoryId?.toString() ?? "ALL"} onValueChange={(v) => setCategoryId(v === "ALL" ? null : parseInt(v))}>
                <SelectTrigger className="w-[200px] h-11">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={incoterm} onValueChange={setIncoterm}>
                <SelectTrigger className="w-[150px] h-11">
                  <SelectValue placeholder="Incoterm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Incoterms</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                  <SelectItem value="EXW">EXW</SelectItem>
                  <SelectItem value="CIF">CIF</SelectItem>
                  <SelectItem value="CFR">CFR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-56 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productList?.data.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="group relative block overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="aspect-square bg-muted rounded-md mb-4 overflow-hidden relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <span className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-semibold text-primary border border-primary/20">
                      Made in Algeria
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold line-clamp-1 mb-1" title={product.name}>{product.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{product.category}</p>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <p className="text-lg font-bold text-primary">
                      ${product.prices?.fob?.toLocaleString() ?? '--'} 
                      <span className="text-xs text-muted-foreground font-normal ml-1">FOB</span>
                    </p>
                    <p className="text-xs text-muted-foreground">MOQ: {product.moq} {product.moq_unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span title="Origin: Algeria">🇩🇿</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span title="Destination Global">🌍</span>
                  </div>
                </div>
              </Link>
            ))}
            {productList?.data.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <p>No products found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
