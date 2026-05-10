import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { Languages } from "lucide-react";
export const Route = createFileRoute("/_app/ai/translate")({ component: () => (
  <AiToolPanel feature="translate" title="Urdu Translator" description="English → Urdu" icon={Languages}
    placeholder="Paste English text to translate…" />
)});
