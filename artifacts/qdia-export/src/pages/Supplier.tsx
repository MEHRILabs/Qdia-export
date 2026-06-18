import React from "react";
import { Link } from "wouter";
import { useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Package, MessageSquare, FileText, ShieldCheck, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Supplier() {
  const { data: productList, isLoading } = useListProducts({ limit: 10 });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col">
        <div className="p-6 border-b">
          <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">
            <img src="/public/logo.png" alt="QDIA Export" className="h-8 w-8 object-contain" />
            QDIA Export
          </Link>
        </div>
        
        <div className="p-4 flex-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Supplier Center</div>
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground transition-colors font-medium">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link href="/supplier" className="flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-primary/10 text-primary transition-colors font-medium">
              <Package className="h-4 w-4" /> Product Management
            </Link>
            <Link href="/inquiries" className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground transition-colors font-medium">
              <MessageSquare className="h-4 w-4" /> Inquiries
            </Link>
            <Link href="/rfq" className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground transition-colors font-medium">
              <FileText className="h-4 w-4" /> RFQ Portal
            </Link>
            <Link href="/verification" className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground transition-colors font-medium">
              <ShieldCheck className="h-4 w-4" /> Verification
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t">
          <Button className="w-full" asChild>
            <Link href="/rfq">Post RFQ</Link>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 md:hidden sticky top-0 z-10">
          <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">
            QDIA Export
          </Link>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1">Product Management</h1>
              <p className="text-muted-foreground">Manage your export catalog and visibility.</p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add New
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Products</h3>
              <div className="text-3xl font-bold">{productList?.total || 0}</div>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Listings</h3>
              <div className="text-3xl font-bold text-green-600">{productList?.data.filter(p => p.export_status === 'published').length || 0}</div>
            </div>
            <div className="bg-card rounded-xl border p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="h-16 w-16" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">AI Suggestions</h3>
              <div className="text-3xl font-bold text-primary">3</div>
              <p className="text-xs text-muted-foreground mt-2">Optimize listings for higher visibility</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-muted/20">
              <h2 className="font-semibold">Your Catalog</h2>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price FOB</TableHead>
                  <TableHead>Stock / MOQ</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : productList?.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-[10px]">No img</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium line-clamp-1">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/50">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${product.prices.fob?.toLocaleString() ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      MOQ: {product.moq} {product.moq_unit}
                    </TableCell>
                    <TableCell>
                      {product.export_status === 'published' ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Global</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/studio`}>Edit in Studio</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {productList?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products found. Add your first product to start exporting.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
