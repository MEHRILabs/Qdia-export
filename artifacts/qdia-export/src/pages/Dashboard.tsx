import React from "react";
import { Link } from "wouter";
import { useGetDashboardStats, useGetProductPerformance, useGetRecentRfqs } from "@workspace/api-client-react";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, MessageSquare, FileText, TrendingUp, Sparkles, AlertCircle, Wand2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useI18n } from "@/contexts/I18nContext";

export default function Dashboard() {
  const { tr } = useI18n();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: performance, isLoading: perfLoading } = useGetProductPerformance();
  const { data: recentRfqs, isLoading: rfqsLoading } = useGetRecentRfqs();

  return (
    <div className="min-h-screen qdia-producer-page flex flex-col md:flex-row">
      <SupplierSidebar activePath="/dashboard" />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 md:hidden sticky top-0 z-10">
          <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">
            {tr("mobile.brand_short")}
          </Link>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {/* Banner */}
          <div className="bg-gradient-to-r from-[#0461A5] to-[#073B74] rounded-xl p-6 md:p-8 mb-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10">
              <span className="inline-block text-xs font-bold bg-[#F5C518] text-[#1A1A2E] px-2 py-0.5 rounded mb-2">{tr("dashboard_page.badge")}</span>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{tr("dashboard_page.title")}</h1>
              <p className="text-white/80 max-w-xl">
                {tr("dashboard_page.subtitle")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 relative z-10 shrink-0 w-full md:w-auto">
              <Button variant="gold" className="flex-1 md:flex-none gap-2" asChild>
                <Link href="/agent-ia"><Sparkles className="h-4 w-4" /> {tr("nav.agent_ia")}</Link>
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none border-white/30 text-white bg-white/10 hover:bg-white/20 gap-2" asChild>
                <Link href="/studio"><Wand2 className="h-4 w-4" /> {tr("nav.studio")}</Link>
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
                <div className="text-sm font-medium text-muted-foreground mb-1">{tr("dashboard_page.active_inquiries")}</div>
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
                  {statsLoading ? <Skeleton className="h-5 w-16" /> : <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">{tr("dashboard_page.priority")}</Badge>}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">{tr("dashboard_page.pending_rfqs")}</div>
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
                <div className="text-sm font-medium text-muted-foreground mb-1">{tr("dashboard_page.export_value")}</div>
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
                <div className="text-sm font-medium text-muted-foreground mb-1">{tr("dashboard_page.store_visits")}</div>
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
                <CardTitle>{tr("dashboard_page.performance")}</CardTitle>
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
                  <AlertCircle className="h-5 w-5 text-amber-500" /> {tr("dashboard_page.actions_required")}
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
                      {tr("dashboard_page.no_actions")}
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
