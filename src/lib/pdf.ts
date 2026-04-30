import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtDateTime, fmtMoney } from "./format";

export interface RentalPdfData {
  bookingNo: string;
  createdAt: string;
  client: { name: string; phone: string; cnic?: string; address?: string; license_no?: string };
  vehicle: { make: string; model: string; year?: number; reg: string; color?: string };
  driver?: { name: string; phone: string } | null;
  pickup_at: string;
  dropoff_at: string;
  pickup_location?: string;
  dropoff_location?: string;
  odometer_in?: number | null;
  odometer_out?: number | null;
  fuel_level_in?: string | null;
  fuel_level_out?: string | null;
  daily_rate: number;
  days: number;
  driver_rate?: number;
  extra_charges?: number;
  discount?: number;
  tax?: number;
  total: number;
  advance: number;
  balance: number;
  security_deposit?: number;
  notes?: string;
  signature_dataurl?: string | null;
  terms?: string;
}

export function generateRentalPdf(d: RentalPdfData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(40, 32, 90);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 215, 100);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BUKHARI MOTORS", 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(230, 230, 245);
  doc.setFont("helvetica", "normal");
  doc.text("& Rent A Car — Rental Agreement", 14, 21);

  doc.setFontSize(9);
  doc.text(`Booking #: ${d.bookingNo}`, pageW - 14, 14, { align: "right" });
  doc.text(`Date: ${fmtDateTime(d.createdAt)}`, pageW - 14, 21, { align: "right" });

  let y = 38;
  doc.setTextColor(20, 20, 30);

  const sectionTitle = (t: string) => {
    doc.setFillColor(245, 245, 252);
    doc.rect(10, y - 4, pageW - 20, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 32, 90);
    doc.text(t, 13, y + 1);
    doc.setTextColor(20, 20, 30);
    doc.setFont("helvetica", "normal");
    y += 8;
  };

  // Client
  sectionTitle("CLIENT DETAILS");
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      ["Name:", d.client.name, "Phone:", d.client.phone],
      ["CNIC:", d.client.cnic ?? "-", "License #:", d.client.license_no ?? "-"],
      ["Address:", d.client.address ?? "-", "", ""],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 22 }, 2: { fontStyle: "bold", cellWidth: 22 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Vehicle
  sectionTitle("VEHICLE DETAILS");
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      [
        "Vehicle:",
        `${d.vehicle.make} ${d.vehicle.model} ${d.vehicle.year ?? ""}`.trim(),
        "Reg #:",
        d.vehicle.reg,
      ],
      ["Color:", d.vehicle.color ?? "-", "Driver:", d.driver?.name ?? "Self-drive"],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 22 }, 2: { fontStyle: "bold", cellWidth: 22 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Trip
  sectionTitle("TRIP & VEHICLE STATE");
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [40, 32, 90], textColor: 255 },
    styles: { fontSize: 9 },
    head: [["", "Pickup", "Drop-off"]],
    body: [
      ["Date / Time", fmtDateTime(d.pickup_at), fmtDateTime(d.dropoff_at)],
      ["Location", d.pickup_location ?? "-", d.dropoff_location ?? "-"],
      ["Odometer (km)", String(d.odometer_in ?? "-"), String(d.odometer_out ?? "-")],
      ["Fuel Level", d.fuel_level_in ?? "-", d.fuel_level_out ?? "-"],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Charges
  sectionTitle("CHARGES");
  const charges: [string, string][] = [
    [`Daily Rate × ${d.days} day(s)`, fmtMoney(d.daily_rate * d.days)],
  ];
  if (d.driver_rate) charges.push([`Driver charges × ${d.days} day(s)`, fmtMoney(d.driver_rate * d.days)]);
  if (d.extra_charges) charges.push(["Extra charges", fmtMoney(d.extra_charges)]);
  if (d.discount) charges.push(["Discount", `- ${fmtMoney(d.discount)}`]);
  if (d.tax) charges.push(["Tax", fmtMoney(d.tax)]);
  charges.push(["TOTAL", fmtMoney(d.total)]);
  charges.push(["Advance Paid", fmtMoney(d.advance)]);
  charges.push(["Balance Due", fmtMoney(d.balance)]);
  if (d.security_deposit) charges.push(["Security Deposit", fmtMoney(d.security_deposit)]);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9 },
    body: charges,
    columnStyles: { 0: { cellWidth: 110 }, 1: { halign: "right", fontStyle: "bold" } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  if (d.notes) {
    sectionTitle("NOTES");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(d.notes, pageW - 28), 14, y);
    y += 10;
  }

  // Terms
  if (y > 230) { doc.addPage(); y = 20; }
  sectionTitle("TERMS & CONDITIONS");
  const terms = d.terms ?? `1. The Renter is fully responsible for the vehicle from pickup to drop-off.
2. Any damage, loss, or theft during the rental period is the Renter's responsibility.
3. Late return charges apply at the daily rate per day or part thereof.
4. The vehicle must be returned with the same fuel level it was given in.
5. Smoking is strictly prohibited inside the vehicle. Cleaning fee may apply.
6. Sub-letting or transferring the vehicle to a third party is not permitted.
7. The Renter agrees to all charges listed above.`;
  doc.setFontSize(8);
  const termLines = doc.splitTextToSize(terms, pageW - 28);
  doc.text(termLines, 14, y);
  y += termLines.length * 3.5 + 6;

  // Signature
  sectionTitle("SIGNATURES");
  doc.setFontSize(9);
  doc.text("Renter Signature:", 14, y + 6);
  doc.text("Bukhari Motors:", pageW / 2 + 5, y + 6);
  if (d.signature_dataurl) {
    try { doc.addImage(d.signature_dataurl, "PNG", 14, y + 8, 70, 22); } catch { /* ignore */ }
  }
  doc.line(14, y + 32, 14 + 70, y + 32);
  doc.line(pageW / 2 + 5, y + 32, pageW / 2 + 5 + 70, y + 32);

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Bukhari Motors & Rent A Car — Pakistan", pageW / 2, pageH - 8, { align: "center" });

  return doc;
}
