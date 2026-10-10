import { describe, it, expect } from "vitest";
import { calculateLotSize, floorToStep, NO_VALID_LOT_MESSAGE, type CalcInput, type CalcOk } from "./engine";
import { INSTRUMENTS, resolveInstrument, withUserConfirmed } from "./instruments";

// All expected values below were calculated by hand, independent of the engine.
const run = (i: CalcInput): CalcOk => {
  const r = calculateLotSize(i);
  if (!r.ok) throw new Error("expected ok, got errors: " + r.errors.join(" | "));
  return r;
};
const errs = (i: CalcInput): string[] => {
  const r = calculateLotSize(i);
  if (r.ok) throw new Error("expected errors");
  return r.errors;
};
const base: CalcInput = { symbol: "EURUSD", balanceUsd: 10000, risk: { mode: "percent", percent: 1 }, entry: 1.1, stop: { mode: "price", direction: "buy", stopLoss: 1.095 } };

describe("USD-quoted symbols", () => {
  it("EURUSD: $10,000 x 1% = $100; 50 pips; $10/pip/lot => $500/lot => 0.20 lots", () => {
    const r = run(base);
    expect(r.riskAmountUsd).toBeCloseTo(100, 6);
    expect(r.stopDistancePips).toBeCloseTo(50, 6);
    expect(r.pipValueUsdPerLot).toBeCloseTo(10, 6);
    expect(r.lossPerLotUsd).toBeCloseTo(500, 6);
    expect(r.lots).toBe(0.2);
    expect(r.estimatedLossUsd).toBeCloseTo(100, 6);
  });
  it("GBPUSD sell: $7,500 x 1% = $75; 30 pips => $300/lot => 0.25 lots", () => {
    const r = run({ ...base, symbol: "GBPUSD", balanceUsd: 7500, entry: 1.265, stop: { mode: "price", direction: "sell", stopLoss: 1.268 } });
    expect(r.lossPerLotUsd).toBeCloseTo(300, 6);
    expect(r.lots).toBe(0.25);
  });
  it("AUDUSD: $2,500 x 2% = $50; 40 pips => $400/lot => 0.125 floors to 0.12, loss $48", () => {
    const r = run({ ...base, symbol: "AUDUSD", balanceUsd: 2500, risk: { mode: "percent", percent: 2 }, entry: 0.66, stop: { mode: "price", direction: "buy", stopLoss: 0.656 } });
    expect(r.rawLots).toBeCloseTo(0.125, 9);
    expect(r.lots).toBe(0.12);
    expect(r.estimatedLossUsd).toBeCloseTo(48, 6);
  });
  it("XAUUSD: $5,000 x 2% = $100; $5.00 distance x 100 oz = $500/lot => 0.20 lots", () => {
    const r = run({ symbol: "XAUUSD", balanceUsd: 5000, risk: { mode: "percent", percent: 2 }, entry: 2000, stop: { mode: "price", direction: "buy", stopLoss: 1995 } });
    expect(r.stopDistance).toBe(5);
    expect(r.lossPerLotUsd).toBeCloseTo(500, 6);
    expect(r.lots).toBe(0.2);
    expect(r.stopDistancePips).toBeCloseTo(500, 6); // reference pip 0.01, shown separately from $ distance
    expect(r.assumptions.join(" ")).toContain("different units");
  });
});

