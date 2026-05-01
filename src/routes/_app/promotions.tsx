import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Gift, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/promotions")({ component: PromotionsPage });

interface Promo {
  id: string; name: string; code: string | null; description: string | null;
  discount_pct: number | null; discount_amount: number | null;
  valid_from: string | null; valid_to: string | null; active: boolean;
}

function PromotionsPage() {
  const [items, setItems] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", discount_pct: "", discount_amount: "", valid_from: "", valid_to: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setItems((data ?? []) as Promo[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("promotions").insert({
      name: form.name, code: form.code || null, description: form.description || null,
      discount_pct: form.discount_pct ? parseFloat(form.discount_pct) : null,
      discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : null,
      valid_from: form.valid_from || null, valid_to: form.valid_to || null, active: true,
    });
    if (error) toast.error(error.message);
    else { toast.success("Promotion created"); setOpen(false); setForm({ name: "", code: "", description: "", discount_pct: "", discount_amount: "", valid_from: "", valid_to: "" }); load(); }
  };
  const toggle = async (p: Promo) => {
    const { error } = await supabase.from("promotions").update({ active: !p.active }).eq("id", p.id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-display">Loyalty & Promotions</h1><p className="text-sm text-muted-foreground">{items.length} promo codes</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> New Promo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Promotion</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EID2026" /></div>
                <div><Label>Discount %</Label><Input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} /></div>
                <div><Label>Discount (PKR)</Label><Input type="number" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} /></div>
                <div><Label>Valid From</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
                <div><Label>Valid To</Label><Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="bg-gradient-primary mt-2">Save Promotion</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <Card key={p.id} className="glass-strong border p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 size-20 rounded-full bg-gradient-cta opacity-15 blur-xl" />
              <div className="flex items-start justify-between">
                <div className="size-10 rounded-lg bg-gradient-cta flex items-center justify-center shrink-0"><Gift className="size-5 text-cta-foreground" /></div>
                <Switch checked={p.active} onCheckedChange={() => toggle(p)} />
              </div>
              <div className="font-bold mt-3">{p.name}</div>
              {p.code && <div className="font-mono text-sm text-cta-gradient font-bold">{p.code}</div>}
              {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
              <div className="text-2xl font-bold mt-2 text-cta-gradient">
                {p.discount_pct ? `${p.discount_pct}%` : p.discount_amount ? `PKR ${p.discount_amount.toLocaleString()}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
                <span>{p.valid_from ? fmtDate(p.valid_from) : "—"} → {p.valid_to ? fmtDate(p.valid_to) : "—"}</span>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(p.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && (
            <Card className="glass-strong border p-12 text-center sm:col-span-2 lg:col-span-3">
              <Gift className="size-12 text-muted-foreground mx-auto mb-3" /><div className="font-semibold">No promotions yet</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
