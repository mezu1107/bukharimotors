import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Plus, Search, Trash2, MessageCircle, FileDown } from "lucide-react";
import { toast } from "sonner";
import { downloadBookingPdf } from "@/lib/booking-pdf";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { openWhatsApp, shareBookingMessage } from "@/lib/whatsapp";

export const Route = createFileRoute("/_app/bookings/")({ component: BookingsPage });

interface Row {
  id: string; booking_no: string; status: string;
  pickup_at: string; dropoff_at: string;
  total_amount: number; advance_amount: number; balance_amount: number;
  client: { full_name: string; phone: string } | null;
  vehicle: { make: string; model: string; registration_no: string } | null;
}

const STATUSES = ["pending", "confirmed", "active", "completed", "cancelled"];

function BookingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_no, status, pickup_at, dropoff_at, total_amount, advance_amount, balance_amount, client:clients(full_name, phone), vehicle:vehicles(make, model, registration_no)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatusFor = async (id: string, s: string) => {
    const { error } = await supabase.from("bookings").update({ status: s as never }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };
  const [downloading, setDownloading] = useState<string | null>(null);
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

  const filtered = rows.filter((r) => {
    const matchQ = `${r.booking_no} ${r.client?.full_name ?? ""} ${r.vehicle?.registration_no ?? ""}`.toLowerCase().includes(q.toLowerCase());
    const matchS = status === "all" || r.status === status;
    return matchQ && matchS;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display">Bookings</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total agreements</p>
        </div>
        <Link to="/bookings/new"><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> New Booking</Button></Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search booking, client, reg…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="glass-strong border p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-primary">{r.booking_no}</span>
                      <StatusBadge s={r.status} />
                    </div>
                    <div className="font-semibold mt-1 truncate">{r.client?.full_name ?? "—"} <span className="text-muted-foreground font-normal">• {r.client?.phone}</span></div>
                    <div className="text-sm text-muted-foreground">{r.vehicle?.make} {r.vehicle?.model} ({r.vehicle?.registration_no})</div>
                    <div className="text-xs text-muted-foreground mt-1">{fmtDateTime(r.pickup_at)} → {fmtDateTime(r.dropoff_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-bold text-lg">{fmtMoney(r.total_amount)}</div>
                    <div className="text-xs text-cta-gradient font-semibold">Bal: {fmtMoney(r.balance_amount)}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                  <Select value={r.status} onValueChange={(v) => setStatusFor(r.id, v)}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" disabled={downloading === r.id} onClick={() => download(r.id)}>
                    {downloading === r.id ? <Loader2 className="size-4 mr-1 animate-spin" /> : <FileDown className="size-4 mr-1" />}
                    PDF
                  </Button>
                  {r.client && (
                    <Button variant="outline" size="sm" onClick={() => openWhatsApp(r.client!.phone, shareBookingMessage({
                      bookingNo: r.booking_no, clientName: r.client!.full_name,
                      vehicle: `${r.vehicle?.make} ${r.vehicle?.model} (${r.vehicle?.registration_no})`,
                      pickup: fmtDateTime(r.pickup_at), dropoff: fmtDateTime(r.dropoff_at),
                      total: r.total_amount, advance: r.advance_amount, balance: r.balance_amount,
                    }))}><MessageCircle className="size-4 mr-1" /> WhatsApp</Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => remove(r.id)}><Trash2 className="size-4" /></Button>
                </div>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <Card className="glass-strong border p-12 text-center">
              <FileText className="size-12 text-muted-foreground mx-auto mb-3" />
              <div className="font-semibold">No bookings yet</div>
              <Link to="/bookings/new" className="text-primary text-sm hover:underline">Create your first agreement</Link>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    confirmed: "bg-primary/10 text-primary",
    active: "bg-success/15 text-success",
    completed: "bg-secondary text-secondary-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${map[s] ?? "bg-muted"}`}>{s}</span>;
}
