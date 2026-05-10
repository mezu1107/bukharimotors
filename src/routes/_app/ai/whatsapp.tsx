import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { MessageSquare } from "lucide-react";
export const Route = createFileRoute("/_app/ai/whatsapp")({ component: () => (
  <AiToolPanel feature="whatsapp" title="WhatsApp Generator" description="Bilingual rental message" icon={MessageSquare}
    placeholder="Booking BM-001, Civic, 3 days, balance 15000…" />
)});
