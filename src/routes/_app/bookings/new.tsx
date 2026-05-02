import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, MessageCircle, Plus, Trash2, ImageDown, ArrowLeft, Printer } from "lucide-react";
import { openWhatsApp, shareBookingMessage } from "@/lib/whatsapp";
import { daysBetween, fmtDateTime, fmtMoney } from "@/lib/format";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/_app/bookings/new")({ component: NewBooking });

interface CustomField { label: string; value: string }
interface CompanySettings {
  company_name: string;
  tagline: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logo_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  form_banner: string | null;
}

const FALLBACK_COMPANY: CompanySettings = {
  company_name: "Bukhari Motors & Rent A Car",
  tagline: "Luxury | Comfort | Trust",
  phone: "+92 321 5300920",
  whatsapp_number: "+92 321 5300920",
  email: "",
  address: "G-6 Markaz, Melody Market Islamabad",
  website: "",
  logo_url: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  form_banner: "ALL KINDS OF VEHICLES ARE AVAILABLE WITH DRIVERS FOR LOCAL AND OUTSTATION",
};

function NewBooking() {
  const navigate = useNavigate();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [company, setCompany] = useState<CompanySettings>(FALLBACK_COMPANY);
  const [clients, setClients] = useState<{ id: string; full_name: string; phone: string; cnic: string | null; address: string | null; license_no: string | null }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; make: string; model: string; year: number | null; color: string | null; registration_no: string; daily_rate: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingImg, setSavingImg] = useState(false);
  const [form, setForm] = useState({
    client_id: "", vehicle_id: "",
    pickup_at: "", dropoff_at: "",
    pickup_location: "", dropoff_location: "",
    daily_rate: "", advance_amount: "", security_deposit: "",
    odometer_out: "", fuel_level_out: "Full",
    notes: "", driver_name: "", driver_phone: "", toll_tax: "",
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    (async () => {
      const [c, v, s] = await Promise.all([
        supabase.from("clients").select("id, full_name, phone, cnic, address, license_no").order("full_name"),
        supabase.from("vehicles").select("id, make, model, year, color, registration_no, daily_rate").eq("status", "available"),
        supabase.from("company_settings").select("company_name, tagline, phone, whatsapp_number, email, address, website, logo_url, facebook_url, instagram_url, tiktok_url, youtube_url, form_banner").eq("id", true).maybeSingle(),
      ]);
      setClients(c.data ?? []);
      setVehicles(v.data ?? []);
      if (s.data) setCompany({ ...FALLBACK_COMPANY, ...s.data });
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
  const formDate = useMemo(() => new Date().toISOString(), []);

  const validateForm = () => {
    if (!form.client_id || !form.vehicle_id || !form.pickup_at || !form.dropoff_at) {
      toast.error("Please fill client, vehicle, and dates");
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
    fuel_level_out: form.fuel_level_out || null,
    daily_rate: dailyRate,
    extra_charges: tollTax,
    total_amount: total,
    advance_amount: advance,
    balance_amount: balance,
    security_deposit: parseFloat(form.security_deposit || "0"),
    notes: form.notes || null,
    custom_fields: Object.fromEntries([
      ...customFields.filter(f => f.label).map(f => [f.label, f.value]),
      ...(form.driver_name ? [["Driver Name", form.driver_name]] : []),
      ...(form.driver_phone ? [["Driver Cell", form.driver_phone]] : []),
      ...(form.toll_tax ? [["Toll Tax", form.toll_tax]] : []),
    ]),
    signature_url: sigRef.current && !sigRef.current.isEmpty() ? sigRef.current.getCanvas().toDataURL("image/png") : null,
    terms_accepted: true,
    status: "confirmed" as const,
  });

  const buildPdfData = (bookingNo: string) => ({
    bookingNo,
    createdAt: formDate,
    company,
    client: { name: selClient!.full_name, phone: selClient!.phone, cnic: selClient!.cnic ?? undefined, address: selClient!.address ?? undefined, license_no: selClient!.license_no ?? undefined },
    vehicle: { make: selVehicle!.make, model: selVehicle!.model, year: selVehicle!.year ?? undefined, color: selVehicle!.color ?? undefined, reg: selVehicle!.registration_no },
    driver: form.driver_name ? { name: form.driver_name, phone: form.driver_phone } : null,
    pickup_at: form.pickup_at, dropoff_at: form.dropoff_at,
    pickup_location: form.pickup_location, dropoff_location: form.dropoff_location,
    odometer_out: form.odometer_out ? Number(form.odometer_out) : null,
    fuel_level_out: form.fuel_level_out,
    daily_rate: dailyRate, days, total, advance, balance,
    extra_charges: tollTax,
    security_deposit: parseFloat(form.security_deposit || "0"),
    notes: [form.notes, ...customFields.filter(f => f.label && f.value).map(f => `${f.label}: ${f.value}`)].filter(Boolean).join("\n"),
    signature_dataurl: sigRef.current && !sigRef.current.isEmpty() ? sigRef.current.getCanvas().toDataURL("image/png") : null,
  });

  const downloadBlob = async (blob: Blob, filename: string) => {
    const file = new File([blob], filename, { type: blob.type });
    const share = navigator as Navigator & { canShare?: (data: ShareData & { files?: File[] }) => boolean; share?: (data: ShareData & { files?: File[] }) => Promise<void> };
    if (share.canShare?.({ files: [file] })) {
      await share.share?.({ files: [file], title: filename });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleSave = async (action: "pdf" | "whatsapp" | "image") => {
    if (!validateForm()) return;
    setSaving(true);
    const { data, error } = await supabase.from("bookings").insert([bookingPayload()]).select("booking_no").single();
    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Failed to save");
      return;
    }
    toast.success(`Booking ${data.booking_no} created`);

    if (action === "image") {
      await saveAsImage(data.booking_no);
    }
    if (action === "pdf") {
      const { generateRentalPdf } = await import("@/lib/pdf");
      const pdf = generateRentalPdf(buildPdfData(data.booking_no));
      await downloadBlob(pdf.output("blob"), `${data.booking_no}.pdf`);
      toast.success("PDF ready for download / share");
    }
    if (action === "whatsapp" && selClient) {
      openWhatsApp(selClient.phone, shareBookingMessage({
        bookingNo: data.booking_no, clientName: selClient.full_name,
        vehicle: `${selVehicle!.make} ${selVehicle!.model} (${selVehicle!.registration_no})`,
        pickup: fmtDateTime(form.pickup_at), dropoff: fmtDateTime(form.dropoff_at),
        total, advance, balance,
      }));
    }
    setSaving(false);
  };

  const saveAsImage = async (bookingNo: string) => {
    if (!previewRef.current) return;
    setSavingImg(true);
    try {
      await document.fonts?.ready;
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(previewRef.current, {
        scale: Math.min(3, window.devicePixelRatio || 2),
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("No image generated")), "image/png", 1));
      await downloadBlob(blob, `${bookingNo}-rental-form.png`);
      toast.success("Image ready for download / gallery");
    } catch {
      toast.error("Could not generate image. Try PDF or browser print.");
    }
    setSavingImg(false);
  };

  const printForm = async () => {
    if (!validateForm()) return;
    await saveAsImage("BM-Form-" + Date.now());
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link to="/bookings"><Button size="icon" variant="ghost"><ArrowLeft className="size-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-display font-bold">New Rental Agreement</h1>
          <p className="text-sm text-muted-foreground">Paper-style form, editable fields, image/PDF export for phone gallery</p>
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
          <div><Label>Pickup Date/Time *</Label><Input type="datetime-local" value={form.pickup_at} onChange={(e) => setForm({ ...form, pickup_at: e.target.value })} /></div>
          <div><Label>Drop-off Date/Time *</Label><Input type="datetime-local" value={form.dropoff_at} onChange={(e) => setForm({ ...form, dropoff_at: e.target.value })} /></div>
          <div><Label>Booking From</Label><Input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} /></div>
          <div><Label>Booking To</Label><Input value={form.dropoff_location} onChange={(e) => setForm({ ...form, dropoff_location: e.target.value })} /></div>
          <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
          <div><Label>Driver Cell</Label><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} /></div>
          <div><Label>Daily Rate (PKR)</Label><Input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></div>
          <div><Label>Advance (PKR)</Label><Input type="number" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: e.target.value })} /></div>
          <div><Label>Security Deposit</Label><Input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} /></div>
          <div><Label>Toll Tax / Extra</Label><Input type="number" value={form.toll_tax} onChange={(e) => setForm({ ...form, toll_tax: e.target.value })} /></div>
          <div><Label>ODO Reading Out</Label><Input type="number" value={form.odometer_out} onChange={(e) => setForm({ ...form, odometer_out: e.target.value })} /></div>
          <div>
            <Label>Fuel</Label>
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
            {customFields.length === 0 && <div className="text-xs text-muted-foreground">No custom fields. Click “Add Field” to add any extra info.</div>}
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
          <Button onClick={() => handleSave("pdf")} disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save & Download PDF
          </Button>
          <Button onClick={() => handleSave("image")} disabled={saving || savingImg} className="bg-gradient-cta text-cta-foreground hover:opacity-90">
            {savingImg ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ImageDown className="size-4 mr-2" />}
            Save Image to Phone
          </Button>
          <Button onClick={() => handleSave("whatsapp")} disabled={saving} variant="outline">
            <MessageCircle className="size-4 mr-2" /> Save + WhatsApp
          </Button>
          <Button type="button" variant="ghost" onClick={printForm} disabled={savingImg}>
            <Printer className="size-4 mr-2" /> Image Preview
          </Button>
        </div>
      </Card>

      <div className="rounded-lg border bg-secondary/40 p-3 overflow-x-auto">
        <div className="text-sm font-semibold mb-2">Live export preview</div>
        <div className="origin-top-left scale-[0.45] sm:scale-[0.62] md:scale-[0.8] h-[520px] sm:h-[700px] md:h-[900px] w-[794px]">
          <RentalSheet refEl={previewRef} company={company} logoSrc={company.logo_url || logo} bookingNo="S.No" formDate={formDate} selClient={selClient} selVehicle={selVehicle} form={form} days={days} total={total} advance={advance} balance={balance} customFields={customFields} />
        </div>
      </div>
    </div>
  );
}

