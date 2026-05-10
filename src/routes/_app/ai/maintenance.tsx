import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { Wrench } from "lucide-react";
export const Route = createFileRoute("/_app/ai/maintenance")({ component: () => (
  <AiToolPanel feature="maintenance" title="Maintenance Predictor" description="Predict next service" icon={Wrench}
    placeholder="Civic 2019, current 92,400 km, last oil 88k, brake pads 76k…" />
)});
