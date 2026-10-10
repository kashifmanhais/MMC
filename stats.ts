import { DECIDED, RESULTS, isExecutionRating, type JournalRecord } from "./record";
const dec = (rs: JournalRecord[]) => rs.filter((r) => DECIDED.includes(r.result) && typeof r.rr === "number");
export const monthRecords = (rs: JournalRecord[], ym: string) => rs.filter((r) => r.date.slice(0, 7) === ym);
/** Win rate = wins / (wins + losses). Breakeven, No Confirmation and Running are excluded from the denominator. Net RR = sum of RR over Win, Loss, Breakeven. */
export function summarize(rs: JournalRecord[]) {
  const c = (k: string) => rs.filter((r) => r.result === k).length, w = c("Win"), l = c("Loss");
  return { total: rs.length, wins: w, losses: l, breakeven: c("Breakeven"), noConfirmation: c("No Confirmation"), running: c("Running"),
    winRate: w + l ? (w / (w + l)) * 100 : null, netRR: dec(rs).reduce((a, r) => a + (r.rr as number), 0), noFinalRR: rs.filter((r) => typeof r.rr !== "number").length };
}
const BUCKETS: [string, (x: number) => boolean][] = [["≤ -1", (x) => x <= -1], ["-1 to 0", (x) => x > -1 && x < 0], ["BE", (x) => x === 0], ["0 to 1", (x) => x > 0 && x <= 1], ["1 to 2", (x) => x > 1 && x <= 2], ["2 to 3", (x) => x > 2 && x <= 3], ["> 3", (x) => x > 3]];
export const rrDistribution = (rs: JournalRecord[]) => BUCKETS.map(([label, f]) => ({ label, count: dec(rs).filter((r) => f(r.rr as number)).length }));
/** Candle per decided trade in date order: opens at the running net RR, closes after adding its RR. No OHLC is invented. */
export function netRRCandles(rs: JournalRecord[]) {
  let cum = 0;
  return dec(rs).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((r) => { const open = cum; cum += r.rr as number; return { open, close: cum, rr: r.rr as number, date: r.date, result: r.result }; });
}
export function executionStats(rs: JournalRecord[]) {
  const rated = rs.filter((r) => isExecutionRating(r.execution));
  return { rated: rated.length, unrated: rs.length - rated.length, average: rated.length ? rated.reduce((a, r) => a + (r.execution as number), 0) / rated.length : null };
}
export const resultCounts = (rs: JournalRecord[]) => RESULTS.map((k) => ({ result: k, count: rs.filter((r) => r.result === k).length }));

const dayOf = (d: string) => Number(d.slice(8, 10));
/** Average of user-entered execution ratings per day of the selected month (unrated records excluded). */
export function executionByDay(rs: JournalRecord[], ym: string) {
  const m: Record<number, number[]> = {};
  for (const r of monthRecords(rs, ym)) if (isExecutionRating(r.execution)) (m[dayOf(r.date)] ||= []).push(r.execution);
  return Object.entries(m).map(([d, v]) => ({ day: Number(d), average: v.reduce((a, b) => a + b, 0) / v.length, values: v })).sort((a, b) => a.day - b.day);
}
export function executionByMonth(rs: JournalRecord[]) {
  const m: Record<string, number[]> = {};
  for (const r of rs) if (isExecutionRating(r.execution) && r.date) (m[r.date.slice(0, 7)] ||= []).push(r.execution);
  return Object.entries(m).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([ym, v]) => ({ ym, average: v.reduce((a, b) => a + b, 0) / v.length, count: v.length }));
}
