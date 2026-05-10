import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { TrendingUp } from "lucide-react";
export const Route = createFileRoute("/_app/ai/forecast")({ component: () => (
  <AiToolPanel feature="forecast" title="Revenue Forecast" description="7-day prediction" icon={TrendingUp}
    placeholder="Last 30 days: avg 5 bookings/day, 65k PKR/day…" />
)});
