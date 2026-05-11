import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, fmtMoney, daysBetween } from "@/lib/format";
import logo from "@/assets/logo.jpg";

const FALLBACK = {
  company_name: "Bukhari Motors & Rent A Car",
  tagline: "LUXURY | COMFORT | TRUST",
  phone: "0321 5300920",
  whatsapp_number: "0321 5300920",
  email: "",
  address: "G-6 Markaz, Melody Market Islamabad",
  website: "",
  logo_url: "",
  form_banner: "ALL KINDS OF VEHICLES ARE AVAILABLE WITH DRIVERS FOR LOCAL AND OUTSTATION",
} as Record<string, string>;

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
  } catch { return src; }
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}

function row(label: string, value: string, wide = false) {
  return `<div style="grid-column:${wide ? "1 / -1" : "auto"};display:flex;align-items:flex-end;gap:6px;min-width:0;">
    <span style="font-weight:600;color:#0F172A;white-space:nowrap;font-size:13px;">${esc(label)}:</span>
    <span style="flex:1;border-bottom:1.5px solid #94A3B8;min-height:20px;padding:0 4px 2px;font-weight:600;color:#0F172A;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(value)}</span>
  </div>`;
}

interface SheetData {
  company: Record<string, string>;
  logoSrc: string;
  bookingNo: string;
  date: string;
  client: { full_name?: string; phone?: string; address?: string | null } | null;
  vehicle: { make?: string; model?: string; year?: number | null; registration_no?: string } | null;
  pickupAt: string; dropoffAt: string;
  pickupLoc: string; dropoffLoc: string;
  driverName: string; driverPhone: string;
  odoOut: string; odoIn: string; fuel: string;
  tollTax: number; total: number; advance: number; balance: number;
  notes: string; signature: string; customFields: Array<{ label: string; value: string }>;
  days: number; totalReading: number;
}

