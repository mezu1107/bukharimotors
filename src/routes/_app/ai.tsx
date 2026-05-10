import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Sparkles, Bot, DollarSign, ShieldAlert, MessageSquare, FileText, BadgeCheck,
  TrendingUp, Wrench, Languages, Mic, Camera, FileSignature, Search,
} from "lucide-react";

export const Route = createFileRoute("/_app/ai")({ component: AiHub });

export const AI_TOOLS = [
  { id: "chat",             title: "AI Assistant",        icon: Bot,         hint: "Chat about bookings, vehicles, customers." },
  { id: "pricing",          title: "Smart Pricing",       icon: DollarSign,  hint: "Suggest a daily rate from vehicle + season." },
  { id: "risk",             title: "Customer Risk Score", icon: ShieldAlert, hint: "Score a client by history & license." },
  { id: "whatsapp",         title: "WhatsApp Generator",  icon: MessageSquare, hint: "Polite bilingual rental message." },
  { id: "summarize",        title: "Doc Summarizer",      icon: FileText,    hint: "Summarize long contracts / notes." },
  { id: "recommend",        title: "Vehicle Recommender", icon: BadgeCheck,  hint: "Match best vehicle to client." },
  { id: "forecast",         title: "Revenue Forecast",    icon: TrendingUp,  hint: "Predict 7-day revenue & bookings." },
  { id: "fraud",            title: "Fraud Detector",      icon: ShieldAlert, hint: "Flag suspicious payments." },
  { id: "maintenance",      title: "Maintenance Predict", icon: Wrench,      hint: "Predict next service date / km." },
  { id: "translate",        title: "Urdu Translator",     icon: Languages,   hint: "Convert text to Urdu." },
  { id: "voice-booking",    title: "Voice → Booking",     icon: Mic,         hint: "Spoken text → booking fields." },
  { id: "damage",           title: "Damage Detection",    icon: Camera,      hint: "Photo → damage report." },
  { id: "ocr-cnic",         title: "CNIC / License OCR",  icon: Camera,      hint: "Photo → identity fields." },
  { id: "signature-verify", title: "Signature Verify",    icon: FileSignature, hint: "Compare two signatures." },
  { id: "smart-search",     title: "Smart Search",        icon: Search,      hint: "Natural language → filters." },
] as const;

function AiHub() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // If on a sub-route, show child only
  if (path !== "/ai") return <Outlet />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Sparkles className="size-6 text-primary" /> AI Tools
        </h1>
        <p className="text-sm text-muted-foreground">15 dedicated AI modules — each on its own page.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AI_TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.id} to={`/ai/${t.id}` as string} className="group">
              <Card className="p-4 border bg-card h-full transition hover:shadow-elegant hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-sm">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.hint}</div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
