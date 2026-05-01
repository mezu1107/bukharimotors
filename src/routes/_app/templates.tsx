import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/templates")({ component: TemplatesPage });

interface Tpl {
  id: string; name: string; description: string | null; schema: { sections?: { title: string; fields: { label: string; type: string }[] }[] };
  is_default: boolean; version: number; created_at: string;
}

const DEFAULT_SCHEMA = JSON.stringify({
  sections: [
    { title: "Client Info", fields: [{ label: "Full Name", type: "text" }, { label: "Phone", type: "tel" }, { label: "CNIC", type: "text" }] },
    { title: "Vehicle", fields: [{ label: "Registration", type: "text" }, { label: "Odometer Out", type: "number" }] },
    { title: "Charges", fields: [{ label: "Daily Rate", type: "number" }, { label: "Advance", type: "number" }] },
  ],
}, null, 2);

function TemplatesPage() {
  const [items, setItems] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", schema: DEFAULT_SCHEMA, is_default: false });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("form_templates").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setItems((data ?? []) as unknown as Tpl[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed;
    try { parsed = JSON.parse(form.schema); } catch { toast.error("Schema must be valid JSON"); return; }
    const { error } = await supabase.from("form_templates").insert({
      name: form.name, description: form.description || null, schema: parsed, is_default: form.is_default,
    });
    if (error) toast.error(error.message);
    else { toast.success("Template saved"); setOpen(false); setForm({ name: "", description: "", schema: DEFAULT_SCHEMA, is_default: false }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("form_templates").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-display">Form Templates</h1><p className="text-sm text-muted-foreground">{items.length} reusable rental form templates</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> New Template</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New Form Template</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3">
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Schema (JSON)</Label>
                <Textarea rows={10} className="font-mono text-xs" value={form.schema} onChange={(e) => setForm({ ...form, schema: e.target.value })} />
                <div className="text-xs text-muted-foreground mt-1">Define sections + fields. Each field needs a label and type.</div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /><Label>Set as default template</Label></div>
              <Button type="submit" className="bg-gradient-primary mt-2">Save Template</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <Card key={t.id} className="glass-strong border p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center"><Settings2 className="size-5 text-primary" /></div>
                {t.is_default && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-cta/15 text-cta font-bold">Default</span>}
              </div>
              <div className="font-bold">{t.name}</div>
              {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
              <div className="text-xs text-muted-foreground mt-2">{(t.schema?.sections ?? []).length} sections • v{t.version} • {fmtDate(t.created_at)}</div>
              <div className="flex justify-end mt-2"><Button size="icon" variant="ghost" className="size-7" onClick={() => remove(t.id)}><Trash2 className="size-3.5 text-destructive" /></Button></div>
            </Card>
          ))}
          {items.length === 0 && (
            <Card className="glass-strong border p-12 text-center sm:col-span-2 lg:col-span-3">
              <Settings2 className="size-12 text-muted-foreground mx-auto mb-3" /><div className="font-semibold">No templates yet</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
