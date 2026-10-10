import { INSTRUMENTS, resolveInstrument, type InstrumentSpec, type SpecStatus } from "./instruments";

export const ACCOUNT_CURRENCY = "USD";
export const NO_VALID_LOT_MESSAGE = "No valid lot size within this risk budget.";
export const ESTIMATE_NOTICE =
  "Estimate based on published Exness reference specifications, not live MT5 data. Check the exact symbol in MT5 (Market Watch > right-click symbol > Specification).";
export const COST_DISCLAIMER =
  "These are price-movement estimates, not guaranteed losses. Spread, slippage, commission, swap, gaps and execution conditions can change the realized result.";

export type RiskInput = { mode: "percent"; percent: number } | { mode: "fixed"; amountUsd: number };
export type StopInput =
  | { mode: "price"; direction: "buy" | "sell"; stopLoss: number }
  | { mode: "distance"; distance: number };

export type CalcInput = {
  symbol: string;
  balanceUsd: number;
  risk: RiskInput;
  stop: StopInput;
  /** Entry price. Required for stop-loss price mode and for useEntryAsRate. */
  entry?: number;
  /**
   * Market price of the USD-base pair (quote currency per 1 USD), e.g. USDJPY 155.
   * Needed for USDJPY, USDCHF, USDCAD. Ignored for USD-quoted symbols.
   */
  conversionRate?: number;
  /** Explicit opt-in: use the entry price of this same pair as the conversion rate. */
  useEntryAsRate?: boolean;
  session?: "day" | "night";
  specs?: Record<string, InstrumentSpec>;
};

export type CalcOk = {
  ok: true;
  symbol: string;
  mt5Symbol: string;
  riskAmountUsd: number;
  stopDistance: number;
  stopDistancePips: number;
  pipValueUsdPerLot: number;
  lossPerLotUsd: number;
  rawLots: number;
  /** Final lot rounded DOWN to the step; 0 when there is no valid lot. */
  lots: number;
  noValidLot: boolean;
  message: string | null;
  estimatedLossUsd: number;
  minLotLossUsd: number;
  cappedByMaxLot: boolean;
  maxLotApplied: number;
  conversionRateUsed: number | null;
  conversionSource: "not_needed" | "manual" | "entry_price";
  specStatus: Exclude<SpecStatus, "needs_review"> | "official_reference";
  /** Fields still using unchecked defaults (shown as a notice, never blocking). */
  uncheckedFields: string[];
  assumptions: string[];
  warnings: string[];
  notices: string[];
};
export type CalcErr = { ok: false; errors: string[] };
export type CalcResult = CalcOk | CalcErr;

const isPos = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const clean = (n: number) => Number(n.toFixed(10)); // removes binary float noise from subtraction