function RentalSheet({ refEl, company, logoSrc, bookingNo, formDate, selClient, selVehicle, form, days, total, advance, balance, customFields }: {
  refEl: React.RefObject<HTMLDivElement | null>;
  company: CompanySettings;
  logoSrc: string;
  bookingNo: string;
  formDate: string;
  selClient?: { full_name: string; phone: string; cnic: string | null; address: string | null; license_no: string | null };
  selVehicle?: { make: string; model: string; year: number | null; color: string | null; registration_no: string };
  form: { pickup_at: string; dropoff_at: string; pickup_location: string; dropoff_location: string; odometer_out: string; fuel_level_out: string; notes: string; driver_name: string; driver_phone: string; toll_tax: string };
  days: number; total: number; advance: number; balance: number; customFields: CustomField[];
}) {
  const vehicle = selVehicle ? `${selVehicle.make} ${selVehicle.model} ${selVehicle.year ?? ""}`.trim() : "";
  return (
    <div ref={refEl} style={{ width: 794, minHeight: 1123, background: "#FFFFFF", color: "#0F172A", fontFamily: "Inter, Arial, sans-serif", padding: 34, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 26, background: "#062A4D" }} />
      <div style={{ position: "absolute", top: 26, right: 0, width: 370, height: 8, background: "#B98A32" }} />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18, alignItems: "center", marginTop: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoSrc} alt="logo" crossOrigin="anonymous" style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 6 }} />
          <div>
            <div style={{ fontFamily: "Poppins, Arial, sans-serif", fontSize: 28, lineHeight: 1, fontWeight: 800, color: "#062A4D", letterSpacing: 0 }}>{company.company_name.replace("& Rent A Car", "")}</div>
            <div style={{ fontFamily: "Poppins, Arial, sans-serif", color: "#B98A32", fontSize: 18, fontWeight: 700, marginTop: 4 }}>& RENT A CAR</div>
            <div style={{ fontSize: 10, color: "#0F172A", fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>{company.tagline}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
          <div><strong>{company.phone || company.whatsapp_number}</strong></div>
          {company.email && <div>{company.email}</div>}
          {company.website && <div>{company.website}</div>}
          <div>{company.address}</div>
        </div>
      </div>
      <div style={{ marginTop: 22, background: "#062A4D", color: "#FFFFFF", fontFamily: "Poppins, Arial, sans-serif", fontWeight: 700, fontSize: 13, textAlign: "center", padding: "9px 18px", borderLeft: "18px solid #B98A32", borderRight: "18px solid #B98A32" }}>
        {company.form_banner}
      </div>

      <div style={{ marginTop: 42, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px 34px", fontSize: 14 }}>
        <Line label="S.No" value={bookingNo} />
        <Line label="Date" value={fmtDateTime(formDate).split(",")[0]} />
        <Line label="Client Name" value={selClient?.full_name} wide />
        <Line label="Cell" value={selClient?.phone} />
        <Line label="Address" value={selClient?.address ?? ""} wide />
        <Line label="Vehicle Make & Model" value={vehicle} />
        <Line label="Reg No" value={selVehicle?.registration_no} />
        <Line label="Booking From" value={form.pickup_location || (form.pickup_at ? fmtDateTime(form.pickup_at) : "")} />
        <Line label="to" value={form.dropoff_location || (form.dropoff_at ? fmtDateTime(form.dropoff_at) : "")} />
        <Line label="Date-out" value={form.pickup_at ? fmtDateTime(form.pickup_at).split(",")[0] : ""} />
        <Line label="Date-in" value={form.dropoff_at ? fmtDateTime(form.dropoff_at).split(",")[0] : ""} />
        <Line label="Driver Name" value={form.driver_name} />
        <Line label="Driver Cell" value={form.driver_phone} />
        <Line label="ODO Reading out" value={form.odometer_out} />
        <Line label="ODO Reading-in" value="" />
        <Line label="Total Reading" value={days ? `${days} day(s)` : ""} />
        <Line label="With Fuel or Without Fuel" value={form.fuel_level_out} />
        <Line label="Toll Tax" value={form.toll_tax ? fmtMoney(Number(form.toll_tax)) : ""} />
        <Line label="Total Payment" value={total ? fmtMoney(total) : ""} />
        <Line label="Advance" value={advance ? fmtMoney(advance) : ""} />
        <Line label="Balance" value={balance ? fmtMoney(balance) : ""} />
        <Line label="Client Signature" value="" />
        <Line label="Prepared By" value="Bukhari Motors" />
        {customFields.filter(f => f.label).slice(0, 6).map((f) => <Line key={f.label} label={f.label} value={f.value} />)}
      </div>
      {form.notes && <div style={{ marginTop: 24, fontSize: 13 }}><strong>Notes:</strong> {form.notes}</div>}

      <div style={{ position: "absolute", left: 34, right: 34, bottom: 30, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 35, fontStyle: "italic", color: "#B98A32" }}>Thank you</div>
        <div style={{ fontFamily: "Poppins, Arial, sans-serif", fontSize: 12, letterSpacing: 7, fontWeight: 700 }}>FOR CHOOSING US</div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 185, height: 45, background: "#062A4D", borderTop: "10px solid #B98A32" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 185, height: 45, background: "#062A4D", borderTop: "10px solid #B98A32" }} />
    </div>
  );
}

function Line({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined, display: "flex", alignItems: "flex-end", gap: 8, minWidth: 0 }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}:</span>
      <span style={{ flex: 1, minHeight: 22, borderBottom: "1.5px solid #94A3B8", paddingLeft: 6, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || ""}</span>
    </div>
  );
}
