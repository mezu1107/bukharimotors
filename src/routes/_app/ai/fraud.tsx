import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { ShieldAlert } from "lucide-react";
export const Route = createFileRoute("/_app/ai/fraud")({ component: () => (
  <AiToolPanel feature="fraud" title="Fraud Detector" description="Flag suspicious payments" icon={ShieldAlert}
    placeholder="Recent payments list / booking anomalies…" />
)});
