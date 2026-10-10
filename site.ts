/** Central, owner-editable configuration. Empty string = "not configured": the matching button is disabled and says so. */
const env = (v: string | undefined) => (v ?? "").trim();

export const site = {
  brand: "MMC Redesign",
  tagline: "Mirror Market Concept",
  founder: "Kashif Manhais",
  email: "kashif.manhais@gmail.com",
  phone: "03019897728",
  logoPath: "/logo.png",
  /** VIP Community WhatsApp channel (supplied by the owner). Override with NEXT_PUBLIC_VIP_WHATSAPP_URL. */
  vipUrl: env(process.env.NEXT_PUBLIC_VIP_WHATSAPP_URL) || "https://whatsapp.com/channel/0029Vb9670eHbFVEkebTTA1B",
  /**
   * Class-booking WhatsApp contact. NOT provided yet, so it is empty and the button stays disabled.
   * It is separate from the VIP channel and must never reuse it. Set NEXT_PUBLIC_CLASS_WHATSAPP_URL in Vercel when you have the link.
   */
  classWhatsApp: env(process.env.NEXT_PUBLIC_CLASS_WHATSAPP_URL),
  /** Leave empty until finalized. Never invent dates or fees. */
  classes: { dates: "", fee: "", capacity: "", payment: "" },
} as const;

const WA_HOSTS = ["whatsapp.com", "wa.me"];
export function isWhatsAppUrl(u: string): boolean {
  try { const x = new URL(u); return x.protocol === "https:" && WA_HOSTS.some((h) => x.hostname === h || x.hostname.endsWith("." + h)); } catch { return false; }
}
