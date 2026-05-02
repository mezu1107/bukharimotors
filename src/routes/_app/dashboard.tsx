import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Car, Users, FileText, Receipt, TrendingUp, Calendar } from "lucide-react";
import { fmtMoney } from "@/lib/format";

const RevenueChart = lazy(() => import("@/components/revenue-chart").then((m) => ({ default: m.RevenueChart })));

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState({ vehicles: 0, clients: 0, activeBookings: 0, revenue: 0 });
  const [trend, setTrend] = useState<{ day: string; revenue: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [v, c, b, p] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["confirmed", "active"]),
        supabase.from("payments").select("amount, paid_at").gte("paid_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);
      const revenue = (p.data ?? []).reduce((s, x) => s + Number(x.amount), 0);
      setStats({ vehicles: v.count ?? 0, clients: c.count ?? 0, activeBookings: b.count ?? 0, revenue });

      // simple last-7-day trend
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const k = d.toLocaleDateString("en-GB", { weekday: "short" });
        buckets[k] = 0;
      }
      (p.data ?? []).forEach((x) => {
        const k = new Date(x.paid_at).toLocaleDateString("en-GB", { weekday: "short" });
        if (k in buckets) buckets[k] += Number(x.amount);
      });
      setTrend(Object.entries(buckets).map(([day, revenue]) => ({ day, revenue })));
    })();
  }, []);

  const kpis = [
    { label: "Active Bookings", value: stats.activeBookings, icon: FileText, color: "from-violet-500 to-purple-600" },
    { label: "Fleet Vehicles", value: stats.vehicles, icon: Car, color: "from-blue-500 to-cyan-600" },
    { label: "Total Clients", value: stats.clients, icon: Users, color: "from-emerald-500 to-teal-600" },
    { label: "Revenue (30d)", value: fmtMoney(stats.revenue), icon: Receipt, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Real-time overview of your rental operations</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-strong p-5 border-0 shadow-elegant overflow-hidden relative">
              <div className={`absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${k.color} opacity-20 blur-2xl`} />
              <div className="flex items-start justify-between relative">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">{k.label}</div>
                  <div className="text-2xl font-bold mt-2">{k.value}</div>
                </div>
                <div className={`size-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-lg`}>
                  <k.icon className="size-5 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="glass-strong p-5 border-0 shadow-elegant lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">Revenue Trend</div>
              <div className="text-xs text-muted-foreground">Last 7 days</div>
            </div>
            <TrendingUp className="size-4 text-success" />
          </div>
          <Suspense fallback={<div className="h-[220px] rounded-md bg-secondary" />}>
            <RevenueChart data={trend} />
          </Suspense>
        </Card>

        <Card className="glass-strong p-5 border-0 shadow-elegant">
          <div className="font-semibold mb-3">Quick Actions</div>
          <div className="space-y-2 text-sm">
            <a href="/bookings/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition">
              <FileText className="size-4 text-primary" /> New Rental Agreement
            </a>
            <a href="/clients" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition">
              <Users className="size-4 text-primary" /> Add Client
            </a>
            <a href="/vehicles" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition">
              <Car className="size-4 text-primary" /> Manage Fleet
            </a>
            <a href="/calendar" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition">
              <Calendar className="size-4 text-primary" /> View Calendar
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

