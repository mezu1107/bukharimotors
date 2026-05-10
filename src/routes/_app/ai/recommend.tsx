import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { BadgeCheck } from "lucide-react";
export const Route = createFileRoute("/_app/ai/recommend")({ component: () => (
  <AiToolPanel feature="recommend" title="Vehicle Recommender" description="Match best vehicle to client" icon={BadgeCheck}
    placeholder="Family of 5, budget 8000/day, prefers automatic SUV…" />
)});
