import React from "react";
import { Link } from "wouter";
import { useListFeaturedProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: featuredProducts, isLoading } = useListFeaturedProducts();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 z-10 sticky top-0">
        <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">
          <img src="/public/logo.png" alt="QDIA Export" className="h-8 w-8 object-contain" />
          QDIA Export
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">Catalog</Link>
          <Link href="/rfq" className="text-sm font-medium hover:text-primary transition-colors">Post RFQ</Link>
          <Link href="/supplier" className="text-sm font-medium hover:text-primary transition-colors">Supplier Center</Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r bg-card hidden md:block overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">Categories</h3>
            <nav className="space-y-1">
              {['Agriculture & Food', 'Energy & Chemicals', 'Textiles & Apparel', 'Construction Materials', 'Handicrafts & Decor'].map((cat) => (
                <Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`} className="block px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors font-medium">
                  {cat}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Hero */}
          <section className="relative bg-muted">
            <div className="absolute inset-0 z-0">
              <img src="/public/hero.png" alt="Cargo Port" className="w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            </div>
            <div className="relative z-10 p-8 md:p-16 lg:p-24 max-w-4xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                Connect with Premium <span className="text-primary">Algerian Exporters</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                Source high-quality products directly from verified manufacturers. From premium Deglet Nour dates to industrial materials, access Algeria's growing export market.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/rfq" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                  Post your RFQ
                </Link>
                <Button variant="outline" size="lg" className="h-11">
                  Learn How it Works
                </Button>
              </div>
            </div>
          </section>

          {/* Trust Bar */}
          <section className="border-y bg-card">
            <div className="flex items-center justify-between p-6 max-w-6xl mx-auto flex-wrap gap-6">
              {[
                { title: "Verified Suppliers", desc: "Strict vetting process" },
                { title: "Certified Quality", desc: "ISO, Bio, Halal" },
                { title: "Secure Payments", desc: "Protected transactions" },
                { title: "Logistics Support", desc: "End-to-end shipping" }
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <div className="h-4 w-4 bg-primary rounded-full" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Product Grid */}
          <section className="p-8 md:p-12 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Premium Algerian Exports</h2>
              <Link href="/products" className="text-sm font-medium text-primary hover:underline">
                View All Products →
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts?.map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`} className="group relative block overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-muted rounded-md mb-4 overflow-hidden relative">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                      )}
                    </div>
                    <h3 className="font-semibold line-clamp-1 mb-1" title={product.name}>{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{product.category}</p>
                    <div className="flex items-end justify-between mt-auto">
                      <div>
                        <p className="text-lg font-bold text-primary">${product.prices?.fob?.toLocaleString() ?? '--'} <span className="text-xs text-muted-foreground font-normal">FOB</span></p>
                        <p className="text-xs text-muted-foreground">MOQ: {product.moq} {product.moq_unit}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/10 text-secondary-foreground px-2 py-1 rounded text-xs font-medium border border-secondary/20">
                        DZ <span className="sr-only">Algeria</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
