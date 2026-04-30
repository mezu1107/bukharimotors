import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, User, Loader2, Phone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/clients")({
  component: ClientsPage,
});

interface Client {
  id: string; full_name: string; phone: string; cnic: string | null;
  address: string | null; license_no: string | null; total_bookings: number; total_spent: number;
}

function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<Client | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", cnic: "", address: "", license_no: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setItems((data ?? []) as Client[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Live duplicate detection
  useEffect(() => {
    if (!form.phone && !form.cnic) { setDuplicate(null); return; }
    const t = setTimeout(async () => {
      let q = supabase.from("clients").select("*").limit(1);
      if (form.cnic) q = q.eq("cnic", form.cnic);
      else q = q.eq("phone", form.phone);
      const { data } = await q;
      setDuplicate((data?.[0] as Client) ?? null);
    }, 400);
    return () => clearTimeout(t);
  }, [form.phone, form.cnic]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("clients").insert({
      full_name: form.full_name, phone: form.phone,
      cnic: form.cnic || null, address: form.address || null, license_no: form.license_no || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Client added"); setOpen(false); setForm({ full_name: "", phone: "", cnic: "", address: "", license_no: "" }); load(); }
  };

  const filtered = items.filter((c) => `${c.full_name} ${c.phone} ${c.cnic ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Clients (CRM)</h1>
          <p className="text-sm text-muted-foreground">{items.length} clients • smart duplicate detection</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary shadow-elegant"><Plus className="size-4 mr-1.5" /> Add Client</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="grid gap-3">
              <div><Label>Full Name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03001234567" /></div>
                <div><Label>CNIC</Label><Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="35201-XXXXXXX-X" /></div>
              </div>
              <div><Label>License #</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
              <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              {duplicate && (
                <div className="flex gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                  <AlertTriangle className="size-4 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-warning">Possible duplicate detected</div>
                    <div className="text-xs">Existing client: <strong>{duplicate.full_name}</strong> ({duplicate.phone})</div>
                  </div>
                </div>
              )}
              <Button type="submit" className="bg-gradient-primary mt-2">Save Client</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, or CNIC…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass-strong border-0 shadow-elegant p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-11 rounded-full bg-gradient-gold flex items-center justify-center font-bold text-gold-foreground">
                    {c.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="size-3" />{c.phone}</div>
                  </div>
                </div>
                {c.cnic && <div className="text-xs text-muted-foreground font-mono">{c.cnic}</div>}
                <div className="flex justify-between mt-3 pt-3 border-t border-border/50 text-xs">
                  <div><div className="text-muted-foreground">Bookings</div><div className="font-bold">{c.total_bookings}</div></div>
                  <div className="text-right"><div className="text-muted-foreground">Spent</div><div className="font-bold text-gold-gradient">{fmtMoney(c.total_spent)}</div></div>
                </div>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <Card className="glass-strong border-0 p-12 text-center sm:col-span-2 lg:col-span-3">
              <User className="size-12 text-muted-foreground mx-auto mb-3" />
              <div className="font-semibold">No clients yet</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
