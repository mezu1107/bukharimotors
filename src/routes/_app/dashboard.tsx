import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  FileDown,
  FileText,
  Loader2,
  Receipt,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { downloadBookingPdf } from "@/lib/booking-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

type BookingRow = {
  id: string;
  booking_no: string;
  client_id: string;
  vehicle_id: string;
  status: string;
  pickup_at: string;
  dropoff_at: string;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  created_at: string;
};

type ClientRow = { id: string; full_name: string; phone: string };
type VehicleRow = {
  id: string;
  make: string;
  model: string;
  registration_no: string;
  status: string;
};
type PaymentRow = { amount: number; paid_at: string };

type DashboardData = {
  bookings: BookingRow[];
  clients: ClientRow[];
  vehicles: VehicleRow[];
  payments: PaymentRow[];
};

const emptyData: DashboardData = { bookings: [], clients: [], vehicles: [], payments: [] };

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [bookings, clients, vehicles, payments] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, booking_no, client_id, vehicle_id, status, pickup_at, dropoff_at, total_amount, advance_amount, balance_amount, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("clients")
        .select("id, full_name, phone")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("vehicles")
        .select("id, make, model, registration_no, status")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("payments")
        .select("amount, paid_at")
        .order("paid_at", { ascending: false })
        .limit(1000),
    ]);

    const firstError = bookings.error || clients.error || vehicles.error || payments.error;
    if (firstError) {
      setError(firstError.message);
      toast.error(firstError.message);
      setLoading(false);
      return;
    }

    setData({
      bookings: (bookings.data ?? []) as BookingRow[],
      clients: (clients.data ?? []) as ClientRow[],
      vehicles: (vehicles.data ?? []) as VehicleRow[],
      payments: (payments.data ?? []) as PaymentRow[],
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-live-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const clientMap = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients]);
  const vehicleMap = useMemo(() => new Map(data.vehicles.map((v) => [v.id, v])), [data.vehicles]);

  const summary = useMemo(() => {
    const activeStatuses = new Set(["confirmed", "active", "pending"]);
    const completed = data.bookings.filter((b) => b.status === "completed").length;
    const active = data.bookings.filter((b) => activeStatuses.has(b.status)).length;
    const bookingSales = data.bookings.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);
    const advances = data.bookings.reduce((sum, b) => sum + Number(b.advance_amount ?? 0), 0);
    const balances = data.bookings.reduce((sum, b) => sum + Number(b.balance_amount ?? 0), 0);
    const received = data.payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const availableVehicles = data.vehicles.filter((v) => v.status === "available").length;
    const last30 = Date.now() - 30 * 86400000;
    const sales30 = data.bookings
      .filter((b) => new Date(b.created_at).getTime() >= last30)
      .reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);
    return {
      active,
      completed,
      bookingSales,
      advances,
      balances,
      received,
      availableVehicles,
      sales30,
    };
  }, [data]);

  const trend = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      buckets[d.toLocaleDateString("en-GB", { weekday: "short" })] = 0;
    }
    data.bookings.forEach((b) => {
      const key = new Date(b.created_at).toLocaleDateString("en-GB", { weekday: "short" });
      if (key in buckets) buckets[key] += Number(b.total_amount ?? 0);
    });
    const max = Math.max(...Object.values(buckets), 1);
    return Object.entries(buckets).map(([day, amount]) => ({
      day,
      amount,
      pct: Math.max(6, (amount / max) * 100),
    }));
  }, [data.bookings]);

  const recentBookings = data.bookings.slice(0, 6);

  const download = async (id: string) => {
    setDownloading(id);
    try {
      const no = await downloadBookingPdf(id);
      toast.success(`Downloaded ${no}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Live Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real database totals for bookings, sales, clients, vehicles, balances and downloads.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" /> {error}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total Bookings" value={data.bookings.length} icon={FileText} />
        <Metric label="Booking Sales" value={fmtMoney(summary.bookingSales)} icon={TrendingUp} />
        <Metric
          label="Received"
          value={fmtMoney(summary.received || summary.advances)}
          icon={Receipt}
        />
        <Metric label="Balance Due" value={fmtMoney(summary.balances)} icon={Clock} />
        <Metric label="Active Bookings" value={summary.active} icon={Calendar} />
        <Metric label="Completed" value={summary.completed} icon={CheckCircle2} />
        <Metric label="Clients" value={data.clients.length} icon={Users} />
        <Metric
          label="Available Cars"
          value={`${summary.availableVehicles}/${data.vehicles.length}`}
          icon={Car}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">7-Day Sales Trend</div>
              <div className="text-xs text-muted-foreground">
                Based on booking totals from the database
              </div>
            </div>
            <Badge variant="secondary">30d {fmtMoney(summary.sales30)}</Badge>
          </div>
          <div className="flex h-56 items-end gap-3 rounded-lg bg-secondary/50 p-4">
            {trend.map((item) => (
              <div
                key={item.day}
                className="flex h-full flex-1 flex-col justify-end gap-2 text-center"
              >
                <div className="flex flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-primary"
                    style={{ height: `${item.pct}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">{item.day}</div>
                <div className="text-[10px] font-semibold">{fmtMoney(item.amount)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border bg-card p-5 shadow-sm">
          <div className="mb-3 font-semibold">Quick Actions</div>
          <div className="space-y-2 text-sm">
            <Link
              to="/bookings/new"
              className="flex items-center gap-3 rounded-md p-3 transition hover:bg-accent"
            >
              <FileText className="size-4 text-primary" /> New Rental Agreement
            </Link>
            <Link
              to="/bookings"
              className="flex items-center gap-3 rounded-md p-3 transition hover:bg-accent"
            >
              <FileDown className="size-4 text-primary" /> Search & Download PDFs
            </Link>
            <Link
              to="/clients"
              className="flex items-center gap-3 rounded-md p-3 transition hover:bg-accent"
            >
              <Users className="size-4 text-primary" /> Clients
            </Link>
            <Link
              to="/vehicles"
              className="flex items-center gap-3 rounded-md p-3 transition hover:bg-accent"
            >
              <Car className="size-4 text-primary" /> Fleet
            </Link>
          </div>
        </Card>
      </div>

      <Card className="border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">Recent Bookings</div>
            <div className="text-xs text-muted-foreground">
              Latest records pulled live from database
            </div>
          </div>
          <Link to="/bookings">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {recentBookings.map((b) => {
            const client = clientMap.get(b.client_id);
            const vehicle = vehicleMap.get(b.vehicle_id);
            return (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{b.booking_no}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">
                    {client?.full_name ?? "Unknown client"}{" "}
                    <span className="font-normal text-muted-foreground">
                      •{" "}
                      {vehicle
                        ? `${vehicle.make} ${vehicle.model} (${vehicle.registration_no})`
                        : "Unknown vehicle"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDateTime(b.pickup_at)} → {fmtDateTime(b.dropoff_at)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-bold">{fmtMoney(b.total_amount)}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downloading === b.id}
                    onClick={() => download(b.id)}
                  >
                    {downloading === b.id ? (
                      <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                      <FileDown className="mr-1 size-4" />
                    )}
                    PDF
                  </Button>
                </div>
              </div>
            );
          })}
          {recentBookings.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No booking records found in the database.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof FileText;
}) {
  return (
    <Card className="border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 truncate text-2xl font-bold">{value}</div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "cancelled" ? "destructive" : status === "completed" ? "secondary" : "default";
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}
