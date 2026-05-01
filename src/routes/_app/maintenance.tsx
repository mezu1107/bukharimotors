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
import { Plus, Wrench, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/maintenance")({ component: MaintenancePage });

interface Rec {
  id: string; service_type: string; description: string | null; cost: number;
  scheduled_date: string | null; completed_date: string | null; next_service_date: string | null;
  performed_by: string | null;
  vehicle: { make: string; model: string; registration_no: string } | null;
}

function MaintenancePage() {
  const [items, setItems] = useState<Rec[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; make: string; model: string; registration_no: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", service_type: "", description: "", cost: "", scheduled_date: "", completed_date: "", next_service_date: "", performed_by: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: m }, { data: v }] = await Promise.all([
      supabase.from("maintenance_records").select("*, vehicle:vehicles(make, model, registration_no)").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id, make, model, registration_no").order("make"),
    ]);
    setItems((m ?? []) as unknown as Rec[]);
    setVehicles(v ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("maintenance_records").insert({
      vehicle_id: form.vehicle_id, service_type: form.service_type,
      description: form.description || null, cost: parseFloat(form.cost || "0"),
      scheduled_date: form.scheduled_date || null,
      completed_date: form.completed_date || null,
      next_service_date: form.next_service_date || null,
      performed_by: form.performed_by || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Record added"); setOpen(false); setForm({ vehicle_id: "", service_type: "", description: "", cost: "", scheduled_date: "", completed_date: "", next_service_date: "", performed_by: "" }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-display">Maintenance</h1><p className="text-sm text-muted-foreground">{items.length} service records</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> Add Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Maintenance Record</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3">
              <div>
                <Label>Vehicle</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} — {v.registration_no}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Service Type</Label><Input required placeholder="Oil change, tyres…" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} /></div>
                <div><Label>Cost (PKR)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
                <div><Label>Scheduled</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                <div><Label>Completed</Label><Input type="date" value={form.completed_date} onChange={(e) => setForm({ ...form, completed_date: e.target.value })} /></div>
                <div><Label>Next Service</Label><Input type="date" value={form.next_service_date} onChange={(e) => setForm({ ...form, next_service_date: e.target.value })} /></div>
                <div><Label>Performed By</Label><Input value={form.performed_by} onChange={(e) => setForm({ ...form, performed_by: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="bg-gradient-primary mt-2" disabled={!form.vehicle_id}>Save Record</Button>
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
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Wrench className="size-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{r.service_type} <span className="text-muted-foreground font-normal">— {r.vehicle?.make} {r.vehicle?.model} ({r.vehicle?.registration_no})</span></div>
                {r.description && <div className="text-sm text-muted-foreground">{r.description}</div>}
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  {r.completed_date && <span>Done: {fmtDate(r.completed_date)}</span>}
                  {r.scheduled_date && !r.completed_date && <span>Scheduled: {fmtDate(r.scheduled_date)}</span>}
                  {r.next_service_date && <span className="text-cta">Next: {fmtDate(r.next_service_date)}</span>}
                  {r.performed_by && <span>By: {r.performed_by}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{fmtMoney(r.cost)}</div>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(r.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && <Card className="glass-strong border p-12 text-center"><Wrench className="size-12 text-muted-foreground mx-auto mb-3" /><div className="font-semibold">No maintenance records yet</div></Card>}
        </div>
      )}
    </div>
  );
}
