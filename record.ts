export const RESULTS = ["Win", "Loss", "Breakeven", "No Confirmation", "Running"] as const;
export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "Daily", "Weekly"] as const;
export const DECIDED: readonly string[] = ["Win", "Loss", "Breakeven"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export type Result = (typeof RESULTS)[number];
/** RR is ALWAYS in R-multiples. Points are not accepted, so units can never be mixed. */
export type JournalRecord = {
  id?: string; date: string; timeframe: string; instrument: string; direction: "Long" | "Short" | "";
  result: Result | ""; rr: number | null; activated: boolean; reentry: boolean; url: string;
  beforePath: string | null; afterPath: string | null; execution: number | null;
};
const HOSTS = ["tradingview.com", "whatsapp.com", "wa.me"];
export function isAnalysisUrl(u: string): boolean {
  try { const x = new URL(u); return x.protocol === "https:" && HOSTS.some((h) => x.hostname === h || x.hostname.endsWith("." + h)); } catch { return false; }
}
export const isExecutionRating = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;
export function rrError(result: string, rr: number | null): string {
  const n = typeof rr === "number" && Number.isFinite(rr);
  if (result === "Win") return n && rr! > 0 ? "" : "For a Win, enter a positive RR (for example 2).";
  if (result === "Loss") return n && rr! < 0 ? "" : "For a Loss, enter a negative RR (for example -1).";
  if (result === "Breakeven") return rr === 0 ? "" : "For Breakeven, RR must be 0.";
  return "";
}
export function validateRecord(r: JournalRecord): string[] {
  const e: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || Number.isNaN(Date.parse(r.date))) e.push("Date is required.");
  if (!TIMEFRAMES.includes(r.timeframe as never)) e.push("Timeframe is required.");
  const inst = r.instrument.trim();
  if (!inst) e.push("Pair / Instrument is required."); else if (inst.length > 30) e.push("Pair / Instrument must be 30 characters or fewer.");
  if (r.direction !== "Long" && r.direction !== "Short") e.push("Direction is required.");
  if (!RESULTS.includes(r.result as never)) e.push("Result is required.");
  else if (DECIDED.includes(r.result)) { const m = rrError(r.result, r.rr); if (m) e.push(m + " RR is in R-multiples, not points."); }
  else if (r.rr !== null) e.push("RR applies only to Win, Loss and Breakeven.");
  if (r.reentry && !r.activated) e.push("Re-entry can only be ticked when the trade was Activated.");
  if (r.url && !isAnalysisUrl(r.url)) e.push("Link must be an https URL on tradingview.com, wa.me or whatsapp.com.");
  if (r.execution !== null && !isExecutionRating(r.execution)) e.push("Execution rating must be a whole number from 1 to 5.");
  return e;
}
export function validateImage(f: { type: string; size: number }, label: string): string {
  if (!IMAGE_TYPES.includes(f.type)) return `${label} image must be PNG, JPEG or WebP.`;
  if (f.size > MAX_IMAGE_BYTES) return `${label} image is larger than 10 MB.`;
  return "";
}
export function toRow(r: JournalRecord) {
  return { entry_date: r.date, timeframe: r.timeframe, instrument: r.instrument.trim(), direction: r.direction, result: r.result, rr: r.rr, trade_activated: r.activated,
    reentry_taken: r.reentry, execution_rating: r.execution, analysis_url: r.url || null, before_image_path: r.beforePath, after_image_path: r.afterPath };
}
export function fromRow(x: Record<string, any>): JournalRecord {
  return { id: x.id, date: x.entry_date, timeframe: x.timeframe, instrument: x.instrument, direction: x.direction, result: x.result, rr: x.rr === null ? null : Number(x.rr),
    activated: !!x.trade_activated, reentry: !!x.reentry_taken, url: x.analysis_url ?? "", beforePath: x.before_image_path ?? null, afterPath: x.after_image_path ?? null,
    execution: x.execution_rating ?? null };
}
