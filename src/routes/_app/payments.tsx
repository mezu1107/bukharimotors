import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/payments")({ component: PaymentsPage });

interface Payment {
  id: string; amount: number; method: string; paid_at: string; reference_no: string | null; notes: string | null;
  booking: { booking_no: string; client: { full_name: string } | null } | null;
}

function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<{ id: string; booking_no: string; balance_amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ booking_id: "", amount: "", method: "cash", reference_no: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: b }] = await Promise.all([
      supabase.from("payments").select("id, amount, method, paid_at, reference_no, notes, booking:bookings(booking_no, client:clients(full_name))").order("paid_at", { ascending: false }),
      supabase.from("bookings").select("id, booking_no, balance_amount").order("created_at", { ascending: false }),
    ]);
    setItems((p ?? []) as unknown as Payment[]);
    setBookings(b ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("payments").insert({
      booking_id: form.booking_id, amount: parseFloat(form.amount),
      method: form.method as never, reference_no: form.reference_no || null, notes: form.notes || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Payment recorded"); setOpen(false); setForm({ booking_id: "", amount: "", method: "cash", reference_no: "", notes: "" }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this payment?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const total = items.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display">Payments</h1>
          <p className="text-sm text-muted-foreground">{items.length} transactions • Total {fmtMoney(total)}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> Record Payment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Payment</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3">
              <div>
                <Label>Booking</Label>
                <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                  <SelectContent>{bookings.map((b) => <SelectItem key={b.id} value={b.id}>{b.booking_no} (Bal: {fmtMoney(b.balance_amount)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount</Label><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div>
                  <Label>Method</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="jazzcash">JazzCash</SelectItem>
                      <SelectItem value="easypaisa">Easypaisa</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference #</Label><Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="bg-gradient-primary mt-2" disabled={!form.booking_id}>Save Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <Card key={p.id} className="glass-strong border p-4 flex items-center justify-between gap-3">
              <div className="size-10 rounded-lg bg-gradient-cta flex items-center justify-center shrink-0"><Receipt className="size-5 text-cta-foreground" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.booking?.client?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{p.booking?.booking_no} • {p.method.replace("_", " ")} • {fmtDateTime(p.paid_at)}</div>
                {p.reference_no && <div className="text-xs font-mono text-muted-foreground">Ref: {p.reference_no}</div>}
              </div>
              <div className="text-right">
                <div className="font-bold text-success">{fmtMoney(p.amount)}</div>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(p.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && (
            <Card className="glass-strong border p-12 text-center">
              <Receipt className="size-12 text-muted-foreground mx-auto mb-3" />
              <div className="font-semibold">No payments yet</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
