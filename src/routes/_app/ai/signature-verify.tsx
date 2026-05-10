import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { FileSignature } from "lucide-react";
export const Route = createFileRoute("/_app/ai/signature-verify")({ component: () => (
  <AiToolPanel feature="signature_verify" title="Signature Verify" description="Compare two signatures" icon={FileSignature}
    needsImage placeholder="Upload combined image showing both signatures side-by-side." />
)});
