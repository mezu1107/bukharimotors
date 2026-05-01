import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ClipboardCheck, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/inspections")({ component: InspectionsPage });

interface Insp {
  id: string; type: string; inspected_at: string; odometer: number | null; fuel_level: string | null;
  exterior_condition: string | null; interior_condition: string | null; damage_notes: string | null;
  booking: { booking_no: string } | null;
}

function InspectionsPage() {
  const [items, setItems] = useState<Insp[]>([]);
  const [bookings, setBookings] = useState<{ id: string; booking_no: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ booking_id: "", type: "checkout", odometer: "", fuel_level: "full", exterior_condition: "", interior_condition: "", damage_notes: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: i }, { data: b }] = await Promise.all([
      supabase.from("inspections").select("*, booking:bookings(booking_no)").order("inspected_at", { ascending: false }),
      supabase.from("bookings").select("id, booking_no").order("created_at", { ascending: false }),
    ]);
    setItems((i ?? []) as unknown as Insp[]);
    setBookings(b ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("inspections").insert({
      booking_id: form.booking_id, type: form.type as never,
      odometer: form.odometer ? parseFloat(form.odometer) : null,
      fuel_level: form.fuel_level || null,
      exterior_condition: form.exterior_condition || null,
      interior_condition: form.interior_condition || null,
      damage_notes: form.damage_notes || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Inspection saved"); setOpen(false); setForm({ booking_id: "", type: "checkout", odometer: "", fuel_level: "full", exterior_condition: "", interior_condition: "", damage_notes: "" }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("inspections").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-display">Inspections</h1><p className="text-sm text-muted-foreground">{items.length} inspection reports</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> New Inspection</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Vehicle Inspection</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3">
              <div>
                <Label>Booking</Label>
                <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                  <SelectContent>{bookings.map((b) => <SelectItem key={b.id} value={b.id}>{b.booking_no}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="checkout">Check-out</SelectItem><SelectItem value="checkin">Check-in</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Odometer (km)</Label><Input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
                <div>
                  <Label>Fuel Level</Label>
                  <Select value={form.fuel_level} onValueChange={(v) => setForm({ ...form, fuel_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["empty", "1/4", "1/2", "3/4", "full"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Exterior</Label><Input value={form.exterior_condition} onChange={(e) => setForm({ ...form, exterior_condition: e.target.value })} placeholder="Good, scratched…" /></div>
                <div className="col-span-2"><Label>Interior</Label><Input value={form.interior_condition} onChange={(e) => setForm({ ...form, interior_condition: e.target.value })} /></div>
              </div>
              <div><Label>Damage Notes</Label><Textarea rows={2} value={form.damage_notes} onChange={(e) => setForm({ ...form, damage_notes: e.target.value })} /></div>
              <Button type="submit" className="bg-gradient-primary mt-2" disabled={!form.booking_id}>Save Inspection</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <Card key={r.id} className="glass-strong border p-4 flex items-start gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${r.type === "checkout" ? "bg-cta/15 text-cta" : "bg-success/15 text-success"}`}><ClipboardCheck className="size-5" /></div>
              <div className="flex-1">
                <div className="font-semibold capitalize">{r.type} • <span className="font-mono text-primary">{r.booking?.booking_no}</span></div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(r.inspected_at)} • Odo: {r.odometer ?? "—"} km • Fuel: {r.fuel_level ?? "—"}</div>
                {r.damage_notes && <div className="text-sm text-destructive mt-1">⚠ {r.damage_notes}</div>}
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(r.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
            </Card>
          ))}
          {items.length === 0 && <Card className="glass-strong border p-12 text-center"><ClipboardCheck className="size-12 text-muted-foreground mx-auto mb-3" /><div className="font-semibold">No inspections yet</div></Card>}
        </div>
      )}
    </div>
  );
}
