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
  header_color: "#062A4D",
  accent_color: "#B98A32",
  footer_text: "Thank you",
  footer_subtext: "FOR CHOOSING US",
  stars_text: "★★★★★",
} as Record<string, string>;

interface SheetData {
  company: Record<string, string>;
  logoSrc: string;
  bookingNo: string;
  date: string;
  client: { full_name?: string; phone?: string; address?: string | null } | null;
  vehicle: { make?: string; model?: string; year?: number | null; registration_no?: string } | null;
  pickupAt: string;
  dropoffAt: string;
  pickupLoc: string;
  dropoffLoc: string;
  driverName: string;
  driverPhone: string;
  odoOut: string;
  odoIn: string;
  fuel: string;
  tollTax: number;
  total: number;
  advance: number;
  balance: number;
  notes: string;
  signature: string;
  customFields: Array<{ label: string; value: string }>;
  days: number;
  totalReading: number;
}

function safeHex(value: unknown, fallback: string) {
  const s = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(s) ? s : fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function toNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

async function toDataUrl(src: string): Promise<string> {
  try {
    const r = await fetch(src, { mode: "cors" });
    if (!r.ok) return src;
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

async function loadFontBase64(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Font load failed: ${path}`);
  const buffer = await response.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function registerFonts(pdf: import("jspdf").jsPDF) {
  try {
    const [inter, poppins, poppinsSemi, poppinsBold] = await Promise.all([
      loadFontBase64("/fonts/Inter-Regular.ttf"),
      loadFontBase64("/fonts/Poppins-Regular.ttf"),
      loadFontBase64("/fonts/Poppins-SemiBold.ttf"),
      loadFontBase64("/fonts/Poppins-Bold.ttf"),
    ]);
    pdf.addFileToVFS("Inter-Regular.ttf", inter);
    pdf.addFont("Inter-Regular.ttf", "Inter", "normal");
    pdf.addFileToVFS("Poppins-Regular.ttf", poppins);
    pdf.addFont("Poppins-Regular.ttf", "Poppins", "normal");
    pdf.addFileToVFS("Poppins-SemiBold.ttf", poppinsSemi);
    pdf.addFont("Poppins-SemiBold.ttf", "Poppins", "semibold");
    pdf.addFileToVFS("Poppins-Bold.ttf", poppinsBold);
    pdf.addFont("Poppins-Bold.ttf", "Poppins", "bold");
  } catch {
    pdf.setFont("helvetica", "normal");
  }
}

function text(pdf: import("jspdf").jsPDF, value: string, x: number, y: number, options?: { size?: number; font?: string; style?: string; color?: string; align?: "left" | "center" | "right"; maxWidth?: number }) {
  const color = hexToRgb(options?.color ?? "#0F172A");
  pdf.setTextColor(...color);
  pdf.setFont(options?.font ?? "Inter", options?.style ?? "normal");
  pdf.setFontSize(options?.size ?? 9);
  const clean = String(value ?? "");
  if (options?.maxWidth) {
    const lines = pdf.splitTextToSize(clean, options.maxWidth).slice(0, 2);
    pdf.text(lines, x, y, { align: options.align ?? "left", maxWidth: options.maxWidth });
  } else {
    pdf.text(clean, x, y, { align: options?.align ?? "left" });
  }
}

function fieldRow(pdf: import("jspdf").jsPDF, label: string, value: string, x: number, y: number, w: number) {
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.35);
  text(pdf, `${label}:`, x, y, { size: 8.8, font: "Poppins", style: "semibold" });
  const labelW = Math.min(pdf.getTextWidth(`${label}:`) + 2, w * 0.48);
  const lineX = x + labelW;
  pdf.line(lineX, y + 1.4, x + w, y + 1.4);
  text(pdf, value || "", lineX + 1, y, { size: 8.8, font: "Inter", maxWidth: Math.max(10, w - labelW - 2) });
}

function drawRibbon(pdf: import("jspdf").jsPDF, y: number, color: string, accent: string, bottom = false) {
  const w = 210;
  const main = hexToRgb(color);
  const gold = hexToRgb(accent);
  pdf.setFillColor(...main);
  if (!bottom) {
    pdf.triangle(0, y, 118, y, 110, y + 5, "F");
    pdf.rect(0, y, 110, 5, "F");
    pdf.triangle(w, y, 92, y, 100, y + 5, "F");
    pdf.rect(100, y, 110, 5, "F");
    pdf.setFillColor(...gold);
    pdf.triangle(0, y + 5, 116, y + 5, 111, y + 7, "F");
    pdf.rect(0, y + 5, 111, 2, "F");
    pdf.triangle(w, y + 5, 94, y + 5, 99, y + 7, "F");
    pdf.rect(99, y + 5, 111, 2, "F");
  } else {
    pdf.triangle(0, y, 58, y, 52, y + 12, "F");
    pdf.rect(0, y, 52, 12, "F");
    pdf.triangle(w, y, 152, y, 158, y + 12, "F");
    pdf.rect(158, y, 52, 12, "F");
    pdf.setFillColor(...gold);
    pdf.triangle(0, y - 2, 58, y - 2, 54, y, "F");
    pdf.rect(0, y - 2, 54, 2, "F");
    pdf.triangle(w, y - 2, 152, y - 2, 156, y, "F");
    pdf.rect(156, y - 2, 54, 2, "F");
  }
}

async function addImageSafe(pdf: import("jspdf").jsPDF, src: string, x: number, y: number, w: number, h?: number) {
  try {
    const dataUrl = await toDataUrl(src);
    const props = pdf.getImageProperties(dataUrl);
    const height = h ?? (w * props.height) / props.width;
    const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
    pdf.addImage(dataUrl, format, x, y, w, height);
    return height;
  } catch {
    return 0;
  }
}

async function drawPdf(p: SheetData, fileName: string) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  await registerFonts(pdf);

  const header = safeHex(p.company.header_color, "#062A4D");
  const accent = safeHex(p.company.accent_color, "#B98A32");
  const headerRgb = hexToRgb(header);
  const accentRgb = hexToRgb(accent);
  const pageW = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, 297, "F");
  drawRibbon(pdf, 0, header, accent);

  await addImageSafe(pdf, p.logoSrc || logo, 18, 15, 60);
  text(pdf, p.company.tagline || FALLBACK.tagline, 48, 46, { size: 8, font: "Poppins", style: "semibold", align: "center" });
  text(pdf, p.company.stars_text || FALLBACK.stars_text, 48, 53, { size: 13, color: "#F59E0B", align: "center" });

  const contactX = 108;
  text(pdf, `☎ ${p.company.phone || p.company.whatsapp_number || ""}`, contactX, 25, { size: 10, font: "Poppins", style: "bold", maxWidth: 80 });
  if (p.company.email) text(pdf, `✉ ${p.company.email}`, contactX, 34, { size: 9, maxWidth: 80 });
  if (p.company.website) text(pdf, `🌐 ${p.company.website}`, contactX, 42, { size: 9, maxWidth: 80 });
  text(pdf, `📍 ${p.company.address || ""}`, contactX, p.company.website ? 50 : 42, { size: 9, maxWidth: 82 });

  pdf.setFillColor(...headerRgb);
  pdf.roundedRect(18, 62, 174, 11, 2, 2, "F");
  pdf.setFillColor(...accentRgb);
  pdf.triangle(18, 62, 26, 67.5, 18, 73, "F");
  pdf.triangle(192, 62, 184, 67.5, 192, 73, "F");
  text(pdf, p.company.form_banner || FALLBACK.form_banner, pageW / 2, 69.5, { size: 8.2, font: "Poppins", style: "bold", color: "#FFFFFF", align: "center", maxWidth: 154 });

  const v = p.vehicle;
  const cli = p.client;
  const vehicleLine = v ? `${v.make ?? ""} ${v.model ?? ""} ${v.year ?? ""}`.trim() : "";
  const fields = [
    ["S.No", p.bookingNo], ["Date", p.date],
    ["Client Name", cli?.full_name ?? ""], ["Cell", cli?.phone ?? ""],
    ["Address", cli?.address ?? "", "wide"],
    ["Vehicle Make & Model", vehicleLine], ["Reg No", v?.registration_no ?? ""],
    ["Booking From", p.pickupLoc], ["to", p.dropoffLoc],
    ["Date-out", p.pickupAt], ["Date-in", p.dropoffAt],
    ["Driver Name", p.driverName], ["Driver Cell", p.driverPhone],
    ["ODO Reading out", p.odoOut], ["ODO Reading-in", p.odoIn],
    ["Total Reading", p.totalReading ? `${p.totalReading} km` : p.days ? `${p.days} day(s)` : ""],
    ["With Fuel or Without Fuel", p.fuel], ["Toll Tax", p.tollTax ? fmtMoney(p.tollTax) : ""],
    ["Total Payment", p.total ? fmtMoney(p.total) : ""], ["Advance", p.advance ? fmtMoney(p.advance) : ""],
    ["Balance", p.balance ? fmtMoney(p.balance) : ""], ["Prepared By", "Bukhari Motors"],
    ...p.customFields.filter((f) => f.label).slice(0, 6).map((f) => [f.label, f.value]),
  ] as Array<[string, string, string?]>;

  let x = 18;
  let y = 88;
  const colW = 82;
  const gap = 10;
  fields.forEach(([label, value, wide]) => {
    if (wide) {
      fieldRow(pdf, label, value, 18, y, 174);
      y += 10;
      x = 18;
      return;
    }
    fieldRow(pdf, label, value, x, y, colW);
    if (x === 18) {
      x = 18 + colW + gap;
    } else {
      x = 18;
      y += 10;
    }
  });

  if (x !== 18) y += 10;
  text(pdf, "Client Signature:", 18, y + 3, { size: 8.8, font: "Poppins", style: "semibold" });
  pdf.setDrawColor(148, 163, 184);
  pdf.line(50, y + 4.5, 112, y + 4.5);
  if (p.signature) await addImageSafe(pdf, p.signature, 52, y - 7, 48, 14);
  fieldRow(pdf, "Notes", p.notes || "", 18, y + 15, 174);

  pdf.setFillColor(...accentRgb);
  pdf.rect(54, 265, 24, 1.5, "F");
  pdf.rect(132, 265, 24, 1.5, "F");
  text(pdf, p.company.footer_text || FALLBACK.footer_text, pageW / 2, 268, { size: 24, font: "Poppins", color: accent, align: "center" });
  text(pdf, p.company.footer_subtext || FALLBACK.footer_subtext, pageW / 2, 277, { size: 7.5, font: "Poppins", style: "bold", align: "center" });
  drawRibbon(pdf, 285, header, accent, true);

  pdf.save(fileName);
}

export async function getBookingSheetData(bookingId: string): Promise<SheetData> {
  const { data: b, error } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (error || !b) throw new Error(error?.message ?? "Booking not found");

  const [{ data: s }, { data: client }, { data: vehicle }] = await Promise.all([
    supabase.from("company_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("clients").select("full_name,phone,address,cnic,license_no").eq("id", b.client_id).maybeSingle(),
    supabase.from("vehicles").select("make,model,year,color,registration_no").eq("id", b.vehicle_id).maybeSingle(),
  ]);

  const company = { ...FALLBACK, ...(s ?? {}) } as Record<string, string>;
  const cf = (b.custom_fields ?? {}) as Record<string, string>;
  const driverName = cf["Driver Name"] ?? "";
  const driverPhone = cf["Driver Cell"] ?? "";
  const tollTax = toNumber(cf["Toll Tax"] ?? b.extra_charges);
  const customFields = Object.entries(cf)
    .filter(([k]) => !["Driver Name", "Driver Cell", "Toll Tax"].includes(k))
    .map(([label, value]) => ({ label, value: String(value ?? "") }));
  const days = b.pickup_at && b.dropoff_at ? daysBetween(b.pickup_at, b.dropoff_at) : 0;
  const odoOut = toNumber(b.odometer_out);
  const odoIn = toNumber(b.odometer_in);
  const totalReading = odoOut && odoIn ? Math.max(0, odoIn - odoOut) : 0;

  return {
    company,
    logoSrc: company.logo_url || logo,
    bookingNo: b.booking_no,
    date: fmtDateTime(b.created_at).split(",")[0],
    client,
    vehicle,
    pickupAt: b.pickup_at ? fmtDateTime(b.pickup_at).split(",")[0] : "",
    dropoffAt: b.dropoff_at ? fmtDateTime(b.dropoff_at).split(",")[0] : "",
    pickupLoc: b.pickup_location ?? "",
    dropoffLoc: b.dropoff_location ?? "",
    driverName,
    driverPhone,
    odoOut: b.odometer_out ? String(b.odometer_out) : "",
    odoIn: b.odometer_in ? String(b.odometer_in) : "",
    fuel: b.fuel_level_out ?? "",
    tollTax,
    total: toNumber(b.total_amount),
    advance: toNumber(b.advance_amount),
    balance: toNumber(b.balance_amount),
    notes: b.notes ?? "",
    signature: b.signature_url ?? "",
    customFields,
    days,
    totalReading,
  };
}

export async function downloadBookingPdf(bookingId: string) {
  const data = await getBookingSheetData(bookingId);
  await drawPdf(data, `${data.bookingNo}.pdf`);
  return data.bookingNo;
}
