import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { FileText } from "lucide-react";
export const Route = createFileRoute("/_app/ai/summarize")({ component: () => (
  <AiToolPanel feature="summarize" title="Doc Summarizer" description="Summarize contracts or notes" icon={FileText}
    placeholder="Paste long rental notes or contract text…" />
)});
