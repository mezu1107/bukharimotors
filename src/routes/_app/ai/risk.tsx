import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { ShieldAlert } from "lucide-react";
export const Route = createFileRoute("/_app/ai/risk")({ component: () => (
  <AiToolPanel feature="risk" title="Customer Risk Score" description="Score a client by history & license" icon={ShieldAlert}
    placeholder="Client: Ali Khan, 3 past bookings, 1 late return, license expires 2026…" />
)});
