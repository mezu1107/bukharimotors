import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { Bot } from "lucide-react";
export const Route = createFileRoute("/_app/ai/chat")({ component: () => (
  <AiToolPanel feature="chat" title="AI Assistant" description="Chat about bookings, vehicles, customers" icon={Bot}
    placeholder="Ask anything in English or Urdu…" />
)});
