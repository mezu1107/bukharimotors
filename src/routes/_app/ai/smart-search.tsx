import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { Search } from "lucide-react";
export const Route = createFileRoute("/_app/ai/smart-search")({ component: () => (
  <AiToolPanel feature="smart_search" title="Smart Search" description="Natural language → filters" icon={Search}
    placeholder="white toyota corolla under 5000 per day available next week" />
)});
