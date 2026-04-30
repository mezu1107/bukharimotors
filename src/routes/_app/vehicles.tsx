import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Car as CarIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/vehicles")({
  component: VehiclesPage,
});

interface Vehicle {
  id: string; make: string; model: string; year: number | null; registration_no: string;
  color: string | null; daily_rate: number; status: string; current_odometer: number | null;
}

function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ make: "", model: "", year: "", registration_no: "", color: "", daily_rate: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setItems((data ?? []) as Vehicle[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("vehicles").insert({
      make: form.make, model: form.model,
      year: form.year ? parseInt(form.year) : null,
      registration_no: form.registration_no,
      color: form.color || null,
      daily_rate: parseFloat(form.daily_rate || "0"),
    });
    if (error) toast.error(error.message);
    else { toast.success("Vehicle added"); setOpen(false); setForm({ make: "", model: "", year: "", registration_no: "", color: "", daily_rate: "" }); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const filtered = items.filter((v) =>
    `${v.make} ${v.model} ${v.registration_no}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Fleet / Vehicles</h1>
          <p className="text-sm text-muted-foreground">{items.length} vehicles in your fleet</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-elegant"><Plus className="size-4 mr-1.5" /> Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Vehicle</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Make</Label><Input required value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
                <div><Label>Model</Label><Input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
                <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
                <div><Label>Color</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
              </div>
              <div><Label>Registration #</Label><Input required value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} /></div>
              <div><Label>Daily Rate (PKR)</Label><Input type="number" required value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></div>
              <Button type="submit" className="bg-gradient-primary mt-2">Save Vehicle</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search by make, model, or registration…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass-strong border-0 shadow-elegant p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <CarIcon className="size-6 text-primary-foreground" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.status === "available" ? "bg-success/15 text-success" : v.status === "rented" ? "bg-warning/15 text-warning" : "bg-muted"}`}>{v.status}</span>
                </div>
                <div className="font-bold text-lg">{v.make} {v.model}</div>
                <div className="text-xs text-muted-foreground">{v.year} • {v.color ?? "—"}</div>
                <div className="text-sm font-mono mt-1 text-primary">{v.registration_no}</div>
                <div className="flex items-end justify-between mt-4 pt-3 border-t border-border/50">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Daily Rate</div>
                    <div className="font-bold text-gold-gradient">{fmtMoney(v.daily_rate)}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition" onClick={() => handleDelete(v.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <Card className="glass-strong border-0 p-12 text-center sm:col-span-2 lg:col-span-3">
              <CarIcon className="size-12 text-muted-foreground mx-auto mb-3" />
              <div className="font-semibold">No vehicles yet</div>
              <div className="text-sm text-muted-foreground">Click "Add Vehicle" to get started</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
