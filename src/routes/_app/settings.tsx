import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

interface CompanyForm {
  company_name: string;
  tagline: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  website: string;
  logo_url: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  form_banner: string;
}

const DEFAULT_FORM: CompanyForm = {
  company_name: "Bukhari Motors & Rent A Car",
  tagline: "Luxury | Comfort | Trust",
  phone: "+92 321 5300920",
  whatsapp_number: "+92 321 5300920",
  email: "",
  address: "G-6 Markaz, Melody Market Islamabad",
  website: "",
  logo_url: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  form_banner: "ALL KINDS OF VEHICLES ARE AVAILABLE WITH DRIVERS FOR LOCAL AND OUTSTATION",
};

function SettingsPage() {
  const [form, setForm] = useState<CompanyForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("company_settings").select("*").eq("id", true).maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setForm({
          company_name: data.company_name ?? DEFAULT_FORM.company_name,
          tagline: data.tagline ?? "",
          phone: data.phone ?? "",
          whatsapp_number: data.whatsapp_number ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          website: data.website ?? "",
          logo_url: data.logo_url ?? "",
          facebook_url: data.facebook_url ?? "",
          instagram_url: data.instagram_url ?? "",
          tiktok_url: data.tiktok_url ?? "",
          youtube_url: data.youtube_url ?? "",
          form_banner: data.form_banner ?? DEFAULT_FORM.form_banner,
        });
      }
      setLoading(false);
    })();
  }, []);

  const update = (key: keyof CompanyForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `company-logo/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) {
      toast.error(error.message);
    } else {
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
    else toast.success("Company settings saved");
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">These details automatically appear on rental form image/PDF exports.</p>
      </div>

      <Card className="border bg-card p-5 shadow-sm">
        <form onSubmit={save} className="grid gap-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center rounded-lg bg-secondary p-4">
            <img src={form.logo_url || logo} alt="Company logo preview" className="size-20 rounded-lg object-cover border bg-background" />
            <div className="flex-1">
              <Label>Logo</Label>
              <Input value={form.logo_url} onChange={(e) => update("logo_url", e.target.value)} placeholder="Logo URL or upload below" />
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">
                  <UploadCloud className="size-4 mr-2" /> {uploading ? "Uploading…" : "Upload Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Company Name</Label><Input required value={form.company_name} onChange={(e) => update("company_name", e.target.value)} /></div>
            <div><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
            <div><Label>WhatsApp Number</Label><Input value={form.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
            <div><Label>Website URL</Label><Input value={form.website} onChange={(e) => update("website", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Form Banner Text</Label><Input value={form.form_banner} onChange={(e) => update("form_banner", e.target.value)} /></div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 border-t pt-5">
            <div><Label>Facebook</Label><Input value={form.facebook_url} onChange={(e) => update("facebook_url", e.target.value)} /></div>
            <div><Label>Instagram</Label><Input value={form.instagram_url} onChange={(e) => update("instagram_url", e.target.value)} /></div>
            <div><Label>TikTok</Label><Input value={form.tiktok_url} onChange={(e) => update("tiktok_url", e.target.value)} /></div>
            <div><Label>YouTube</Label><Input value={form.youtube_url} onChange={(e) => update("youtube_url", e.target.value)} /></div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="bg-gradient-primary text-primary-foreground" disabled={saving}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
