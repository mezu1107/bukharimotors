import { createFileRoute } from "@tanstack/react-router";
import { AiToolPanel } from "@/components/ai-tool-panel";
import { Camera } from "lucide-react";
export const Route = createFileRoute("/_app/ai/ocr-cnic")({ component: () => (
  <AiToolPanel feature="ocr_cnic" title="CNIC / License OCR" description="Extract identity fields" icon={Camera}
    needsImage placeholder="Optional notes…" />
)});
