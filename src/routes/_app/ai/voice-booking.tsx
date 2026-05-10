import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { Mic } from "lucide-react";
export const Route = createFileRoute("/_app/ai/voice-booking")({ component: () => (
  <AiToolPanel feature="voice_booking" title="Voice → Booking" description="Spoken text to fields" icon={Mic}
    placeholder="Mr Ahmed wants Corolla from tomorrow 9am for 3 days, advance 10000…" />
)});