function decimals(n: number): number {
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

/** Floor to a volume step using scaled integers (never rounds up, tolerant of float noise). */
export function floorToStep(value: number, step: number): number {
  const scale = 10 ** decimals(step);
  const stepInt = Math.round(step * scale);
  const valInt = Math.floor(value * scale + 1e-9);
  return (Math.floor(valInt / stepInt) * stepInt) / scale;
}

export function calculateLotSize(input: CalcInput): CalcResult {
  const errors: string[] = [];
  const registry = input.specs ?? INSTRUMENTS;
  const spec = resolveInstrument(input.symbol, registry);
  if (!spec) return { ok: false, errors: [`Unsupported instrument "${input.symbol}": no specification is configured.`] };

  // Essential spec values must exist and be sane.
  for (const [name, f] of [["contract size", spec.contractSize], ["pip size", spec.pipSize], ["minimum lot", spec.minLot], ["lot step", spec.lotStep], ["maximum lot", spec.maxLotDay], ["maximum lot (night)", spec.maxLotNight]] as const) {
    if (!isPos(f?.value)) errors.push(`Specification for ${spec.key} is missing a valid ${name}. Add it in the instrument configuration.`);
  }

  if (!isPos(input.balanceUsd)) errors.push("Account balance must be a number greater than 0 (USD).");

  let riskUsd = NaN;
  if (input.risk.mode === "percent") {
    if (!isPos(input.risk.percent) || input.risk.percent > 100) errors.push("Risk percentage must be greater than 0 and at most 100.");
    else if (isPos(input.balanceUsd)) riskUsd = (input.balanceUsd * input.risk.percent) / 100;
  } else if (!isPos(input.risk.amountUsd)) {
    errors.push("Fixed risk amount must be greater than $0.");
  } else if (isPos(input.balanceUsd) && input.risk.amountUsd > input.balanceUsd) {
    errors.push("Fixed risk amount cannot exceed the account balance.");
  } else riskUsd = input.risk.amountUsd;

  // Stop distance in price units
  let distance = NaN;
  if (input.stop.mode === "distance") {
    if (!isPos(input.stop.distance)) errors.push("Stop-loss distance must be greater than 0.");
    else distance = input.stop.distance;
  } else {
    if (!isPos(input.entry)) errors.push("Entry price must be greater than 0 when using a stop-loss price.");
    if (!isPos(input.stop.stopLoss)) errors.push("Stop-loss price must be greater than 0.");
    if (input.stop.direction !== "buy" && input.stop.direction !== "sell") errors.push("Choose Buy or Sell so the stop-loss side can be checked.");
    if (isPos(input.entry) && isPos(input.stop.stopLoss)) {
      const sl = input.stop.stopLoss;
      if (sl === input.entry) errors.push("Stop-loss distance is zero. Stop-loss cannot equal the entry price.");
      else if (input.stop.direction === "buy" && sl > input.entry) errors.push("For a Buy, the stop-loss must be below the entry price.");
      else if (input.stop.direction === "sell" && sl < input.entry) errors.push("For a Sell, the stop-loss must be above the entry price.");
      else if (input.stop.direction === "buy" || input.stop.direction === "sell") distance = clean(Math.abs(input.entry - sl));
    }
  }

  // Conversion: USD value of 1 unit of the quote currency (usdPerQuote)
  let usdPerQuote = NaN;
  let rateUsed: number | null = null;
  let conversionSource: CalcOk["conversionSource"] = "not_needed";
  if (spec.quote === "USD") {
    usdPerQuote = 1;
  } else if (spec.base === "USD") {
    let rate: number | undefined;
    if (input.conversionRate !== undefined) {
      if (!isPos(input.conversionRate)) errors.push(`The ${spec.key} conversion rate must be greater than 0.`);
      else { rate = input.conversionRate; conversionSource = "manual"; }
    } else if (input.useEntryAsRate) {
      if (!isPos(input.entry)) errors.push(`Enter the entry price, or type a current ${spec.key} rate manually.`);
      else { rate = input.entry; conversionSource = "entry_price"; }
    } else {
      errors.push(`A current ${spec.key} rate is required to convert ${spec.quote} to USD. Enter it manually, or choose to use your entry price as the rate.`);
    }
    if (rate !== undefined) { rateUsed = rate; usdPerQuote = 1 / rate; }
  } else {
    errors.push(`No USD conversion is defined for ${spec.key} (${spec.base}/${spec.quote}).`);
  }

  if (errors.length) return { ok: false, errors };

  const contract = spec.contractSize.value;
  const pip = spec.pipSize.value;
  const step = spec.lotStep.value;
  const minLot = spec.minLot.value;
  const session = input.session ?? "day";
  const maxLot = session === "night" ? spec.maxLotNight.value : spec.maxLotDay.value;

  const pipValueUsdPerLot = contract * pip * usdPerQuote;
  const lossPerLotUsd = distance * contract * usdPerQuote;
  if (!isPos(lossPerLotUsd)) return { ok: false, errors: ["Calculated loss per lot is not a valid number. Check the stop distance and rate."] };

  const rawLots = riskUsd / lossPerLotUsd;
  let lots = floorToStep(rawLots, step);
  const warnings: string[] = [];
  let noValidLot = false;
  let message: string | null = null;
  let cappedByMaxLot = false;
  const minLotLossUsd = minLot * lossPerLotUsd;

  if (lots < minLot) {
    noValidLot = true; lots = 0; message = NO_VALID_LOT_MESSAGE;
    warnings.push(`The minimum lot (${minLot}) would risk about $${minLotLossUsd.toFixed(2)}, above your $${riskUsd.toFixed(2)} budget. The lot size is not increased automatically. Widen the risk budget or tighten the stop.`);
  } else if (lots > maxLot) {
    cappedByMaxLot = true; lots = floorToStep(maxLot, step);
    warnings.push(`The calculated size (${rawLots.toFixed(2)} lots) exceeds the published ${session} maximum of ${maxLot} lots for ${spec.key}. Volume is capped at ${lots}, so your actual risk is below the budget.`);
  }

  const fields = { "contract size": spec.contractSize, "pip size": spec.pipSize, "minimum lot": spec.minLot, "lot step": spec.lotStep, "maximum lot": session === "night" ? spec.maxLotNight : spec.maxLotDay, "price precision": spec.priceDigits };
  const uncheckedFields = Object.entries(fields).filter(([, f]) => f.status !== "user_confirmed").map(([n]) => n);
  const allConfirmed = uncheckedFields.length === 0;
  const notices: string[] = [];
  if (!allConfirmed) notices.push(ESTIMATE_NOTICE);
  const reviewFields = Object.entries(fields).filter(([, f]) => f.status === "needs_review").map(([n]) => n);
  if (reviewFields.length) notices.push(`Using reference defaults (not stated by Exness) for: ${reviewFields.join(", ")}.`);
  notices.push(COST_DISCLAIMER);

  const assumptions = [
    `Symbol ${spec.key} (MT5 name: ${spec.mt5Symbol}); account currency ${ACCOUNT_CURRENCY}.`,
    `Contract size ${contract}; reference pip size ${pip}; minimum lot ${minLot}; lot step ${step}; ${session} maximum ${maxLot} lots.`,
    spec.key === "XAUUSD"
      ? "Gold loss uses the $ price distance x 100 oz. A reference pip (0.01), an MT5 point and a $1 move are different units."
      : "Pips here use the reference pip size above. An MT5 point is usually a tenth of a pip on 5-digit symbols.",
    conversionSource === "not_needed" ? "Quote currency is USD, so no conversion is needed."
      : conversionSource === "manual" ? `Quote-to-USD uses your rate ${rateUsed}: USD per ${spec.quote} = 1 / ${rateUsed}.`
      : `Quote-to-USD uses your entry price (${rateUsed}) as the ${spec.key} rate: USD per ${spec.quote} = 1 / ${rateUsed}.`,
    "Lot size is rounded down to the volume step and never increased to reach the minimum.",
  ];

  return {
    ok: true, symbol: spec.key, mt5Symbol: spec.mt5Symbol, riskAmountUsd: riskUsd,
    stopDistance: distance, stopDistancePips: clean(distance / pip), pipValueUsdPerLot, lossPerLotUsd,
    rawLots, lots, noValidLot, message, estimatedLossUsd: lots * lossPerLotUsd, minLotLossUsd,
    cappedByMaxLot, maxLotApplied: maxLot, conversionRateUsed: rateUsed, conversionSource,
    specStatus: allConfirmed ? "user_confirmed" : "official_reference", uncheckedFields, assumptions, warnings, notices,
  };
}
