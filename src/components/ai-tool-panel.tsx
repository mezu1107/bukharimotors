import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiAssist } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

type Feature =
  | "pricing" | "risk" | "whatsapp" | "summarize" | "recommend"
  | "forecast" | "fraud" | "maintenance" | "translate" | "voice_booking"
  | "damage" | "ocr_cnic" | "chat" | "signature_verify" | "smart_search";

interface Props {
  feature: Feature;
  title: string;
  description: string;
  icon: LucideIcon;
  needsImage?: boolean;
  placeholder?: string;
}

export function AiToolPanel({ feature, title, description, icon: Icon, needsImage, placeholder }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(aiAssist);

  const onFile = (f?: File) => {
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setImage(String(fr.result));
    fr.readAsDataURL(f);
  };

  const run = async () => {
    if (needsImage && !image) { toast.error("Please upload an image"); return; }
    if (!needsImage && !text.trim()) { toast.error("Please enter something"); return; }
    setLoading(true); setOutput("");
    try {
      const res = await fn({ data: { feature, text, image: image || undefined } });
      setOutput(res.text || "(empty response)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/ai"><Button size="icon" variant="ghost"><ArrowLeft className="size-4" /></Button></Link>
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center">
            <Icon className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4 border bg-card">
        {needsImage && (
          <div>
            <Label>Upload image</Label>
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />
            {image && <img src={image} alt="" className="mt-2 max-h-56 rounded border" />}
          </div>
        )}
        <div>
          <Label>{feature === "chat" ? "Your question" : "Input / context"}</Label>
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? "Type here…"} />
        </div>
        <Button onClick={run} disabled={loading} className="bg-gradient-primary text-primary-foreground">
          {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
          Run AI
        </Button>
        {output && (
          <div className="rounded-lg bg-secondary p-4 whitespace-pre-wrap text-sm font-mono leading-relaxed">{output}</div>
        )}
      </Card>
    </div>
  );
}
