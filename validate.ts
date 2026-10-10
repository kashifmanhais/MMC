import { isAnalysisUrl } from "../journal/record";
export type PostInput = { title: string; url: string; note: string; published: boolean };
/** Analysis posts are links to WhatsApp or TradingView only (https). No images, no invented content. */
export function validatePost(p: PostInput): string[] {
  const e: string[] = [], t = p.title.trim();
  if (!t) e.push("Title is required."); else if (t.length > 120) e.push("Title must be 120 characters or fewer.");
  if (!p.url.trim()) e.push("Link is required."); else if (!isAnalysisUrl(p.url.trim())) e.push("Link must be an https URL on tradingview.com, wa.me or whatsapp.com.");
  if (p.note.trim().length > 500) e.push("Note must be 500 characters or fewer.");
  return e;
}
