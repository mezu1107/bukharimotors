import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowLeft, FileDown } from "lucide-react";
import { daysBetween, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/bookings/new")({ component: NewBooking });

interface CustomField { label: string; value: string }
function NewBooking() {
  
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [clients, setClients] = useState<{ id: string; full_name: string; phone: string; cnic: string | null; address: string | null; license_no: string | null }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; make: string; model: string; year: number | null; color: string | null; registration_no: string; daily_rate: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<null | "image" | "pdf" | "preview">(null);
  
  const [form, setForm] = useState({
    client_id: "", vehicle_id: "",
    pickup_at: "", dropoff_at: "",
    pickup_location: "", dropoff_location: "",
    daily_rate: "", advance_amount: "", security_deposit: "",
    odometer_out: "", odometer_in: "", fuel_level_out: "Full",
    notes: "", driver_name: "", driver_phone: "", toll_tax: "",
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    (async () => {
      const [c, v] = await Promise.all([
        supabase.from("clients").select("id, full_name, phone, cnic, address, license_no").order("full_name"),
        supabase.from("vehicles").select("id, make, model, year, color, registration_no, daily_rate").eq("status", "available"),
      ]);
      setClients(c.data ?? []);
      setVehicles(v.data ?? []);
      if (c.error) toast.error(c.error.message);
      if (v.error) toast.error(v.error.message);
    })();
  }, []);

  const selVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const selClient = clients.find((c) => c.id === form.client_id);
  const days = form.pickup_at && form.dropoff_at ? daysBetween(form.pickup_at, form.dropoff_at) : 0;
  const dailyRate = parseFloat(form.daily_rate || (selVehicle?.daily_rate?.toString() ?? "0"));
  const tollTax = parseFloat(form.toll_tax || "0");
  const total = dailyRate * days + tollTax;
  const advance = parseFloat(form.advance_amount || "0");
  const balance = total - advance;
  const odoIn = parseFloat(form.odometer_in || "0");
  const odoOut = parseFloat(form.odometer_out || "0");
  const totalReading = odoIn && odoOut ? Math.max(0, odoIn - odoOut) : 0;

  const validateForm = () => {
    if (!form.client_id || !form.vehicle_id || !form.pickup_at || !form.dropoff_at) {
      toast.error("Please fill client, vehicle, and dates");
      return false;
    }
    if (!form.driver_name.trim() || !form.driver_phone.trim()) {
      toast.error("Driver name and cell are required (we don't rent without driver)");
      return false;
    }
    if (days <= 0) { toast.error("Drop-off must be after pickup"); return false; }
    return true;
  };

  const bookingPayload = () => ({
    booking_no: "",
    client_id: form.client_id,
    vehicle_id: form.vehicle_id,
    pickup_at: new Date(form.pickup_at).toISOString(),
    dropoff_at: new Date(form.dropoff_at).toISOString(),
    pickup_location: form.pickup_location || null,
    dropoff_location: form.dropoff_location || null,
    odometer_out: form.odometer_out ? Number(form.odometer_out) : null,
    odometer_in: form.odometer_in ? Number(form.odometer_in) : null,
    fuel_level_out: form.fuel_level_out || null,
    daily_rate: dailyRate,
    extra_charges: tollTax,
    total_amount: total,
    advance_amount: advance,
    balance_amount: balance,
    security_deposit: parseFloat(form.security_deposit || "0"),
    with_driver: true,
    notes: form.notes || null,
    custom_fields: Object.fromEntries([
      ...customFields.filter(f => f.label).map(f => [f.label, f.value]),
      ["Driver Name", form.driver_name],
      ["Driver Cell", form.driver_phone],
      ...(form.toll_tax ? [["Toll Tax", form.toll_tax]] : []),
    ]),
    signature_url: sigRef.current && !sigRef.current.isEmpty() ? sigRef.current.getCanvas().toDataURL("image/png") : null,
    terms_accepted: true,
    status: "confirmed" as const,
  });

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setBusy("pdf");
    const { data, error } = await supabase.from("bookings").insert([bookingPayload()]).select("id, booking_no").single();
    if (error || !data) {
      setSaving(false); setBusy(null);
      toast.error(error?.message ?? "Failed to save");
      return;
    }
    toast.success(`Booking ${data.booking_no} created`);
    try {
      const { downloadBookingPdf } = await import("@/lib/booking-pdf");
      await downloadBookingPdf(data.id);
      toast.success("Invoice PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("PDF export failed. Please retry.");
    } finally {
      setBusy(null);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link to="/bookings"><Button size="icon" variant="ghost"><ArrowLeft className="size-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-display font-bold">New Rental Agreement</h1>
          <p className="text-sm text-muted-foreground">Fill the form and one click saves + downloads the invoice PDF.</p>
        </div>
      </div>

      <Card className="border bg-card p-5 space-y-4 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder={clients.length ? "Select client" : "No clients — add one first"} /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>)}</SelectContent>
            </Select>
            {clients.length === 0 && <Link to="/clients" className="text-xs text-primary hover:underline">+ Add client</Link>}
          </div>
          <div>
            <Label>Vehicle *</Label>
            <Select value={form.vehicle_id} onValueChange={(v) => {
              const vh = vehicles.find((x) => x.id === v);
              setForm({ ...form, vehicle_id: v, daily_rate: vh ? String(vh.daily_rate) : form.daily_rate });
            }}>
              <SelectTrigger><SelectValue placeholder={vehicles.length ? "Select available vehicle" : "No available vehicles"} /></SelectTrigger>
              <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} — {v.registration_no}</SelectItem>)}</SelectContent>
            </Select>
            {vehicles.length === 0 && <Link to="/vehicles" className="text-xs text-primary hover:underline">+ Add vehicle</Link>}
          </div>
          <div><Label>Date-out (Pickup) *</Label><Input type="datetime-local" value={form.pickup_at} onChange={(e) => setForm({ ...form, pickup_at: e.target.value })} /></div>
          <div><Label>Date-in (Drop-off) *</Label><Input type="datetime-local" value={form.dropoff_at} onChange={(e) => setForm({ ...form, dropoff_at: e.target.value })} /></div>
          <div><Label>Booking From</Label><Input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} /></div>
          <div><Label>Booking To</Label><Input value={form.dropoff_location} onChange={(e) => setForm({ ...form, dropoff_location: e.target.value })} /></div>
          <div><Label>Driver Name *</Label><Input required value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} placeholder="Mandatory — no self-drive" /></div>
          <div><Label>Driver Cell *</Label><Input required value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} placeholder="Mandatory" /></div>
          <div><Label>Daily Rate (PKR)</Label><Input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></div>
          <div><Label>Advance (PKR)</Label><Input type="number" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: e.target.value })} /></div>
          <div><Label>Security Deposit</Label><Input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} /></div>
          <div><Label>Toll Tax</Label><Input type="number" value={form.toll_tax} onChange={(e) => setForm({ ...form, toll_tax: e.target.value })} /></div>
          <div><Label>ODO Reading-out</Label><Input type="number" value={form.odometer_out} onChange={(e) => setForm({ ...form, odometer_out: e.target.value })} /></div>
          <div><Label>ODO Reading-in</Label><Input type="number" value={form.odometer_in} onChange={(e) => setForm({ ...form, odometer_in: e.target.value })} /></div>
          <div>
            <Label>With Fuel or Without Fuel</Label>
            <Select value={form.fuel_level_out} onValueChange={(v) => setForm({ ...form, fuel_level_out: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Without Fuel","Empty","1/4","1/2","3/4","Full"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-semibold">Custom Fields</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setCustomFields([...customFields, { label: "", value: "" }])}>
              <Plus className="size-3.5 mr-1" /> Add Field
            </Button>
          </div>
          <div className="space-y-2">
            {customFields.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Field label" value={f.label} onChange={(e) => {
                  const next = [...customFields]; next[i] = { ...next[i], label: e.target.value }; setCustomFields(next);
                }} className="flex-1" />
                <Input placeholder="Value" value={f.value} onChange={(e) => {
                  const next = [...customFields]; next[i] = { ...next[i], value: e.target.value }; setCustomFields(next);
                }} className="flex-1" />
                <Button type="button" size="icon" variant="ghost" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            {customFields.length === 0 && <div className="text-xs text-muted-foreground">No custom fields. Click "Add Field" for any extra info.</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center bg-muted/40 rounded-lg p-3">
          <div><div className="text-xs text-muted-foreground">Days</div><div className="font-bold text-lg">{days}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-bold text-lg text-primary">{fmtMoney(total)}</div></div>
          <div><div className="text-xs text-muted-foreground">Balance</div><div className="font-bold text-lg text-cta">{fmtMoney(balance)}</div></div>
        </div>

        <div>
          <Label>Client Signature</Label>
          <div className="border rounded-lg bg-white mt-1.5">
            <SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full h-32" }} />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => sigRef.current?.clear()} className="mt-1 text-xs">Clear</Button>
        </div>

        <div className="flex gap-2 flex-wrap pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            {busy === "pdf" ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileDown className="size-4 mr-2" />}
            Save & Download PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
