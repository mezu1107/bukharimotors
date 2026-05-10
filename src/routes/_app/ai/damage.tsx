import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { Camera } from "lucide-react";
export const Route = createFileRoute("/_app/ai/damage")({ component: () => (
  <AiToolPanel feature="damage" title="Damage Detection" description="Vehicle photo → damage report" icon={Camera}
    needsImage placeholder="Optional: angle, vehicle reg #…" />
)});
