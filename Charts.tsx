import type { ReactNode } from "react";
import { RESULTS } from "@/lib/journal/record";
import type { netRRCandles, executionByDay } from "@/lib/journal/stats";

export const COLORS: Record<string, string> = { Win: "#2e8b3e", Loss: "#c0392b", Breakeven: "#b8975a", "No Confirmation": "#7a7a7a", Running: "#3b6fb6" };
const GOLD = "#b8975a", GREEN = "#2e8b3e", RED = "#c0392b", BLUE = "#3b6fb6";

function frame(W: number, H: number, mn: number, mx: number, fmt: (n: number) => string) {
  const L = 44, R = 10, T = 12, B = 44, Y = (v: number) => T + ((mx - v) * (H - T - B)) / (mx - mn);
  const grid = [0, 1, 2, 3, 4].map((k) => { const q = mn + ((mx - mn) * k) / 4; return <g key={k}><line x1={L} x2={W - R} y1={Y(q)} y2={Y(q)} stroke="var(--line)" /><text x={L - 5} y={Y(q) + 4} textAnchor="end" fontSize={11} fill="var(--ink)">{fmt(q)}</text></g>; });
  const zero = mn < 0 && mx > 0 ? <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="var(--ink)" strokeWidth={1.5} opacity={0.7} /> : null;
  return { Y, L, pw: W - L - R, xl: H - 26, grid, zero };
}
function Svg({ W, H, aria, xt, yt, children }: { W: number; H: number; aria: string; xt: string; yt: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ width: "100%", height: "auto", display: "block", fontFamily: "system-ui,sans-serif" }}>
      {children}
      <text x={(W + 34) / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--ink)" opacity={0.8}>{xt}</text>
      <text transform={`translate(12 ${(H - 32) / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill="var(--ink)" opacity={0.8}>{yt}</text>
    </svg>
  );
}

export type Series = { name: string; color: string; values: (number | null)[] };
export function BarChart({ W, labels, series, fmt, aria, ymax, xt, yt }: { W: number; labels: string[]; series: Series[]; fmt: (n: number) => string; aria: string; ymax?: number; xt: string; yt: string }) {
  const H = 250, all = series.flatMap((s) => s.values).filter((v): v is number => v !== null), mx = ymax ?? Math.max(1, ...all);
  const f = frame(W, H, 0, ymax ? mx : mx * 1.1, fmt), n = labels.length, gw = f.pw / n, bw = Math.min(30, (gw * 0.7) / series.length);
  return (
    <Svg W={W} H={H} aria={aria} xt={xt} yt={yt}>
      {f.grid}
      {labels.map((l, i) => (
        <g key={l}>
          {series.map((s, k) => { const v = s.values[i]; if (v === null) return null; const x = f.L + gw * i + gw / 2 - (bw * series.length) / 2 + bw * k, y = f.Y(v); return <rect key={k} x={x} y={y} width={bw} height={Math.max(0, f.Y(0) - y)} fill={s.color}><title>{`${l} · ${s.name}: ${fmt(v)}`}</title></rect>; })}
          <text x={f.L + gw * i + gw / 2} y={f.xl} textAnchor="middle" fontSize={n > 6 ? 9 : 11} fill="var(--ink)">{l}</text>
        </g>
      ))}
    </Svg>
  );
}

/** One candle per decided trade: opens at the running net RR, closes after adding its RR. No wicks: high/low are not recorded and are never invented. */
export function CandleChart({ W, candles }: { W: number; candles: ReturnType<typeof netRRCandles> }) {
  const H = 270, v = [0, ...candles.flatMap((c) => [c.open, c.close])];
  let mn = Math.min(...v), mx = Math.max(...v); if (mn === mx) { mn -= 1; mx += 1; }
  const p = (mx - mn) * 0.1; mn -= p; mx += p;
  const f = frame(W, H, mn, mx, (q) => q.toFixed(1)), gw = f.pw / candles.length, bw = Math.max(3, Math.min(26, gw * 0.7)), last = candles[candles.length - 1].close;
  return (
    <Svg W={W} H={H} aria={`Net RR candle chart: ${candles.length} decided trades, final net ${last.toFixed(2)} R`} xt="Trade number (in date order)" yt="Cumulative net RR (R)">
      {f.grid}{f.zero}
      {candles.map((c, i) => { const x = f.L + gw * i + gw / 2 - bw / 2; return (
        <g key={i}>
          <rect x={x} y={f.Y(Math.max(c.open, c.close))} width={bw} height={Math.max(1.5, Math.abs(f.Y(c.open) - f.Y(c.close)))} fill={c.close >= c.open ? GREEN : RED}><title>{`#${i + 1} ${c.date} ${c.result}: ${c.rr > 0 ? "+" : ""}${c.rr}R, net ${c.close.toFixed(2)}R`}</title></rect>
          {(candles.length <= 15 || i % Math.ceil(candles.length / 12) === 0) && <text x={x + bw / 2} y={f.xl} textAnchor="middle" fontSize={11} fill="var(--ink)">{i + 1}</text>}
        </g>); })}
    </Svg>
  );
}

export function ExecutionDayChart({ W, days, ym, avg }: { W: number; days: ReturnType<typeof executionByDay>; ym: string; avg: number }) {
  const H = 250, n = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(), f = frame(W, H, 1, 5, (q) => q.toFixed(0)), gw = f.pw / n, X = (d: number) => f.L + gw * (d - 0.5);
  return (
    <Svg W={W} H={H} aria={`Execution rating by day, average ${avg.toFixed(2)}`} xt="Day of month" yt="Execution rating (1–5)">
      {f.grid}
      <line x1={f.L} x2={f.L + f.pw} y1={f.Y(avg)} y2={f.Y(avg)} stroke={GOLD} strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={f.L + f.pw} y={f.Y(avg) - 5} textAnchor="end" fontSize={11} fill="var(--ink)">{`Avg ${avg.toFixed(2)}`}</text>
      {days.length > 1 && <polyline fill="none" stroke={BLUE} strokeWidth={2} points={days.map((d) => `${X(d.day)},${f.Y(d.average)}`).join(" ")} />}
      {days.flatMap((d) => d.values.map((val, i) => <circle key={`${d.day}-${i}`} cx={X(d.day)} cy={f.Y(val)} r={4.5} fill={GOLD} fillOpacity={0.65} stroke="#7a5f2b"><title>{`Day ${d.day}: rating ${val}`}</title></circle>))}
      {Array.from({ length: n }, (_, i) => i + 1).filter((d) => d === 1 || d % 5 === 0 || d === n).map((d) => <text key={d} x={X(d)} y={f.xl} textAnchor="middle" fontSize={11} fill="var(--ink)">{d}</text>)}
    </Svg>
  );
}

export function ResultBreakdown({ counts }: { counts: { result: string; count: number }[] }) {
  const total = counts.reduce((a, c) => a + c.count, 0);
  return (
    <>
      <div role="img" aria-label="Result breakdown" style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "var(--line)" }}>
        {counts.filter((c) => c.count).map((c) => <div key={c.result} title={`${c.result}: ${c.count}`} style={{ width: `${(c.count / total) * 100}%`, background: COLORS[c.result] }} />)}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", fontFamily: "system-ui", fontSize: 14, display: "grid", gap: 4, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {RESULTS.map((r) => { const c = counts.find((x) => x.result === r)?.count ?? 0; return <li key={r}><span style={{ color: COLORS[r] }}>■</span> {r}: <b>{c}</b> ({total ? Math.round((c / total) * 100) : 0}%)</li>; })}
      </ul>
    </>
  );
}