describe("USD-base symbols (conversion to USD)", () => {
  it("USDJPY, entry as rate: 0.50 JPY x 100,000 = 50,000 JPY / 150 = $333.33/lot => exactly 0.30 lots", () => {
    const r = run({ symbol: "USDJPY", balanceUsd: 10000, risk: { mode: "percent", percent: 1 }, entry: 150, useEntryAsRate: true, stop: { mode: "price", direction: "buy", stopLoss: 149.5 } });
    expect(r.stopDistancePips).toBeCloseTo(50, 6);
    expect(r.pipValueUsdPerLot).toBeCloseTo(1000 / 150, 6); // 100,000 x 0.01 / 150 = 6.6667
    expect(r.lossPerLotUsd).toBeCloseTo(50000 / 150, 6);
    expect(r.lots).toBe(0.3); // float-noise case: 100 / 333.333... must not floor to 0.29
    expect(r.conversionSource).toBe("entry_price");
  });
  it("USDJPY with a manual rate of 155 => $322.58/lot => 0.31 lots", () => {
    const r = run({ symbol: "USDJPY", balanceUsd: 10000, risk: { mode: "percent", percent: 1 }, entry: 150, conversionRate: 155, stop: { mode: "price", direction: "buy", stopLoss: 149.5 } });
    expect(r.lossPerLotUsd).toBeCloseTo(50000 / 155, 6);
    expect(r.lots).toBe(0.31);
    expect(r.conversionSource).toBe("manual");
  });
  it("USDCHF, rate 0.88: 0.005 x 100,000 = 500 CHF / 0.88 = $568.18/lot => 0.176 floors to 0.17, loss $96.59", () => {
    const r = run({ symbol: "USDCHF", balanceUsd: 10000, risk: { mode: "percent", percent: 1 }, entry: 0.9, conversionRate: 0.88, stop: { mode: "price", direction: "buy", stopLoss: 0.895 } });
    expect(r.lossPerLotUsd).toBeCloseTo(500 / 0.88, 6);
    expect(r.lots).toBe(0.17);
    expect(r.estimatedLossUsd).toBeCloseTo(0.17 * (500 / 0.88), 6);
    expect(r.estimatedLossUsd).toBeLessThanOrEqual(r.riskAmountUsd);
  });
  it("USDCAD sell, rate 1.36: $4,000 x 1.5% = $60; 40 pips; 400 CAD / 1.36 = $294.12/lot => 0.204 floors to 0.20", () => {
    const r = run({ symbol: "USDCAD", balanceUsd: 4000, risk: { mode: "percent", percent: 1.5 }, entry: 1.36, conversionRate: 1.36, stop: { mode: "price", direction: "sell", stopLoss: 1.364 } });
    expect(r.riskAmountUsd).toBeCloseTo(60, 6);
    expect(r.lossPerLotUsd).toBeCloseTo(400 / 1.36, 6);
    expect(r.lots).toBe(0.2);
    expect(r.estimatedLossUsd).toBeCloseTo(0.2 * (400 / 1.36), 6);
  });
  it("missing conversion rate is an explained error, never a silent substitute", () => {
    const e = errs({ symbol: "USDJPY", balanceUsd: 10000, risk: { mode: "percent", percent: 1 }, entry: 150, stop: { mode: "price", direction: "buy", stopLoss: 149.5 } });
    expect(e.join(" ")).toMatch(/rate is required/);
    expect(errs({ symbol: "USDCHF", balanceUsd: 10000, risk: { mode: "percent", percent: 1 }, useEntryAsRate: true, stop: { mode: "distance", distance: 0.005 } }).join(" ")).toMatch(/entry price/);
    expect(errs({ symbol: "USDCAD", balanceUsd: 10000, risk: { mode: "percent", percent: 1 }, conversionRate: -1, stop: { mode: "distance", distance: 0.004 } }).join(" ")).toMatch(/greater than 0/);
  });
});

describe("risk modes", () => {
  it("fixed-dollar risk: $50, 20 pips on EURUSD => $200/lot => 0.25 lots", () => {
    const r = run({ symbol: "EURUSD", balanceUsd: 10000, risk: { mode: "fixed", amountUsd: 50 }, stop: { mode: "distance", distance: 0.002 } });
    expect(r.riskAmountUsd).toBe(50);
    expect(r.lots).toBe(0.25);
  });
});

