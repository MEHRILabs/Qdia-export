import React from "react";
import { Link } from "wouter";
import { useGetDashboardStats, useGetProductPerformance, useGetRecentRfqs } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, Package, MessageSquare, FileText, ShieldCheck, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: performance, isLoading: perfLoading } = useGetProductPerformance();
  const { data: recentRfqs, isLoading: rfqsLoading } = useGetRecentRfqs();

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
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-primary/10 text-primary transition-colors font-medium">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link href="/supplier" className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground transition-colors font-medium">
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
          {/* Banner */}
          <div className="bg-primary rounded-xl p-6 md:p-8 mb-8 text-primary-foreground flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Scale Your Exports</h1>
              <p className="text-primary-foreground/80 max-w-xl">
                Your products are gaining traction in European markets. Enhance your listings with AI to increase conversion by up to 40%.
              </p>
            </div>
            <div className="flex gap-4 relative z-10 shrink-0 w-full md:w-auto">
              <Button variant="secondary" className="flex-1 md:flex-none gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Sparkles className="h-4 w-4" /> AI Assistant
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none border-primary-foreground/20 hover:bg-primary-foreground/10">
                Publish New
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  {statsLoading ? <Skeleton className="h-5 w-12" /> : <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">+12%</Badge>}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Active Inquiries</div>
                <div className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.active_inquiries || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  {statsLoading ? <Skeleton className="h-5 w-16" /> : <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Urgent</Badge>}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Pending RFQs</div>
                <div className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.pending_rfqs || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-green-100 text-green-700 rounded-md">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Export Value</div>
                <div className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-24" /> : `$${(stats?.total_export_value || 0).toLocaleString()}`}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-md">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Store Visits (30d)</div>
                <div className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-20" /> : (stats?.store_visits || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {perfLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performance || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                          {performance?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Required */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" /> Action Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-4">
                  {rfqsLoading ? (
                    [...Array(4)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))
                  ) : (
                    recentRfqs?.map((rfq) => (
                      <div key={rfq.id} className="flex items-start gap-3 group cursor-pointer">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0 border border-border group-hover:border-primary transition-colors text-lg">
                          {rfq.buyer_flag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {rfq.product_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="font-medium">{rfq.rfq_ref}</span>
                            <span>•</span>
                            <span className="truncate">{rfq.buyer_city}</span>
                            <span>•</span>
                            <span className="text-amber-600 font-medium">{rfq.time_ago}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {recentRfqs?.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No pending actions. You're all caught up!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
