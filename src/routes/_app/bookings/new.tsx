import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Loader2, Plus, Trash2, ArrowLeft, FileDown } from "lucide-react";
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
  header_color: string | null;
  accent_color: string | null;
  footer_text: string | null;
  footer_subtext: string | null;
  stars_text: string | null;
}

const FALLBACK_COMPANY: CompanySettings = {
  company_name: "Bukhari Motors & Rent A Car",
  tagline: "LUXURY | COMFORT | TRUST",
  phone: "0321 5300920",
  whatsapp_number: "0321 5300920",
  email: "",
  address: "G-6 Markaz, Melody Market Islamabad",
  website: "",
  logo_url: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  form_banner: "ALL KINDS OF VEHICLES ARE AVAILABLE WITH DRIVERS FOR LOCAL AND OUTSTATION",
  header_color: "#062A4D",
  accent_color: "#B98A32",
  footer_text: "Thank you",
  footer_subtext: "FOR CHOOSING US",
  stars_text: "★★★★★",
};

// Convert any image URL to base64 data URL so html2canvas never taints the canvas
async function toDataUrl(src: string): Promise<string> {
  try {
    const r = await fetch(src, { mode: "cors" });
    const b = await r.blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  } catch {
    return src;
  }
}

function NewBooking() {
  
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [company, setCompany] = useState<CompanySettings>(FALLBACK_COMPANY);
  const [logoData, setLogoData] = useState<string>(logo);
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
      toDataUrl(logo).then(setLogoData);
      const [c, v, s] = await Promise.all([
        supabase.from("clients").select("id, full_name, phone, cnic, address, license_no").order("full_name"),
        supabase.from("vehicles").select("id, make, model, year, color, registration_no, daily_rate").eq("status", "available"),
        supabase.from("company_settings").select("*").eq("id", true).maybeSingle(),
      ]);
      setClients(c.data ?? []);
      setVehicles(v.data ?? []);
      if (s.data) {
        setCompany({ ...FALLBACK_COMPANY, ...s.data });
        if (s.data.logo_url) toDataUrl(s.data.logo_url).then(setLogoData);
      }
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
  const formDate = useMemo(() => new Date().toISOString(), []);

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

  // Render the rental sheet without html2canvas first; html2canvas cannot parse Tailwind v4 oklch() colors.
  const renderSheetToCanvas = async (bookingNo: string) => {
    await document.fonts?.ready;
    const html = sheetHtml({
      company, logoSrc: logoData, bookingNo, formDate,
      selClient, selVehicle,
      form, days, total, advance, balance, totalReading,
      customFields, signature: sigRef.current && !sigRef.current.isEmpty() ? sigRef.current.getCanvas().toDataURL("image/png") : "",
    });

    try {
      return await renderHtmlSheetWithSvg(html);
    } catch {
      // Fallback for browsers that block SVG foreignObject rendering.
    }

    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.background = "#FFFFFF";
    document.body.appendChild(host);
    host.innerHTML = html;
    const node = host.firstElementChild as HTMLElement;
    try {
      const { default: html2canvas } = await import("html2canvas");
      await new Promise((r) => requestAnimationFrame(r));
      return await html2canvas(node, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: 794,
        onclone: (_doc, clonedNode) => {
          clonedNode.querySelectorAll("*").forEach((el) => {
            const node = el as HTMLElement;
            node.style.color = node.style.color || "#0F172A";
          });
        },
      });
    } finally {
      document.body.removeChild(host);
    }
  };


  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setBusy("pdf");
    const { data, error } = await supabase.from("bookings").insert([bookingPayload()]).select("booking_no").single();
    if (error || !data) {
      setSaving(false); setBusy(null);
      toast.error(error?.message ?? "Failed to save");
      return;
    }
    toast.success(`Booking ${data.booking_no} created`);
    try {
      const canvas = await renderSheetToCanvas(data.booking_no);
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const ratio = canvas.height / canvas.width;
      const imgH = pageW * ratio;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(dataUrl, "JPEG", 0, 0, pageW, imgH);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.booking_no}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
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

// ---- Inline-styled HTML so html2canvas reproduces it pixel-perfect ----
function esc(s: string | null | undefined) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}