describe("minimum and maximum lots", () => {
  it("minimum lot above budget: no valid lot, never rounded up (budget $0.50, min lot risks $5)", () => {
    const r = run({ ...base, balanceUsd: 100, risk: { mode: "percent", percent: 0.5 } });
    expect(r.noValidLot).toBe(true);
    expect(r.lots).toBe(0);
    expect(r.estimatedLossUsd).toBe(0);
    expect(r.message).toBe(NO_VALID_LOT_MESSAGE);
    expect(r.minLotLossUsd).toBeCloseTo(5, 6);
    expect(r.warnings.join(" ")).toContain("not increased automatically");
  });
  it("EURUSD cap: $100,000 risk / $100 per lot = 1,000 lots, capped to 200 (day and night)", () => {
    const i: CalcInput = { symbol: "EURUSD", balanceUsd: 1_000_000, risk: { mode: "percent", percent: 10 }, stop: { mode: "distance", distance: 0.001 } };
    expect(run(i).lots).toBe(200);
    expect(run({ ...i, session: "night" }).lots).toBe(200);
    expect(run(i).cappedByMaxLot).toBe(true);
    expect(run(i).warnings.join(" ")).toContain("exceeds the published day maximum");
  });
  it("USDCHF has a 60-lot night maximum but 200 by day; max is per-instrument, not universal", () => {
    const i: CalcInput = { symbol: "USDCHF", balanceUsd: 1_000_000, risk: { mode: "percent", percent: 10 }, conversionRate: 1, stop: { mode: "distance", distance: 0.001 } };
    expect(run(i).lots).toBe(200);
    expect(run({ ...i, session: "night" }).lots).toBe(60);
  });
  it("USDJPY on MT5 allows 300 lots by day and 200 at night", () => {
    // 0.1 JPY x 100,000 / 150 = $66.67/lot; $100,000 budget => 1,500 lots raw.
    const i: CalcInput = { symbol: "USDJPY", balanceUsd: 1_000_000, risk: { mode: "percent", percent: 10 }, conversionRate: 150, stop: { mode: "distance", distance: 0.1 } };
    expect(run(i).lots).toBe(300);
    expect(run({ ...i, session: "night" }).lots).toBe(200);
  });
  it("XAUUSD uses the published 200-lot maximum", () => {
    const r = run({ symbol: "XAUUSD", balanceUsd: 1_000_000, risk: { mode: "percent", percent: 10 }, stop: { mode: "distance", distance: 1 } });
    expect(r.rawLots).toBeCloseTo(1000, 6);
    expect(r.lots).toBe(200);
  });
});

describe("validation", () => {
  it("rejects bad balances", () => {
    for (const b of [0, -5, NaN, Infinity, "abc" as unknown as number, undefined as unknown as number])
      expect(errs({ ...base, balanceUsd: b }).join(" ")).toContain("Account balance");
  });
  it("rejects bad risk values", () => {
    for (const p of [0, -1, 101, NaN]) expect(errs({ ...base, risk: { mode: "percent", percent: p } }).join(" ")).toContain("Risk percentage");
    expect(errs({ ...base, risk: { mode: "fixed", amountUsd: 0 } }).join(" ")).toContain("Fixed risk");
    expect(errs({ ...base, risk: { mode: "fixed", amountUsd: 20000 } }).join(" ")).toContain("cannot exceed");
  });
  it("rejects invalid entry / stop prices and zero distance", () => {
    expect(errs({ ...base, entry: 0 }).join(" ")).toContain("Entry price");
    expect(errs({ ...base, entry: undefined }).join(" ")).toContain("Entry price");
    expect(errs({ ...base, stop: { mode: "price", direction: "buy", stopLoss: NaN } }).join(" ")).toContain("Stop-loss price");
    expect(errs({ ...base, stop: { mode: "price", direction: "buy", stopLoss: 1.1 } }).join(" ")).toContain("zero");
    expect(errs({ ...base, stop: { mode: "distance", distance: 0 } }).join(" ")).toContain("distance");
    expect(errs({ ...base, stop: { mode: "distance", distance: -0.001 } }).join(" ")).toContain("distance");
  });
  it("checks stop-loss side for buy and sell", () => {
    expect(errs({ ...base, stop: { mode: "price", direction: "buy", stopLoss: 1.105 } }).join(" ")).toContain("below the entry");
    expect(errs({ ...base, stop: { mode: "price", direction: "sell", stopLoss: 1.095 } }).join(" ")).toContain("above the entry");
  });
  it("rejects unsupported symbols with no silent substitution", () => {
    expect(errs({ ...base, symbol: "BTCUSD" }).join(" ")).toContain("Unsupported instrument");
  });
  it("rejects a spec with a missing essential value", () => {
    const broken = { ...INSTRUMENTS, EURUSD: { ...INSTRUMENTS.EURUSD, contractSize: { ...INSTRUMENTS.EURUSD.contractSize, value: 0 } } };
    expect(errs({ ...base, specs: broken }).join(" ")).toContain("contract size");
  });
  it("extreme values stay finite", () => {
    const r = calculateLotSize({ ...base, balanceUsd: 1e12, stop: { mode: "distance", distance: 1e-9 } });
    if (r.ok) expect(Number.isFinite(r.lots)).toBe(true);
  });
});

