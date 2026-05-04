import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type EventPayload = { table: string; eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> };

function titleFor(payload: EventPayload) {
  if (payload.table === "bookings") return payload.eventType === "INSERT" ? "New booking created" : "Booking updated";
  if (payload.table === "payments") return payload.eventType === "INSERT" ? "Payment received" : "Payment updated";
  if (payload.table === "reminders") return "Reminder updated";
  if (payload.table === "vehicles") return "Vehicle status changed";
  return "Bukhari Motors update";
}

function bodyFor(payload: EventPayload) {
  const row = payload.new ?? payload.old ?? {};
  if (payload.table === "bookings") return `Booking ${String(row.booking_no ?? "")} is ${String(row.status ?? "updated")}`.trim();
  if (payload.table === "payments") return `Amount: ${String(row.amount ?? "")} — ${String(row.status ?? "recorded")}`;
  if (payload.table === "reminders") return String(row.title ?? row.message ?? "A reminder needs attention");
  if (payload.table === "vehicles") return `${String(row.registration_no ?? "Vehicle")} is ${String(row.status ?? "updated")}`;
  return "A new update is available.";
}

async function notify(payload: EventPayload) {
  const title = titleFor(payload);
  const body = bodyFor(payload);
  toast(title, { description: body, icon: <Bell className="size-4" /> });

  try { navigator.vibrate?.([180, 80, 180]); } catch { /* unsupported */ }
  try {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.24);
  } catch { /* browser blocks sound until user interaction */ }

  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  const options = { body, icon: "/icon-192.png", badge: "/icon-192.png", vibrate: [180, 80, 180], tag: `${payload.table}-${payload.eventType}` } as NotificationOptions & { vibrate: number[] };
  if (registration?.active) registration.active.postMessage({ type: "SHOW_NOTIFICATION", title, options });
  else new Notification(title, options);
}

export function RealtimeNotifications() {
  const { user } = useAuth();
  const askedRef = useRef(false);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!askedRef.current && "Notification" in window && Notification.permission === "default") {
      askedRef.current = true;
      toast("Enable realtime alerts", {
        description: "Allow notifications for booking, payment and reminder alerts.",
        action: { label: "Enable", onClick: () => Notification.requestPermission() },
      });
    }

    const channel = supabase
      .channel("staff-live-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (p) => notify({ table: "bookings", eventType: p.eventType, new: p.new, old: p.old }))
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, (p) => notify({ table: "payments", eventType: p.eventType, new: p.new, old: p.old }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, (p) => notify({ table: "reminders", eventType: p.eventType, new: p.new, old: p.old }))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vehicles" }, (p) => notify({ table: "vehicles", eventType: p.eventType, new: p.new, old: p.old }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return null;
}