function renderHtmlSheetWithSvg(html: string): Promise<HTMLCanvasElement> {
  const width = 794;
  const height = 1123;
  const scale = Math.min(2, Math.max(1.25, window.devicePixelRatio || 1));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">
    <foreignObject width="${width}" height="${height}">
      <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
    </foreignObject>
  </svg>`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("SVG render failed"));
    img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  });
}

function fieldRow(label: string, value: string, opts?: { wide?: boolean }) {
  const span = opts?.wide ? "1 / -1" : "auto";
  return `<div style="grid-column:${span};display:flex;align-items:flex-end;gap:6px;min-width:0;">
    <span style="font-weight:600;color:#0F172A;white-space:nowrap;font-size:13px;">${esc(label)}:</span>
    <span style="flex:1;border-bottom:1.5px solid #94A3B8;min-height:20px;padding:0 4px 2px;font-weight:600;color:#0F172A;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(value)}</span>
  </div>`;
}

function sheetHtml(p: {
  company: CompanySettings; logoSrc: string; bookingNo: string; formDate: string;
  selClient?: { full_name: string; phone: string; cnic: string | null; address: string | null; license_no: string | null };
  selVehicle?: { make: string; model: string; year: number | null; color: string | null; registration_no: string };
  form: { pickup_at: string; dropoff_at: string; pickup_location: string; dropoff_location: string; odometer_out: string; odometer_in: string; fuel_level_out: string; notes: string; driver_name: string; driver_phone: string; toll_tax: string };
  days: number; total: number; advance: number; balance: number; totalReading: number;
  customFields: CustomField[]; signature: string;
}) {
  const c = p.company;
  const v = p.selVehicle;
  const cli = p.selClient;
  const date = fmtDateTime(p.formDate).split(",")[0];
  const dateOut = p.form.pickup_at ? fmtDateTime(p.form.pickup_at).split(",")[0] : "";
  const dateIn = p.form.dropoff_at ? fmtDateTime(p.form.dropoff_at).split(",")[0] : "";
  const vehicleLine = v ? `${v.make} ${v.model} ${v.year ?? ""}`.trim() : "";

  const fields = [
    fieldRow("S.No", p.bookingNo),
    fieldRow("Date", date),
    fieldRow("Client Name", cli?.full_name ?? "", { wide: false }),
    fieldRow("Cell", cli?.phone ?? ""),
    fieldRow("Address", cli?.address ?? "", { wide: true }),
    fieldRow("Vehicle Make & Model", vehicleLine),
    fieldRow("Reg No", v?.registration_no ?? ""),
    fieldRow("Booking From", p.form.pickup_location),
    fieldRow("to", p.form.dropoff_location),
    fieldRow("Date-out", dateOut),
    fieldRow("Date-in", dateIn),
    fieldRow("Driver Name", p.form.driver_name),
    fieldRow("Driver Cell", p.form.driver_phone),
    fieldRow("ODO Reading out", p.form.odometer_out),
    fieldRow("ODO Reading-in", p.form.odometer_in),
    fieldRow("Total Reading", p.totalReading ? String(p.totalReading) + " km" : (p.days ? `${p.days} day(s)` : "")),
    fieldRow("With Fuel or Without Fuel", p.form.fuel_level_out),
    fieldRow("Toll Tax", p.form.toll_tax ? fmtMoney(Number(p.form.toll_tax)) : ""),
    fieldRow("Total Payment", p.total ? fmtMoney(p.total) : ""),
    fieldRow("Advance", p.advance ? fmtMoney(p.advance) : ""),
    fieldRow("Balance", p.balance ? fmtMoney(p.balance) : ""),
    `<div style="grid-column:auto;display:flex;align-items:flex-end;gap:6px;">
      <span style="font-weight:600;font-size:13px;">Client Signature:</span>
      <span style="flex:1;border-bottom:1.5px solid #94A3B8;min-height:36px;display:flex;align-items:end;">
        ${p.signature ? `<img src="${p.signature}" style="max-height:34px;max-width:100%;" />` : ""}
      </span>
    </div>`,
    fieldRow("Prepared By", "Bukhari Motors"),
    ...p.customFields.filter(f => f.label).slice(0, 6).map(f => fieldRow(f.label, f.value)),
  ].join("");

  const stars = "★★★★★";

  return `<div class="bm-export-sheet" style="width:794px;min-height:1123px;background:#FFFFFF;color:#0F172A;font-family:Inter,Arial,sans-serif;padding:0;position:relative;box-sizing:border-box;overflow:hidden;">
    <style>.bm-export-sheet,.bm-export-sheet *{border-color:#E2E8F0!important;outline-color:#2563EB!important;box-sizing:border-box;}</style>
    <!-- Top decorative band -->
    <div style="position:relative;height:30px;background:#FFFFFF;">
      <div style="position:absolute;top:0;left:0;width:55%;height:18px;background:#062A4D;clip-path:polygon(0 0,100% 0,calc(100% - 22px) 100%,0 100%);"></div>
      <div style="position:absolute;top:0;right:0;width:55%;height:18px;background:#062A4D;clip-path:polygon(22px 0,100% 0,100% 100%,0 100%);"></div>
      <div style="position:absolute;top:18px;left:0;width:55%;height:6px;background:#B98A32;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);"></div>
      <div style="position:absolute;top:18px;right:0;width:55%;height:6px;background:#B98A32;clip-path:polygon(14px 0,100% 0,100% 100%,0 100%);"></div>
    </div>

    <div style="padding:20px 36px 0;">
      <!-- Header: logo + tagline + stars / contact -->
      <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:center;">
        <div>
          <img src="${p.logoSrc}" alt="logo" crossorigin="anonymous" style="width:230px;height:auto;display:block;" />
          <div style="font-family:Poppins,Arial,sans-serif;color:#0F172A;font-size:11px;font-weight:600;letter-spacing:5px;margin-top:4px;text-align:center;width:230px;">${esc(c.tagline ?? "")}</div>
          <div style="margin-top:8px;font-size:22px;color:#F59E0B;letter-spacing:6px;text-align:center;width:230px;">${stars}</div>
        </div>
        <div style="text-align:left;font-size:14px;color:#0F172A;line-height:1.9;align-self:end;padding-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;width:22px;height:22px;border-radius:50%;border:1.5px solid #062A4D;align-items:center;justify-content:center;color:#062A4D;font-weight:700;">☎</span><strong style="font-weight:700;">${esc(c.phone || c.whatsapp_number || "")}</strong></div>
          ${c.email ? `<div style="display:flex;align-items:center;gap:8px;"><span style="color:#062A4D;">✉</span>${esc(c.email)}</div>` : ""}
          ${c.website ? `<div style="display:flex;align-items:center;gap:8px;"><span style="color:#062A4D;">🌐</span>${esc(c.website)}</div>` : ""}
          <div style="display:flex;align-items:flex-start;gap:8px;"><span style="color:#DC2626;font-size:18px;line-height:1;">📍</span><span>${esc(c.address ?? "")}</span></div>
        </div>
      </div>

      <!-- Banner with diagonal cuts -->
      <div style="margin-top:18px;position:relative;height:36px;">
        <div style="position:absolute;inset:0;background:#062A4D;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:0.5px;text-align:center;display:flex;align-items:center;justify-content:center;clip-path:polygon(20px 0,calc(100% - 20px) 0,100% 50%,calc(100% - 20px) 100%,20px 100%,0 50%);">
          ${esc(c.form_banner ?? "")}
        </div>
        <div style="position:absolute;left:0;top:0;bottom:0;width:30px;background:#B98A32;clip-path:polygon(0 0,100% 50%,0 100%);"></div>
        <div style="position:absolute;right:0;top:0;bottom:0;width:30px;background:#B98A32;clip-path:polygon(100% 0,100% 100%,0 50%);"></div>
      </div>

      <!-- Fields grid -->
      <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:22px 28px;font-size:13px;padding-bottom:90px;">
        ${fields}
      </div>

      ${p.form.notes ? `<div style="margin-top:14px;font-size:12px;color:#0F172A;"><strong>Notes:</strong> ${esc(p.form.notes)}</div>` : ""}
    </div>

    <!-- Footer "Thank you" + corner ribbons -->
    <div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:14px;">
        <div style="width:80px;height:8px;background:linear-gradient(90deg,transparent,#B98A32);"></div>
        <div style="font-family:Georgia,serif;font-size:34px;font-style:italic;color:#B98A32;line-height:1;">Thank you</div>
        <div style="width:80px;height:8px;background:linear-gradient(90deg,#B98A32,transparent);"></div>
      </div>
      <div style="font-family:Poppins,Arial,sans-serif;font-size:11px;letter-spacing:7px;font-weight:700;margin-top:4px;color:#0F172A;">FOR CHOOSING US</div>
    </div>
    <div style="position:absolute;bottom:0;left:0;width:200px;height:40px;background:#062A4D;clip-path:polygon(0 0,100% 0,calc(100% - 22px) 100%,0 100%);"></div>
    <div style="position:absolute;bottom:0;right:0;width:200px;height:40px;background:#062A4D;clip-path:polygon(22px 0,100% 0,100% 100%,0 100%);"></div>
    <div style="position:absolute;bottom:32px;left:0;width:200px;height:6px;background:#B98A32;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);"></div>
    <div style="position:absolute;bottom:32px;right:0;width:200px;height:6px;background:#B98A32;clip-path:polygon(14px 0,100% 0,100% 100%,0 100%);"></div>
  </div>`;
}