describe("rounding and precision", () => {
  it("floors to the step, never rounds up", () => {
    expect(floorToStep(0.7 - 0.4, 0.01)).toBe(0.3); // 0.29999999999999993 is float noise
    expect(floorToStep(0.299999999, 0.01)).toBe(0.29); // a real shortfall floors down
    expect(floorToStep(0.009, 0.01)).toBe(0);
    expect(floorToStep(0.19, 0.1)).toBe(0.1);
    expect(floorToStep(1.239, 0.01)).toBe(1.23);
    expect(floorToStep(0.1 + 0.2, 0.01)).toBe(0.3);
  });
  it("final lot risk never exceeds the budget (sweep)", () => {
    for (let pips = 5; pips <= 200; pips += 7) {
      const r = run({ symbol: "EURUSD", balanceUsd: 3333, risk: { mode: "percent", percent: 1.7 }, stop: { mode: "distance", distance: pips * 0.0001 } });
      expect(r.estimatedLossUsd).toBeLessThanOrEqual(r.riskAmountUsd + 1e-9);
    }
  });
});

describe("specification status", () => {
  it("official_reference values still produce a usable estimate with a non-blocking notice", () => {
    const r = run(base);
    expect(r.specStatus).toBe("official_reference");
    expect(r.lots).toBe(0.2);
    expect(r.notices.join(" ")).toContain("published Exness reference specifications");
    expect(r.uncheckedFields).toContain("lot step");
    expect(INSTRUMENTS.EURUSD.contractSize.status).toBe("official_reference");
    expect(INSTRUMENTS.EURUSD.lotStep.status).toBe("needs_review");
  });
  it("user-confirmed values change the calculation and the status", () => {
    const confirmed = withUserConfirmed(INSTRUMENTS.EURUSD, { mt5Symbol: "EURUSDm", lotStep: 0.1, maxLotDay: 100, maxLotNight: 100, priceDigits: 5, contractSize: 100000, pipSize: 0.0001, minLot: 0.01 });
    const specs = { ...INSTRUMENTS, EURUSD: confirmed };
    // $62.50 / $500 = 0.125 => floors to 0.1 with a 0.1 step
    const r = run({ ...base, balanceUsd: 6250, specs });
    expect(r.lots).toBe(0.1);
    expect(r.mt5Symbol).toBe("EURUSDm");
    expect(r.specStatus).toBe("user_confirmed");
    expect(r.uncheckedFields).toHaveLength(0);
  });
  it("finds instruments by configured MT5 alias", () => {
    const specs = { ...INSTRUMENTS, XAUUSD: withUserConfirmed(INSTRUMENTS.XAUUSD, { mt5Symbol: "XAUUSDm" }) };
    expect(resolveInstrument("xauusdm", specs)?.key).toBe("XAUUSD");
    expect(run({ symbol: "XAUUSDm", balanceUsd: 5000, risk: { mode: "percent", percent: 2 }, stop: { mode: "distance", distance: 5 }, specs }).lots).toBe(0.2);
  });
});
