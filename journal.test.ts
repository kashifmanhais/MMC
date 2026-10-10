import { describe, it, expect } from "vitest";
import { validateRecord, validateImage, isAnalysisUrl, toRow, fromRow, type JournalRecord } from "./record";
import { summarize, rrDistribution, netRRCandles, executionStats, executionByDay, executionByMonth, monthRecords } from "./stats";
const base: JournalRecord = { date: "2026-10-01", timeframe: "1H", instrument: "EURUSD", direction: "Long", result: "Win", rr: 2, activated: true, reentry: false, url: "", beforePath: null, afterPath: null, execution: null };
const R = (date: string, result: any, rr: number | null, extra: Partial<JournalRecord> = {}): JournalRecord => ({ ...base, date, result, rr, ...extra });
describe("validateRecord", () => {
  it("accepts a valid record", () => expect(validateRecord(base)).toEqual([]));
  it("requires the core fields", () => expect(validateRecord({ ...base, date: "", timeframe: "", instrument: " ", direction: "", result: "" }).length).toBe(5));
  it("enforces RR sign per result and R-multiples wording", () => {
    expect(validateRecord({ ...base, rr: -1 })[0]).toContain("not points");
    expect(validateRecord({ ...base, result: "Loss", rr: 1 }).length).toBe(1);
    expect(validateRecord({ ...base, result: "Breakeven", rr: 0.5 }).length).toBe(1);
    expect(validateRecord({ ...base, result: "Breakeven", rr: 0 })).toEqual([]);
    expect(validateRecord({ ...base, result: "Running", rr: 2 }).length).toBe(1);
    expect(validateRecord({ ...base, result: "Running", rr: null })).toEqual([]);
  });
  it("re-entry needs activation; link host and rating are checked", () => {
    expect(validateRecord({ ...base, activated: false, reentry: true }).length).toBe(1);
    expect(validateRecord({ ...base, url: "https://evil.com" }).length).toBe(1);
    expect(validateRecord({ ...base, execution: 6 }).length).toBe(1);
    expect(validateRecord({ ...base, execution: 3, url: "https://www.tradingview.com/x/a/" })).toEqual([]);
  });
  it("urls and images", () => {
    expect(isAnalysisUrl("http://tradingview.com/x")).toBe(false); expect(isAnalysisUrl("https://faketradingview.com/x")).toBe(false); expect(isAnalysisUrl("https://wa.me/1")).toBe(true);
    expect(validateImage({ type: "image/gif", size: 10 }, "Before")).toContain("PNG"); expect(validateImage({ type: "image/png", size: 10 * 1024 * 1024 + 1 }, "After")).toContain("10 MB"); expect(validateImage({ type: "image/webp", size: 5 }, "A")).toBe("");
  });
  it("row mapping round-trips", () => { const r = { ...base, id: "x", execution: 4, url: "https://wa.me/1", beforePath: "u/a.png" }; expect(fromRow({ ...toRow(r), id: "x", rr: "2.00" })).toEqual(r); });
});
describe("statistics", () => {
  const rs = [R("2026-10-01", "Win", 2), R("2026-10-02", "Win", 1.5), R("2026-10-03", "Loss", -1), R("2026-10-04", "Breakeven", 0), R("2026-10-05", "No Confirmation", null), R("2026-10-06", "Running", null), R("2026-09-30", "Loss", -1)];
  it("summary: win rate from decided wins and losses only", () => { const s = summarize(monthRecords(rs, "2026-10")); expect([s.total, s.wins, s.losses, s.breakeven, s.noConfirmation, s.running, s.noFinalRR]).toEqual([6, 2, 1, 1, 1, 1, 2]); expect(s.winRate).toBeCloseTo(66.667, 2); expect(s.netRR).toBeCloseTo(2.5, 9); expect(summarize([]).winRate).toBeNull(); });
  it("distribution counts decided trades only", () => expect(rrDistribution(rs).reduce((a, b) => a + b.count, 0)).toBe(5));
  it("candles chain the running net RR", () => expect(netRRCandles([R("2026-10-03", "Win", 1), R("2026-10-01", "Win", 2), R("2026-10-02", "Loss", -1)]).map((c) => [c.open, c.close])).toEqual([[0, 2], [2, 1], [1, 2]]));
  it("execution: only user ratings, unrated excluded", () => { const e = executionStats([R("2026-10-01", "Win", 1, { execution: 4 }), R("2026-10-02", "Win", 1, { execution: 2 }), R("2026-10-03", "Win", 1)]); expect(e).toEqual({ rated: 2, unrated: 1, average: 3 }); expect(executionStats([]).average).toBeNull(); });
  it("execution by day and by month use only rated records", () => {
    const x = [R("2026-09-01", "Win", 1, { execution: 4 }), R("2026-09-01", "Win", 1, { execution: 2 }), R("2026-09-03", "Win", 1, { execution: 5 }), R("2026-09-04", "Win", 1), R("2026-10-01", "Win", 1, { execution: 3 })];
    expect(executionByDay(x, "2026-09").map((d) => [d.day, d.average])).toEqual([[1, 3], [3, 5]]);
    expect(executionByDay(x, "2026-08")).toEqual([]);
    expect(executionByMonth(x).map((m) => [m.ym, m.count])).toEqual([["2026-09", 3], ["2026-10", 1]]);
  });
});
