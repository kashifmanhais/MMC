"use client";
import { useMemo, useState } from "react";
import { calculateLotSize, type CalcInput, type CalcResult } from "@/lib/calculator/engine";
import { INSTRUMENTS } from "@/lib/calculator/instruments";

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#b8975a]";

export default function CalculatorForm() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [balance, setBalance] = useState("");
  const [riskMode, setRiskMode] = useState<"percent" | "fixed">("percent");
  const [risk, setRisk] = useState("1");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [stopMode, setStopMode] = useState<"price" | "distance">("price");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [rate, setRate] = useState("");
  const [useEntry, setUseEntry] = useState(true);
  const [session, setSession] = useState<"day" | "night">("day");
  const [submitted, setSubmitted] = useState(false);

  const spec = INSTRUMENTS[symbol];
  const needsRate = spec.base === "USD" && spec.quote !== "USD";

  const result: CalcResult | null = useMemo(() => {
    if (!submitted) return null;
    const i: CalcInput = {
      symbol, balanceUsd: num(balance), session,
      risk: riskMode === "percent" ? { mode: "percent", percent: num(risk) } : { mode: "fixed", amountUsd: num(risk) },
      stop: stopMode === "price" ? { mode: "price", direction, stopLoss: num(stop) } : { mode: "distance", distance: num(stop) },
      entry: entry.trim() === "" ? undefined : num(entry),
      conversionRate: needsRate && rate.trim() !== "" ? num(rate) : undefined,
      useEntryAsRate: needsRate && rate.trim() === "" ? useEntry : false,
    };
    return calculateLotSize(i);
  }, [submitted, symbol, balance, riskMode, risk, direction, stopMode, entry, stop, rate, useEntry, session, needsRate]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} noValidate className="space-y-4 rounded-xl border border-neutral-200 bg-[#faf7f0] p-4 sm:p-6">
        <label className="block text-sm font-medium">Instrument
          <select className={input} value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {Object.values(INSTRUMENTS).map((s) => <option key={s.key} value={s.key}>{s.displayName} ({s.mt5Symbol})</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Account balance (USD $)
          <input className={input} inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="e.g. 1000" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Risk type
            <select className={input} value={riskMode} onChange={(e) => setRiskMode(e.target.value as "percent" | "fixed")}>
              <option value="percent">Percent of balance</option><option value="fixed">Fixed dollars ($)</option>
            </select>
          </label>
          <label className="block text-sm font-medium">{riskMode === "percent" ? "Risk (%)" : "Risk ($)"}
            <input className={input} inputMode="decimal" value={risk} onChange={(e) => setRisk(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm font-medium">Stop-loss input
          <select className={input} value={stopMode} onChange={(e) => setStopMode(e.target.value as "price" | "distance")}>
            <option value="price">Stop-loss price</option><option value="distance">Distance in price units</option>
          </select>
        </label>
        {stopMode === "price" && (
          <label className="block text-sm font-medium">Direction
            <select className={input} value={direction} onChange={(e) => setDirection(e.target.value as "buy" | "sell")}>
              <option value="buy">Buy</option><option value="sell">Sell</option>
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Entry price
            <input className={input} inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">{stopMode === "price" ? "Stop-loss price" : (symbol === "XAUUSD" ? "Distance ($ price move)" : "Distance (price units)")}
            <input className={input} inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} />
          </label>
        </div>
        {needsRate && (
          <div className="space-y-2 rounded-md border border-neutral-300 bg-white p-3 text-sm">
            <label className="block font-medium">Current {symbol} rate (optional)
              <input className={input} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Leave blank to use entry price" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useEntry} onChange={(e) => setUseEntry(e.target.checked)} disabled={rate.trim() !== ""} />
              Use my entry price as the {symbol} rate for USD conversion
            </label>
          </div>
        )}
        <label className="block text-sm font-medium">Session (for maximum lot limits)
          <select className={input} value={session} onChange={(e) => setSession(e.target.value as "day" | "night")}>
            <option value="day">Daytime</option><option value="night">Nighttime</option>
          </select>
        </label>
        <button type="submit" className="w-full rounded-md bg-neutral-900 px-4 py-3 font-semibold text-[#e0c88a] hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#b8975a]">Calculate lot size</button>
      </form>

      <div aria-live="polite">
        {result && !result.ok && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">Please fix the following:</p>
            <ul className="mt-1 list-disc pl-5">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        {result && result.ok && (
          <div className="space-y-4 rounded-xl bg-neutral-900 p-4 text-neutral-100 sm:p-6">
            {result.noValidLot ? (
              <p className="text-xl font-semibold text-amber-300">{result.message}</p>
            ) : (
              <p className="text-3xl font-semibold text-[#e0c88a]">{result.lots.toFixed(2)} lots</p>
            )}
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <Row k="Risk amount" v={usd(result.riskAmountUsd)} />
              <Row k="Stop distance" v={`${result.stopDistance} price units (${result.stopDistancePips} reference pips)`} />
              <Row k="Estimated loss per 1.00 lot" v={usd(result.lossPerLotUsd)} />
              <Row k="Calculated lots (before rounding)" v={result.rawLots.toFixed(4)} />
              <Row k="Final lots (rounded down)" v={result.lots.toFixed(2)} />
              <Row k="Estimated risk at final lots" v={usd(result.estimatedLossUsd)} />
            </dl>
            {result.warnings.map((w) => <p key={w} role="alert" className="rounded bg-amber-100 p-2 text-sm text-amber-900">{w}</p>)}
            <details className="text-sm"><summary className="cursor-pointer font-medium">Assumptions and specification status</summary>
              <p className="mt-2">Status: <strong>{result.specStatus.replace("_", " ")}</strong></p>
              <ul className="mt-1 list-disc space-y-1 pl-5">{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
            </details>
            <ul className="space-y-1 text-xs text-neutral-400">{result.notices.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-600">To check your symbol in MT5: open Market Watch, right-click the exact symbol, choose Specification, and compare contract size, minimum volume, volume step, maximum volume and digits. This calculator is not connected to MT5 or Exness. Educational use only; no trading recommendations.</p>
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => (<div><dt className="text-neutral-400">{k}</dt><dd className="font-medium">{v}</dd></div>);
