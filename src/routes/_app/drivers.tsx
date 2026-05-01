import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, UserCog, Loader2, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/drivers")({ component: DriversPage });

interface Driver {
  id: string; full_name: string; phone: string; cnic: string | null;
  license_no: string | null; daily_rate: number; status: string; rating: number | null; total_trips: number;
}

function DriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", cnic: "", license_no: "", daily_rate: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setItems((data ?? []) as Driver[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("drivers").insert({
      full_name: form.full_name, phone: form.phone,
      cnic: form.cnic || null, license_no: form.license_no || null,
      daily_rate: parseFloat(form.daily_rate || "0"),
    });
    if (error) toast.error(error.message);
    else { toast.success("Driver added"); setOpen(false); setForm({ full_name: "", phone: "", cnic: "", license_no: "", daily_rate: "" }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this driver?")) return;
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-display">Drivers</h1><p className="text-sm text-muted-foreground">{items.length} drivers on roster</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> Add Driver</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Driver</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3">
              <div><Label>Full Name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>CNIC</Label><Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} /></div>
                <div><Label>License #</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
                <div><Label>Daily Rate</Label><Input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></div>
              </div>
              <Button type="submit" className="bg-gradient-primary mt-2">Save Driver</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass-strong border p-5 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-11 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">{d.full_name[0]?.toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{d.full_name}</div>
                    <div className="text-xs text-muted-foreground">{d.phone}</div>
                  </div>
                  <span className="ml-auto text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">{d.status}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {d.license_no && <div>License: <span className="font-mono text-foreground">{d.license_no}</span></div>}
                  {d.cnic && <div>CNIC: <span className="font-mono text-foreground">{d.cnic}</span></div>}
                </div>
                <div className="flex items-end justify-between mt-3 pt-3 border-t">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Rate</div>
                    <div className="font-bold text-cta-gradient">{fmtMoney(d.daily_rate)}/day</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs"><Star className="size-3.5 fill-cta text-cta" />{Number(d.rating ?? 0).toFixed(1)} • {d.total_trips} trips</div>
                  <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => remove(d.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </Card>
            </motion.div>
          ))}
          {items.length === 0 && (
            <Card className="glass-strong border p-12 text-center sm:col-span-2 lg:col-span-3">
              <UserCog className="size-12 text-muted-foreground mx-auto mb-3" />
              <div className="font-semibold">No drivers yet</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
