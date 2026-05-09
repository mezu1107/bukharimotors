import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiAssist } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Sparkles, Mic, Camera, MessageSquare, Languages, Search, ShieldAlert, TrendingUp, Wrench, BadgeCheck, FileSignature, Bot, FileText, DollarSign } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ai")({ component: AiToolsPage });

const FEATURES = [
  { id: "chat",             title: "AI Assistant",         icon: Bot,         hint: "Ask anything about bookings, vehicles, customers." },
  { id: "pricing",          title: "Smart Pricing",        icon: DollarSign,  hint: "Suggest a daily rate from vehicle + season." },
  { id: "risk",             title: "Customer Risk Score",  icon: ShieldAlert, hint: "Score a client by history & license." },
  { id: "whatsapp",         title: "WhatsApp Generator",   icon: MessageSquare, hint: "Generate a polite bilingual message." },
  { id: "summarize",        title: "Doc Summarizer",       icon: FileText,    hint: "Summarize long contracts or notes." },
  { id: "recommend",        title: "Vehicle Recommender",  icon: BadgeCheck,  hint: "Match best vehicle to client preferences." },
  { id: "forecast",         title: "Revenue Forecast",     icon: TrendingUp,  hint: "Predict next 7 days bookings & revenue." },
  { id: "fraud",            title: "Fraud Detector",       icon: ShieldAlert, hint: "Flag suspicious payments." },
  { id: "maintenance",      title: "Maintenance Predict",  icon: Wrench,      hint: "Predict next service date / km." },
  { id: "translate",        title: "Urdu Translator",      icon: Languages,   hint: "Convert form text to Urdu." },
  { id: "voice_booking",    title: "Voice → Booking",      icon: Mic,         hint: "Speak/paste booking, get structured fields." },
  { id: "damage",           title: "Damage Detection",     icon: Camera,      hint: "Upload vehicle photo for damage report." },
  { id: "ocr_cnic",         title: "CNIC / License OCR",   icon: Camera,      hint: "Extract identity data from photo." },
  { id: "signature_verify", title: "Signature Verify",     icon: FileSignature, hint: "Compare two signature images." },
  { id: "smart_search",     title: "Smart Search",         icon: Search,      hint: "Natural language → vehicle filters." },
] as const;

type FeatureId = typeof FEATURES[number]["id"];
const NEEDS_IMAGE: FeatureId[] = ["damage", "ocr_cnic", "signature_verify"];

function AiToolsPage() {
  const [active, setActive] = useState<FeatureId>("chat");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string>("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(aiAssist);

  const cur = FEATURES.find((f) => f.id === active)!;

  const onFile = (f?: File) => {
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setImage(String(fr.result));
    fr.readAsDataURL(f);
  };

  const run = async () => {
    if (NEEDS_IMAGE.includes(active) && !image) { toast.error("Please upload an image"); return; }
    if (!NEEDS_IMAGE.includes(active) && !text.trim()) { toast.error("Please enter something"); return; }
    setLoading(true); setOutput("");
    try {
      const res = await fn({ data: { feature: active, text, image: image || undefined } });
      setOutput(res.text || "(empty response)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Sparkles className="size-6 text-primary" /> AI Tools
        </h1>
        <p className="text-sm text-muted-foreground">15 next-level AI features powered by Lovable AI.</p>
      </div>

      <Tabs value={active} onValueChange={(v) => { setActive(v as FeatureId); setOutput(""); setImage(""); setText(""); }}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary p-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <TabsTrigger key={f.id} value={f.id} className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
                <Icon className="size-3.5" /> {f.title}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {FEATURES.map((f) => (
          <TabsContent key={f.id} value={f.id} className="mt-4">
            <Card className="p-5 space-y-4 border bg-card">
              <div>
                <h2 className="font-display text-lg font-semibold">{f.title}</h2>
                <p className="text-sm text-muted-foreground">{f.hint}</p>
              </div>

              {NEEDS_IMAGE.includes(f.id) && (
                <div>
                  <Label>Upload image</Label>
                  <Input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />
                  {image && <img src={image} alt="" className="mt-2 max-h-48 rounded border" />}
                </div>
              )}

              <div>
                <Label>{f.id === "chat" ? "Your question" : "Input / context"}</Label>
                <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type here…" />
              </div>

              <Button onClick={run} disabled={loading} className="bg-gradient-primary text-primary-foreground">
                {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                Run AI
              </Button>

              {output && (
                <div className="rounded-lg bg-secondary p-4 whitespace-pre-wrap text-sm font-mono leading-relaxed">{output}</div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
