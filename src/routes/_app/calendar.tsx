import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });

interface Booking {
  id: string; booking_no: string; status: string;
  pickup_at: string; dropoff_at: string; total_amount: number;
  vehicle: { make: string; model: string; registration_no: string } | null;
  client: { full_name: string } | null;
}

function CalendarPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString();
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_no, status, pickup_at, dropoff_at, total_amount, vehicle:vehicles(make, model, registration_no), client:clients(full_name)")
        .or(`pickup_at.lte.${end},dropoff_at.gte.${start}`);
      setRows((data ?? []) as unknown as Booking[]);
      setLoading(false);
    })();
  }, [cursor]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const arr: { date: Date; key: string }[] = [];
    for (let i = 0; i < first.getDay(); i++) arr.push({ date: new Date(0), key: `empty-${i}` });
    for (let d = 1; d <= last.getDate(); d++) {
      const dd = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      arr.push({ date: dd, key: dd.toISOString() });
    }
    return arr;
  }, [cursor]);

  const bookingsOn = (d: Date) => rows.filter((r) => {
    const p = new Date(r.pickup_at), q = new Date(r.dropoff_at);
    return d >= new Date(p.getFullYear(), p.getMonth(), p.getDate()) && d <= q;
  });

  const monthLabel = cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display">Calendar</h1>
          <p className="text-sm text-muted-foreground">Booking schedule by month</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <div className="font-semibold w-44 text-center">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <Card className="glass-strong border p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              if (d.date.getTime() === 0) return <div key={d.key} />;
              const list = bookingsOn(d.date);
              const isToday = d.date.toDateString() === new Date().toDateString();
              return (
                <div key={d.key} className={`min-h-[80px] rounded border p-1 text-xs ${isToday ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="font-bold text-foreground">{d.date.getDate()}</div>
                  <div className="space-y-0.5 mt-0.5">
                    {list.slice(0, 2).map((b) => (
                      <div key={b.id} className="truncate rounded bg-primary/10 text-primary px-1 py-0.5" title={`${b.booking_no} • ${b.client?.full_name} • ${fmtMoney(b.total_amount)}`}>
                        {b.vehicle?.registration_no ?? b.booking_no}
                      </div>
                    ))}
                    {list.length > 2 && <div className="text-muted-foreground">+{list.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
