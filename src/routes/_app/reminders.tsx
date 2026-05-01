import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Bell, Loader2, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/reminders")({ component: RemindersPage });

interface Reminder {
  id: string; title: string; description: string | null; due_at: string; is_done: boolean;
}

function RemindersPage() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_at: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("reminders").select("*").order("due_at", { ascending: true });
    if (error) toast.error(error.message); else setItems((data ?? []) as Reminder[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("reminders").insert({
      title: form.title, description: form.description || null,
      due_at: new Date(form.due_at).toISOString(),
    });
    if (error) toast.error(error.message);
    else { toast.success("Reminder set"); setOpen(false); setForm({ title: "", description: "", due_at: "" }); load(); }
  };
  const toggle = async (r: Reminder) => {
    const { error } = await supabase.from("reminders").update({ is_done: !r.is_done, done_at: !r.is_done ? new Date().toISOString() : null }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-display">Reminders</h1><p className="text-sm text-muted-foreground">{items.filter((r) => !r.is_done).length} pending • {items.length} total</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary"><Plus className="size-4 mr-1.5" /> Add Reminder</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3">
              <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Due Date/Time</Label><Input type="datetime-local" required value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="bg-gradient-primary mt-2">Save Reminder</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-2">
          {items.map((r) => {
            const overdue = !r.is_done && new Date(r.due_at) < new Date();
            return (
              <Card key={r.id} className={`border p-3 flex items-center gap-3 ${r.is_done ? "opacity-60 bg-muted/40" : overdue ? "border-destructive/40 bg-destructive/5" : "glass-strong"}`}>
                <Checkbox checked={r.is_done} onCheckedChange={() => toggle(r)} />
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${r.is_done ? "line-through" : ""}`}>{r.title}</div>
                  {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                  <div className={`text-xs mt-0.5 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{overdue && "⚠ Overdue • "}Due: {fmtDateTime(r.due_at)}</div>
                </div>
                {r.is_done && <Check className="size-4 text-success" />}
                <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(r.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
              </Card>
            );
          })}
          {items.length === 0 && <Card className="glass-strong border p-12 text-center"><Bell className="size-12 text-muted-foreground mx-auto mb-3" /><div className="font-semibold">No reminders</div></Card>}
        </div>
      )}
    </div>
  );
}