function sheetHtml(p: SheetData) {
  const c = p.company;
  const v = p.vehicle;
  const cli = p.client;
  const vehicleLine = v ? `${v.make ?? ""} ${v.model ?? ""} ${v.year ?? ""}`.trim() : "";
  const fields = [
    row("S.No", p.bookingNo),
    row("Date", p.date),
    row("Client Name", cli?.full_name ?? ""),
    row("Cell", cli?.phone ?? ""),
    row("Address", cli?.address ?? "", true),
    row("Vehicle Make & Model", vehicleLine),
    row("Reg No", v?.registration_no ?? ""),
    row("Booking From", p.pickupLoc),
    row("to", p.dropoffLoc),
    row("Date-out", p.pickupAt),
    row("Date-in", p.dropoffAt),
    row("Driver Name", p.driverName),
    row("Driver Cell", p.driverPhone),
    row("ODO Reading out", p.odoOut),
    row("ODO Reading-in", p.odoIn),
    row("Total Reading", p.totalReading ? `${p.totalReading} km` : (p.days ? `${p.days} day(s)` : "")),
    row("With Fuel or Without Fuel", p.fuel),
    row("Toll Tax", p.tollTax ? fmtMoney(p.tollTax) : ""),
    row("Total Payment", p.total ? fmtMoney(p.total) : ""),
    row("Advance", p.advance ? fmtMoney(p.advance) : ""),
    row("Balance", p.balance ? fmtMoney(p.balance) : ""),
    `<div style="display:flex;align-items:flex-end;gap:6px;"><span style="font-weight:600;font-size:13px;">Client Signature:</span><span style="flex:1;border-bottom:1.5px solid #94A3B8;min-height:36px;display:flex;align-items:end;">${p.signature ? `<img src="${p.signature}" style="max-height:34px;max-width:100%;" />` : ""}</span></div>`,
    row("Prepared By", "Bukhari Motors"),
    ...p.customFields.filter(f => f.label).slice(0, 6).map(f => row(f.label, f.value)),
  ].join("");

  return `<div class="bm-sheet-root" style="width:794px;min-height:1123px;background:#FFFFFF;color:#0F172A;font-family:Inter,Arial,sans-serif;position:relative;box-sizing:border-box;overflow:hidden;">
    <style>.bm-sheet-root, .bm-sheet-root *{border-color:#E2E8F0 !important;outline-color:#E2E8F0 !important;text-decoration-color:#0F172A !important;-webkit-text-fill-color:currentColor !important;}</style>
    <div style="position:relative;height:30px;">
      <div style="position:absolute;top:0;left:0;width:55%;height:18px;background:#062A4D;clip-path:polygon(0 0,100% 0,calc(100% - 22px) 100%,0 100%);"></div>
      <div style="position:absolute;top:0;right:0;width:55%;height:18px;background:#062A4D;clip-path:polygon(22px 0,100% 0,100% 100%,0 100%);"></div>
      <div style="position:absolute;top:18px;left:0;width:55%;height:6px;background:#B98A32;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);"></div>
      <div style="position:absolute;top:18px;right:0;width:55%;height:6px;background:#B98A32;clip-path:polygon(14px 0,100% 0,100% 100%,0 100%);"></div>
    </div>
    <div style="padding:20px 36px 0;">
      <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:center;">
        <div>
          <img src="${p.logoSrc}" alt="logo" style="width:230px;height:auto;display:block;" />
          <div style="font-family:Poppins,Arial,sans-serif;color:#0F172A;font-size:11px;font-weight:600;letter-spacing:5px;margin-top:4px;text-align:center;width:230px;">${esc(c.tagline)}</div>
          <div style="margin-top:8px;font-size:22px;color:#F59E0B;letter-spacing:6px;text-align:center;width:230px;">★★★★★</div>
        </div>
        <div style="text-align:left;font-size:14px;color:#0F172A;line-height:1.9;align-self:end;padding-bottom:6px;">
          <div><strong>☎ ${esc(c.phone || c.whatsapp_number)}</strong></div>
          ${c.email ? `<div>✉ ${esc(c.email)}</div>` : ""}
          ${c.website ? `<div>🌐 ${esc(c.website)}</div>` : ""}
          <div>📍 ${esc(c.address)}</div>
        </div>
      </div>
      <div style="margin-top:18px;position:relative;height:36px;">
        <div style="position:absolute;inset:0;background:#062A4D;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-weight:700;font-size:13px;text-align:center;display:flex;align-items:center;justify-content:center;clip-path:polygon(20px 0,calc(100% - 20px) 0,100% 50%,calc(100% - 20px) 100%,20px 100%,0 50%);">
          ${esc(c.form_banner)}
        </div>
        <div style="position:absolute;left:0;top:0;bottom:0;width:30px;background:#B98A32;clip-path:polygon(0 0,100% 50%,0 100%);"></div>
        <div style="position:absolute;right:0;top:0;bottom:0;width:30px;background:#B98A32;clip-path:polygon(100% 0,100% 100%,0 50%);"></div>
      </div>
      <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:22px 28px;font-size:13px;padding-bottom:90px;">
        ${fields}
      </div>
      ${p.notes ? `<div style="margin-top:14px;font-size:12px;"><strong>Notes:</strong> ${esc(p.notes)}</div>` : ""}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:14px;">
        <div style="width:80px;height:8px;background:linear-gradient(90deg,transparent,#B98A32);"></div>
        <div style="font-family:Georgia,serif;font-size:34px;font-style:italic;color:#B98A32;line-height:1;">Thank you</div>
        <div style="width:80px;height:8px;background:linear-gradient(90deg,#B98A32,transparent);"></div>
      </div>
      <div style="font-family:Poppins,Arial,sans-serif;font-size:11px;letter-spacing:7px;font-weight:700;margin-top:4px;">FOR CHOOSING US</div>
    </div>
    <div style="position:absolute;bottom:0;left:0;width:200px;height:40px;background:#062A4D;clip-path:polygon(0 0,100% 0,calc(100% - 22px) 100%,0 100%);"></div>
    <div style="position:absolute;bottom:0;right:0;width:200px;height:40px;background:#062A4D;clip-path:polygon(22px 0,100% 0,100% 100%,0 100%);"></div>
    <div style="position:absolute;bottom:32px;left:0;width:200px;height:6px;background:#B98A32;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);"></div>
    <div style="position:absolute;bottom:32px;right:0;width:200px;height:6px;background:#B98A32;clip-path:polygon(14px 0,100% 0,100% 100%,0 100%);"></div>
  </div>`;
}

