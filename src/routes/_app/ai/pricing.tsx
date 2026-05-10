import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { DollarSign } from "lucide-react";
export const Route = createFileRoute("/_app/ai/pricing")({ component: () => (
  <AiToolPanel feature="pricing" title="Smart Pricing" description="Suggest a daily rate" icon={DollarSign}
    placeholder="Toyota Corolla 2020, 5 days, peak season Eid…" />
)});
