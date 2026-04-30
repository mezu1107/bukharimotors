/**
 * WhatsApp click-to-share. Opens WhatsApp with prefilled message.
 * For automated sending with PDF attachments, swap to WhatsApp Cloud API later.
 */
export function openWhatsApp(phone: string, message: string) {
  // Normalize PK numbers: 03001234567 -> 923001234567
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "92" + p.slice(1);
  if (p.startsWith("92") === false && p.length === 10) p = "92" + p;
  const url = `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function shareBookingMessage(opts: {
  bookingNo: string;
  clientName: string;
  vehicle: string;
  pickup: string;
  dropoff: string;
  total: number;
  advance: number;
  balance: number;
}) {
  return `Assalam-o-Alaikum ${opts.clientName} 🚗

*Bukhari Motors & Rent A Car*
Booking: *${opts.bookingNo}*

Vehicle: ${opts.vehicle}
Pickup: ${opts.pickup}
Drop-off: ${opts.dropoff}

Total: PKR ${opts.total.toLocaleString()}
Advance: PKR ${opts.advance.toLocaleString()}
Balance: PKR ${opts.balance.toLocaleString()}

Shukriya for choosing us! For queries, please reply here.`;
}
