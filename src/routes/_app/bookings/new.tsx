import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, FileDown, MessageCircle } from "lucide-react";
import { generateRentalPdf } from "@/lib/pdf";
import { openWhatsApp, shareBookingMessage } from "@/lib/whatsapp";
import { daysBetween, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/bookings/new")({ component: NewBooking });

function NewBooking() {
  const navigate = useNavigate();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [clients, setClients] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; make: string; model: string; registration_no: string; daily_rate: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: "", vehicle_id: "",
    pickup_at: "", dropoff_at: "",
    pickup_location: "", dropoff_location: "",
    daily_rate: "", advance_amount: "", security_deposit: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const [c, v] = await Promise.all([
        supabase.from("clients").select("id, full_name, phone").order("full_name"),
        supabase.from("vehicles").select("id, make, model, registration_no, daily_rate").eq("status", "available"),
      ]);
      setClients(c.data ?? []);
      setVehicles(v.data ?? []);
    })();
  }, []);

  const selVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const selClient = clients.find((c) => c.id === form.client_id);
  const days = form.pickup_at && form.dropoff_at ? daysBetween(form.pickup_at, form.dropoff_at) : 0;
  const dailyRate = parseFloat(form.daily_rate || (selVehicle?.daily_rate?.toString() ?? "0"));
  const total = dailyRate * days;
  const advance = parseFloat(form.advance_amount || "0");
  const balance = total - advance;

  const handleSave = async (alsoShare: boolean) => {
    if (!form.client_id || !form.vehicle_id || !form.pickup_at || !form.dropoff_at) {
      toast.error("Please fill client, vehicle, and dates");
      return;
    }
    setSaving(true);
    const sigData = sigRef.current && !sigRef.current.isEmpty() ? sigRef.current.getCanvas().toDataURL("image/png") : null;
    const { data, error } = await supabase.from("bookings").insert([{
      booking_no: "",
      client_id: form.client_id,
      vehicle_id: form.vehicle_id,
      pickup_at: new Date(form.pickup_at).toISOString(),
      dropoff_at: new Date(form.dropoff_at).toISOString(),
      pickup_location: form.pickup_location || null,
      dropoff_location: form.dropoff_location || null,
      daily_rate: dailyRate,
      total_amount: total,
      advance_amount: advance,
      balance_amount: balance,
      security_deposit: parseFloat(form.security_deposit || "0"),
      notes: form.notes || null,
      signature_url: sigData,
      terms_accepted: true,
      status: "confirmed",
    }]).select("booking_no").single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    toast.success(`Booking ${data.booking_no} created`);

    // Generate PDF
    const doc = generateRentalPdf({
      bookingNo: data.booking_no,
      createdAt: new Date().toISOString(),
      client: { name: selClient!.full_name, phone: selClient!.phone },
      vehicle: { make: selVehicle!.make, model: selVehicle!.model, reg: selVehicle!.registration_no },
      pickup_at: form.pickup_at, dropoff_at: form.dropoff_at,
      pickup_location: form.pickup_location, dropoff_location: form.dropoff_location,
      daily_rate: dailyRate, days, total, advance, balance,
      security_deposit: parseFloat(form.security_deposit || "0"),
      notes: form.notes,
      signature_dataurl: sigData,
    });
    doc.save(`${data.booking_no}.pdf`);

    if (alsoShare && selClient) {
      openWhatsApp(selClient.phone, shareBookingMessage({
        bookingNo: data.booking_no, clientName: selClient.full_name,
        vehicle: `${selVehicle!.make} ${selVehicle!.model} (${selVehicle!.registration_no})`,
        pickup: fmtDateTime(form.pickup_at), dropoff: fmtDateTime(form.dropoff_at),
        total, advance, balance,
      }));
    }
    navigate({ to: "/bookings" });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div><h1 className="text-2xl font-bold">New Rental Agreement</h1><p className="text-sm text-muted-foreground">Fill the form, generate PDF, and share via WhatsApp</p></div>

      <Card className="glass-strong border-0 p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vehicle *</Label>
            <Select value={form.vehicle_id} onValueChange={(v) => {
              const vh = vehicles.find((x) => x.id === v);
              setForm({ ...form, vehicle_id: v, daily_rate: vh ? String(vh.daily_rate) : form.daily_rate });
            }}>
              <SelectTrigger><SelectValue placeholder="Select available vehicle" /></SelectTrigger>
              <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} — {v.registration_no}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Pickup Date/Time *</Label><Input type="datetime-local" value={form.pickup_at} onChange={(e) => setForm({ ...form, pickup_at: e.target.value })} /></div>
          <div><Label>Drop-off Date/Time *</Label><Input type="datetime-local" value={form.dropoff_at} onChange={(e) => setForm({ ...form, dropoff_at: e.target.value })} /></div>
          <div><Label>Pickup Location</Label><Input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} /></div>
          <div><Label>Drop-off Location</Label><Input value={form.dropoff_location} onChange={(e) => setForm({ ...form, dropoff_location: e.target.value })} /></div>
          <div><Label>Daily Rate (PKR)</Label><Input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></div>
          <div><Label>Advance (PKR)</Label><Input type="number" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: e.target.value })} /></div>
          <div><Label>Security Deposit</Label><Input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center bg-muted/30 rounded-lg p-3">
          <div><div className="text-xs text-muted-foreground">Days</div><div className="font-bold text-lg">{days}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-bold text-lg text-gradient">PKR {total.toLocaleString()}</div></div>
          <div><div className="text-xs text-muted-foreground">Balance</div><div className="font-bold text-lg text-gold-gradient">PKR {balance.toLocaleString()}</div></div>
        </div>

        <div>
          <Label>Client Signature</Label>
          <div className="border rounded-lg bg-white mt-1.5">
            <SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full h-32" }} />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => sigRef.current?.clear()} className="mt-1 text-xs">Clear</Button>
        </div>

        <div className="flex gap-2 flex-wrap pt-2">
          <Button onClick={() => handleSave(false)} disabled={saving} className="bg-gradient-primary shadow-elegant">
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save & Download PDF
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} variant="outline">
            <MessageCircle className="size-4 mr-2" /> Save + WhatsApp Share
          </Button>
        </div>
      </Card>

      <span className="hidden"><FileDown /></span>
    </div>
  );
}