async function renderToCanvas(html: string): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;background:#FFFFFF;z-index:-1;border-color:#E2E8F0;color:#0F172A;";
  document.body.appendChild(host);
  host.innerHTML = html;
  const node = host.firstElementChild as HTMLElement;
  // Wait for images and fonts
  await (document.fonts?.ready ?? Promise.resolve());
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise((res) => {
    img.onload = () => res(null); img.onerror = () => res(null);
  })));
  try {
    const { default: html2canvas } = await import("html2canvas");
    return await html2canvas(node, {
      scale: 2,
      backgroundColor: "#FFFFFF",
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 794,
    });
  } finally {
    document.body.removeChild(host);
  }
}

export async function buildBookingHtml(bookingId: string): Promise<{ html: string; bookingNo: string }> {
  const [{ data: b, error }, { data: s }] = await Promise.all([
    supabase.from("bookings").select("*, client:clients(full_name,phone,address,cnic,license_no), vehicle:vehicles(make,model,year,color,registration_no)").eq("id", bookingId).maybeSingle(),
    supabase.from("company_settings").select("*").eq("id", true).maybeSingle(),
  ]);
  if (error || !b) throw new Error(error?.message ?? "Booking not found");
  const company = { ...FALLBACK, ...(s ?? {}) } as Record<string, string>;
  const logoSrc = await toDataUrl(company.logo_url || logo);
  const cf = (b.custom_fields ?? {}) as Record<string, string>;
  const driverName = cf["Driver Name"] ?? "";
  const driverPhone = cf["Driver Cell"] ?? "";
  const tollTax = Number(cf["Toll Tax"] ?? b.extra_charges ?? 0);
  const customFields = Object.entries(cf)
    .filter(([k]) => !["Driver Name", "Driver Cell", "Toll Tax"].includes(k))
    .map(([label, value]) => ({ label, value: String(value) }));
  const days = b.pickup_at && b.dropoff_at ? daysBetween(b.pickup_at, b.dropoff_at) : 0;
  const odoOut = b.odometer_out ?? 0;
  const odoIn = b.odometer_in ?? 0;
  const totalReading = odoOut && odoIn ? Math.max(0, Number(odoIn) - Number(odoOut)) : 0;
  const html = sheetHtml({
    company, logoSrc,
    bookingNo: b.booking_no,
    date: fmtDateTime(b.created_at).split(",")[0],
    client: b.client as SheetData["client"],
    vehicle: b.vehicle as SheetData["vehicle"],
    pickupAt: b.pickup_at ? fmtDateTime(b.pickup_at).split(",")[0] : "",
    dropoffAt: b.dropoff_at ? fmtDateTime(b.dropoff_at).split(",")[0] : "",
    pickupLoc: b.pickup_location ?? "",
    dropoffLoc: b.dropoff_location ?? "",
    driverName, driverPhone,
    odoOut: b.odometer_out ? String(b.odometer_out) : "",
    odoIn: b.odometer_in ? String(b.odometer_in) : "",
    fuel: b.fuel_level_out ?? "",
    tollTax,
    total: Number(b.total_amount ?? 0),
    advance: Number(b.advance_amount ?? 0),
    balance: Number(b.balance_amount ?? 0),
    notes: b.notes ?? "",
    signature: b.signature_url ?? "",
    customFields, days, totalReading,
  });
  return { html, bookingNo: b.booking_no };
}

export async function downloadHtmlAsPdf(html: string, fileName: string) {
  const canvas = await renderToCanvas(html);
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const ratio = canvas.height / canvas.width;
  const imgH = pageW * ratio;
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, imgH);
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadBookingPdf(bookingId: string) {
  const { html, bookingNo } = await buildBookingHtml(bookingId);
  await downloadHtmlAsPdf(html, `${bookingNo}.pdf`);
  return bookingNo;
}
