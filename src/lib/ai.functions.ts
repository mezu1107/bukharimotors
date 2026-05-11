import { createServerFn } from "@tanstack/react-start";

type Feature =
  | "pricing"
  | "risk"
  | "whatsapp"
  | "summarize"
  | "recommend"
  | "forecast"
  | "fraud"
  | "maintenance"
  | "translate"
  | "voice_booking"
  | "damage"
  | "ocr_cnic"
  | "chat"
  | "signature_verify"
  | "smart_search";

const PROMPTS: Record<Feature, { system: string; model?: string }> = {
  pricing: {
    system: `You are a Pakistani car-rental pricing analyst for Bukhari Motors (Islamabad). Given vehicle details, requested dates, season, and historical bookings, return a recommended PKR daily rate with brief reasoning. Reply in JSON: {"recommended_rate": number, "low": number, "high": number, "reason": "..."}.`,
  },
  risk: {
    system: `You assess rental customer risk based on past bookings, payment history, and license info. Reply STRICT JSON: {"score": 0-100, "level": "low"|"medium"|"high", "flags": [string], "advice": string}. Higher score = safer.`,
  },
  whatsapp: {
    system: `You write short professional bilingual (English + simple Roman Urdu) WhatsApp messages for Bukhari Motors. Friendly, under 60 words, with relevant emojis. Output the message text only.`,
  },
  summarize: {
    system: `Summarize the given rental notes/contract text in 3-5 short bullet points. Highlight payment, damage, and overdue items.`,
  },
  recommend: {
    system: `You are a vehicle recommender. Given client preferences and available vehicles, return JSON: {"recommendations":[{"vehicle_id":"...","reason":"..."}]} ranked best first.`,
  },
  forecast: {
    system: `You forecast next-7-days rental revenue and bookings count from historical data. Reply JSON: {"next_7_days":[{"date":"YYYY-MM-DD","bookings":n,"revenue":n}], "insight":"..."}.`,
  },
  fraud: {
    system: `Detect anomalies in payment / booking records. Reply JSON: {"alerts":[{"severity":"low|med|high","title":"","detail":""}]}. Empty array if nothing suspicious.`,
  },
  maintenance: {
    system: `Predict next maintenance need from odometer history & past services. Reply JSON: {"predicted_service":"...","due_in_km":n,"due_date":"YYYY-MM-DD","confidence":"low|medium|high"}.`,
  },
  translate: {
    system: `Translate the given English rental form text into clean simple Urdu (Nastaliq script). Preserve numbers and English brand names. Output Urdu text only.`,
  },
  voice_booking: {
    system: `Extract structured booking fields from the user's spoken text. Reply JSON: {"client_name":"","client_phone":"","vehicle":"","pickup":"YYYY-MM-DDTHH:mm","dropoff":"YYYY-MM-DDTHH:mm","daily_rate":n,"advance":n,"notes":""}. Missing fields: empty string.`,
  },
  damage: {
    system: `You are an automotive damage inspector. Look at the vehicle photo and list visible damage with location and severity. Reply JSON: {"damage_count":n,"items":[{"location":"front bumper","type":"scratch","severity":"minor|moderate|severe","estimated_cost_pkr":n}],"overall_condition":"excellent|good|fair|poor"}.`,
    model: "google/gemini-2.5-pro",
  },
  ocr_cnic: {
    system: `Extract identity fields from the CNIC / driving-license photo. Reply JSON: {"name":"","cnic":"#####-#######-#","license_no":"","dob":"YYYY-MM-DD","license_expiry":"YYYY-MM-DD","address":""}. Empty string if unreadable.`,
    model: "google/gemini-2.5-pro",
  },
  chat: {
    system: `You are the Bukhari Motors AI assistant. Help rental staff with bookings, customer questions, and operations. Be concise. Use Urdu when the user does.`,
  },
  signature_verify: {
    system: `Compare two signatures and reply JSON: {"match_score":0-100,"likely_same_person":true|false,"notes":"..."}.`,
    model: "google/gemini-2.5-pro",
  },
  smart_search: {
    system: `Convert a natural-language search like "white toyota corolla under 5000 per day available next week" into JSON filters: {"make":"","model":"","color":"","max_daily_rate":n,"min_daily_rate":n,"available_from":"YYYY-MM-DD","available_to":"YYYY-MM-DD","keywords":[]}.`,
  },
};

interface AssistInput {
  feature: Feature;
  payload?: unknown;
  image?: string; // data URL
  text?: string;
}

export const aiAssist = createServerFn({ method: "POST" })
  .inputValidator((data: AssistInput) => {
    if (!data || typeof data.feature !== "string") throw new Error("Invalid input");
    return data;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured");
    const cfg = PROMPTS[data.feature] ?? { system: "You are a helpful assistant.", model: undefined };
    const userText = data.text ?? (data.payload ? JSON.stringify(data.payload) : "");

    const userContent: unknown = data.image
      ? [
          { type: "text", text: userText || "Analyze this image." },
          { type: "image_url", image_url: { url: data.image } },
        ]
      : userText;

    const body = {
      model: cfg.model ?? "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: cfg.system },
        { role: "user", content: userContent },
      ],
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.status === 429) throw new Error("AI rate-limit exceeded. Please retry in a minute.");
    if (r.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace Usage.");
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      throw new Error(`AI gateway error ${r.status}: ${errText.slice(0, 200)}`);
    }
    const json = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";

    // Try to extract JSON if response contains it
    let parsedJson: string | null = null;
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try { JSON.parse(jsonMatch[0]); parsedJson = jsonMatch[0]; } catch { /* ignore */ }
    }

    // Usage logging skipped (no auth context).

    return { text, parsedJson };
  });
