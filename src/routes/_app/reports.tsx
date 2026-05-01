import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, Car, Users, Receipt, Wrench } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

const COLORS = ["#2563EB", "#F97316", "#10B981", "#8B5CF6", "#EF4444", "#0EA5E9"];

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, bookings: 0, vehicles: 0, clients: 0, maintenance: 0, outstanding: 0 });
  const [byMonth, setByMonth] = useState<{ month: string; revenue: number; bookings: number }[]>([]);
  const [byStatus, setByStatus] = useState<{ name: string; value: number }[]>([]);
  const [topVehicles, setTopVehicles] = useState<{ name: string; bookings: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(); since.setMonth(since.getMonth() - 6);
      const [pays, bks, vs, cs, mr] = await Promise.all([
        supabase.from("payments").select("amount, paid_at"),
        supabase.from("bookings").select("id, status, total_amount, balance_amount, created_at, vehicle_id"),
        supabase.from("vehicles").select("id, make, model, registration_no"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("maintenance_records").select("cost"),
      ]);

      const revenue = (pays.data ?? []).reduce((s, x) => s + Number(x.amount), 0);
      const outstanding = (bks.data ?? []).reduce((s, x) => s + Number(x.balance_amount ?? 0), 0);
      const maintenance = (mr.data ?? []).reduce((s, x) => s + Number(x.cost ?? 0), 0);
      setStats({ revenue, bookings: bks.data?.length ?? 0, vehicles: vs.data?.length ?? 0, clients: cs.count ?? 0, maintenance, outstanding });

      // Revenue by month (last 6)
      const months: Record<string, { revenue: number; bookings: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        months[d.toLocaleDateString("en-GB", { month: "short" })] = { revenue: 0, bookings: 0 };
      }
      (pays.data ?? []).forEach((x) => {
        const k = new Date(x.paid_at).toLocaleDateString("en-GB", { month: "short" });
        if (k in months) months[k].revenue += Number(x.amount);
      });
      (bks.data ?? []).forEach((x) => {
        const k = new Date(x.created_at).toLocaleDateString("en-GB", { month: "short" });
        if (k in months) months[k].bookings += 1;
      });
      setByMonth(Object.entries(months).map(([month, v]) => ({ month, ...v })));

      // Status breakdown
      const sCount: Record<string, number> = {};
      (bks.data ?? []).forEach((b) => { sCount[b.status] = (sCount[b.status] ?? 0) + 1; });
      setByStatus(Object.entries(sCount).map(([name, value]) => ({ name, value })));

      // Top vehicles by bookings
      const vMap: Record<string, number> = {};
      (bks.data ?? []).forEach((b) => { if (b.vehicle_id) vMap[b.vehicle_id] = (vMap[b.vehicle_id] ?? 0) + 1; });
      const vById = new Map((vs.data ?? []).map((v) => [v.id, `${v.make} ${v.model} (${v.registration_no})`]));
      setTopVehicles(Object.entries(vMap).map(([id, n]) => ({ name: vById.get(id) ?? id, bookings: n })).sort((a, b) => b.bookings - a.bookings).slice(0, 5));

      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Total Revenue", value: fmtMoney(stats.revenue), icon: Receipt, color: "from-blue-500 to-blue-700" },
    { label: "Outstanding", value: fmtMoney(stats.outstanding), icon: TrendingUp, color: "from-orange-500 to-red-600" },
    { label: "Total Bookings", value: stats.bookings, icon: TrendingUp, color: "from-emerald-500 to-emerald-700" },
    { label: "Fleet Size", value: stats.vehicles, icon: Car, color: "from-violet-500 to-purple-600" },
    { label: "Clients", value: stats.clients, icon: Users, color: "from-pink-500 to-rose-600" },
    { label: "Maintenance Cost", value: fmtMoney(stats.maintenance), icon: Wrench, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="space-y-5">
      <div><h1 className="font-display">Reports & Analytics</h1><p className="text-sm text-muted-foreground">Live KPIs from your data</p></div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="glass-strong border p-4 relative overflow-hidden">
            <div className={`absolute -right-4 -top-4 size-16 rounded-full bg-gradient-to-br ${k.color} opacity-15 blur-xl`} />
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">{k.label}</div>
            <div className="text-lg font-bold mt-1">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="glass-strong border p-5 lg:col-span-2">
          <div className="font-semibold mb-3">Revenue & Bookings — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#2563EB" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="bookings" fill="#F97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-strong border p-5">
          <div className="font-semibold mb-3">Booking Status</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="glass-strong border p-5">
        <div className="font-semibold mb-3">Top 5 Vehicles by Bookings</div>
        {topVehicles.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No bookings recorded yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, topVehicles.length * 40)}>
            <BarChart data={topVehicles} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" width={180} fontSize={11} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#2563EB" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
