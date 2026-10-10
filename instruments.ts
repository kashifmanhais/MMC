/**
 * ROS calculator: centralized instrument configuration.
 * Reference: Exness Standard account, MetaTrader 5, USD account currency.
 *
 * Every field carries a status and a source:
 *  - official_reference: taken from public Exness documentation (see SOURCES).
 *  - user_confirmed:     checked against the user's own MT5 symbol specification.
 *  - needs_review:       not stated by Exness docs; a configurable default only.
 * None of these values come from a live MT5 connection. Nothing here is "verified
 * in the user's terminal" unless a field is user_confirmed.
 */
export type SpecStatus = "official_reference" | "user_confirmed" | "needs_review";

export type Field<T> = { value: T; status: SpecStatus; source: string };

export type InstrumentSpec = {
  /** Canonical key used by ROS (e.g. EURUSD). */
  key: string;
  /** Actual MT5 symbol name, e.g. "EURUSDm" if the broker adds a suffix. */
  mt5Symbol: string;
  displayName: string;
  base: string;
  quote: string;
  contractSize: Field<number>;
  /** Reference pip size. NOT the same as an MT5 point or a $1 gold move. */
  pipSize: Field<number>;
  minLot: Field<number>;
  lotStep: Field<number>;
  /** Maximum volume during the day / at night, as published. */
  maxLotDay: Field<number>;
  maxLotNight: Field<number>;
  /** Quoted price decimals (for display and input checks). */
  priceDigits: Field<number>;
};

export const SOURCES = {
  forex: "https://get.exness.help/hc/en-us/articles/17854278192284-Forex",
  commodities: "https://get.exness.help/hc/en-us/articles/17854173039388-Commodities",
  terms: "https://get.exness.help/hc/en-us/articles/360014740179-Common-trading-terms",
} as const;

const official = <T>(value: T, source: string): Field<T> => ({ value, status: "official_reference", source });
const review = <T>(value: T, source: string): Field<T> => ({ value, status: "needs_review", source });

const STEP_NOTE = "Volume step is not stated in Exness docs; 0.01 is a reference default. Check in MT5 Specification.";
const DIGITS_NOTE = "Price precision is not stated in Exness docs; reference default. Check in MT5 Specification.";

function fx(key: string, base: string, quote: string, opts: { pip: number; digits: number; maxDay: number; maxNight: number; maxNote?: string }): InstrumentSpec {
  const s = SOURCES.forex;
  return {
    key, mt5Symbol: key, displayName: `${base}/${quote}`, base, quote,
    contractSize: official(100000, s),
    pipSize: official(opts.pip, s),
    minLot: official(0.01, s),
    lotStep: review(0.01, STEP_NOTE),
    maxLotDay: official(opts.maxDay, opts.maxNote ?? s),
    maxLotNight: official(opts.maxNight, s),
    priceDigits: review(opts.digits, DIGITS_NOTE),
  };
}

/**
 * Maximum volumes as listed on the Exness Forex page (retrieved 2026-10-09):
 * day 200 / night 60 by default; EURUSD, GBPUSD, USDJPY night 200;
 * USDJPY day 300 for MT5 accounts. Exceptions are per instrument, not universal.
 */
export const INSTRUMENTS: Record<string, InstrumentSpec> = {
  EURUSD: fx("EURUSD", "EUR", "USD", { pip: 0.0001, digits: 5, maxDay: 200, maxNight: 200 }),
  GBPUSD: fx("GBPUSD", "GBP", "USD", { pip: 0.0001, digits: 5, maxDay: 200, maxNight: 200 }),
  USDJPY: fx("USDJPY", "USD", "JPY", { pip: 0.01, digits: 3, maxDay: 300, maxNight: 200, maxNote: SOURCES.forex + " (300 lots daytime applies to MT5 accounts)" }),
  USDCHF: fx("USDCHF", "USD", "CHF", { pip: 0.0001, digits: 5, maxDay: 200, maxNight: 60 }),
  AUDUSD: fx("AUDUSD", "AUD", "USD", { pip: 0.0001, digits: 5, maxDay: 200, maxNight: 60 }),
  USDCAD: fx("USDCAD", "USD", "CAD", { pip: 0.0001, digits: 5, maxDay: 200, maxNight: 60 }),
  XAUUSD: {
    key: "XAUUSD", mt5Symbol: "XAUUSD", displayName: "Gold (XAU/USD)", base: "XAU", quote: "USD",
    contractSize: official(100, SOURCES.commodities), // troy ounces per lot
    pipSize: official(0.01, SOURCES.commodities),
    minLot: official(0.01, SOURCES.commodities),
    lotStep: review(0.01, STEP_NOTE),
    // The Commodities page lists a single 200-lot maximum for XAUUSD (no night limit).
    maxLotDay: official(200, SOURCES.commodities),
    maxLotNight: official(200, SOURCES.commodities),
    priceDigits: review(2, DIGITS_NOTE),
  },
};

/** Find a spec by canonical key or by configured MT5 symbol name (case-insensitive). */
export function resolveInstrument(name: string, registry: Record<string, InstrumentSpec> = INSTRUMENTS): InstrumentSpec | undefined {
  const n = String(name).trim().toUpperCase();
  return Object.values(registry).find((s) => s.key.toUpperCase() === n || s.mt5Symbol.toUpperCase() === n);
}

/** Apply values the user checked in MT5; changed fields become user_confirmed. */
export type SpecPatch = Partial<{
  mt5Symbol: string; contractSize: number; pipSize: number; minLot: number; lotStep: number;
  maxLotDay: number; maxLotNight: number; priceDigits: number;
}>;
export function withUserConfirmed(spec: InstrumentSpec, patch: SpecPatch, note = "Checked in MT5 Specification by the user"): InstrumentSpec {
  const out: InstrumentSpec = { ...spec };
  if (patch.mt5Symbol !== undefined) out.mt5Symbol = patch.mt5Symbol;
  for (const k of ["contractSize", "pipSize", "minLot", "lotStep", "maxLotDay", "maxLotNight", "priceDigits"] as const) {
    const v = patch[k];
    if (v !== undefined) out[k] = { value: v, status: "user_confirmed", source: note };
  }
  return out;
}
