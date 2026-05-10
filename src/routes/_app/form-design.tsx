import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, UploadCloud, Palette } from "lucide-react";
import { toast } from "sonner";
import logoFallback from "@/assets/logo.jpg";

export const Route = createFileRoute("/_app/form-design")({ component: FormDesignPage });

interface DesignForm {
  logo_url: string;
  tagline: string;
  form_banner: string;
  header_color: string;
  accent_color: string;
  footer_text: string;
  footer_subtext: string;
  stars_text: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

const DEFAULTS: DesignForm = {
  logo_url: "",
  tagline: "LUXURY | COMFORT | TRUST",
  form_banner: "ALL KINDS OF VEHICLES ARE AVAILABLE WITH DRIVERS FOR LOCAL AND OUTSTATION",
  header_color: "#062A4D",
  accent_color: "#B98A32",
  footer_text: "Thank you",
  footer_subtext: "FOR CHOOSING US",
  stars_text: "★★★★★",
  phone: "",
  email: "",
  website: "",
  address: "",
};

function FormDesignPage() {
  const [form, setForm] = useState<DesignForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("company_settings").select("*").eq("id", true).maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setForm({
          logo_url: data.logo_url ?? "",
          tagline: data.tagline ?? DEFAULTS.tagline,
          form_banner: data.form_banner ?? DEFAULTS.form_banner,
          header_color: (data as { header_color?: string }).header_color ?? DEFAULTS.header_color,
          accent_color: (data as { accent_color?: string }).accent_color ?? DEFAULTS.accent_color,
          footer_text: (data as { footer_text?: string }).footer_text ?? DEFAULTS.footer_text,
          footer_subtext: (data as { footer_subtext?: string }).footer_subtext ?? DEFAULTS.footer_subtext,
          stars_text: (data as { stars_text?: string }).stars_text ?? DEFAULTS.stars_text,
          phone: data.phone ?? "",
          email: data.email ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof DesignForm>(k: K, v: DesignForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `company-logo/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) { toast.error(error.message); }
    else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      update("logo_url", data.publicUrl);
      toast.success("Logo uploaded");
    }
    setUploading(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("company_settings").upsert({ id: true, ...form });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Design saved — applies to next rental form");
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  const logoSrc = form.logo_url || logoFallback;

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Palette className="size-6 text-primary" /> Form Design</h1>
        <p className="text-sm text-muted-foreground">Customize the rental form header, footer, banner, and colors. Live preview below.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border bg-card p-5 shadow-sm">
          <form onSubmit={save} className="grid gap-4">
            <div className="flex gap-3 items-center rounded-lg bg-secondary p-3">
              <img src={logoSrc} alt="" className="size-16 rounded-lg object-cover border bg-background" />
              <div className="flex-1">
                <Label>Logo</Label>
                <Input value={form.logo_url} onChange={(e) => update("logo_url", e.target.value)} placeholder="URL or upload" />
                <label className="mt-2 inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-3 text-sm hover:bg-accent">
                  <UploadCloud className="size-4 mr-2" /> {uploading ? "Uploading…" : "Upload Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} disabled={uploading} />
                </label>
              </div>
            </div>

            <div><Label>Tagline (under logo)</Label><Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} /></div>
            <div><Label>Banner Text</Label><Input value={form.form_banner} onChange={(e) => update("form_banner", e.target.value)} /></div>
            <div><Label>Stars Line</Label><Input value={form.stars_text} onChange={(e) => update("stars_text", e.target.value)} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Header / Bands Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={form.header_color} onChange={(e) => update("header_color", e.target.value)} className="w-16 p-1" />
                  <Input value={form.header_color} onChange={(e) => update("header_color", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Accent (Gold) Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} className="w-16 p-1" />
                  <Input value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Footer Big Text</Label><Input value={form.footer_text} onChange={(e) => update("footer_text", e.target.value)} /></div>
              <div><Label>Footer Subtext</Label><Input value={form.footer_subtext} onChange={(e) => update("footer_subtext", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-4">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
              <div className="col-span-2"><Label>Website</Label><Input value={form.website} onChange={(e) => update("website", e.target.value)} /></div>
              <div className="col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
            </div>

            <Button type="submit" className="bg-gradient-primary text-primary-foreground" disabled={saving}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
              Save Design
            </Button>
          </form>
        </Card>

        <Card className="border bg-card p-3 shadow-sm overflow-auto">
          <div className="text-xs text-muted-foreground mb-2 px-2">Live preview</div>
          <div className="bg-white rounded shadow-inner overflow-hidden">
            <div style={{ height: 18, background: form.header_color }} />
            <div style={{ height: 6, background: form.accent_color }} />
            <div className="p-5 grid grid-cols-2 gap-4 items-center">
              <div className="text-center">
                <img src={logoSrc} alt="" className="mx-auto h-20 object-contain" />
                <div style={{ fontSize: 11, letterSpacing: 4, marginTop: 6, color: "#0F172A", fontWeight: 600 }}>{form.tagline}</div>
                <div style={{ fontSize: 18, color: "#F59E0B", letterSpacing: 6, marginTop: 4 }}>{form.stars_text}</div>
              </div>
              <div className="text-xs text-slate-800 space-y-1">
                <div>☎ <strong>{form.phone}</strong></div>
                {form.email && <div>✉ {form.email}</div>}
                {form.website && <div>🌐 {form.website}</div>}
                {form.address && <div>📍 {form.address}</div>}
              </div>
            </div>
            <div style={{ background: form.header_color, color: "#FFF", padding: "8px 16px", textAlign: "center", fontSize: 12, fontWeight: 700 }}>
              {form.form_banner}
            </div>
            <div className="p-8 text-center">
              <div style={{ fontFamily: "Georgia, serif", fontSize: 32, color: form.accent_color, fontStyle: "italic" }}>{form.footer_text}</div>
              <div style={{ fontSize: 11, letterSpacing: 6, fontWeight: 700, color: "#0F172A" }}>{form.footer_subtext}</div>
            </div>
            <div style={{ height: 6, background: form.accent_color }} />
            <div style={{ height: 24, background: form.header_color }} />
          </div>
        </Card>
      </div>
    </div>
  );
}
