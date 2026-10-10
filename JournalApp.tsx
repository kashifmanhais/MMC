"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteRecord, listRecords, saveRecord, signedImageUrl } from "@/lib/journal/service";
import { DECIDED, RESULTS, TIMEFRAMES, validateRecord, validateImage, type JournalRecord } from "@/lib/journal/record";
import { executionByDay, executionByMonth, executionStats, monthRecords, netRRCandles, resultCounts, rrDistribution, summarize } from "@/lib/journal/stats";
import { BarChart, CandleChart, COLORS, ExecutionDayChart, ResultBreakdown } from "./Charts";

type Draft = { date: string; timeframe: string; instrument: string; direction: string; result: string; rr: string; activated: boolean; reentry: boolean; url: string; execution: string };
const blank = (): Draft => ({ date: new Date().toISOString().slice(0, 10), timeframe: "", instrument: "", direction: "", result: "", rr: "", activated: false, reentry: false, url: "", execution: "" });
const toDraft = (r: JournalRecord): Draft => ({ date: r.date, timeframe: r.timeframe, instrument: r.instrument, direction: r.direction, result: r.result, rr: r.rr === null ? "" : String(r.rr), activated: r.activated, reentry: r.reentry, url: r.url, execution: r.execution === null ? "" : String(r.execution) });
function toRecord(d: Draft, old?: JournalRecord): JournalRecord {
  const decided = DECIDED.includes(d.result), raw = d.rr.trim();
  const rr = decided ? (raw === "" ? (d.result === "Breakeven" ? 0 : NaN) : Number(raw)) : null;
  return { id: old?.id, date: d.date, timeframe: d.timeframe, instrument: d.instrument.trim(), direction: d.direction as JournalRecord["direction"], result: d.result as JournalRecord["result"], rr, activated: d.activated, reentry: d.reentry, url: d.url.trim(), beforePath: old?.beforePath ?? null, afterPath: old?.afterPath ?? null, execution: d.execution === "" ? null : Number(d.execution) };
}
const ym0 = () => new Date().toISOString().slice(0, 7);
const mlabel = (ym: string) => new Date(+ym.slice(0, 4), +ym.slice(5) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

function Thumb({ path, label, onOpen }: { path: string | null; label: string; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let live = true; if (path) signedImageUrl(path).then((u) => live && setUrl(u)); return () => { live = false; }; }, [path]);
  if (!path) return null;
  return <img className="th" src={url ?? "data:image/gif;base64,R0lGODlhAQABAAAAACw="} alt={`${label} analysis image (click to enlarge)`} width={56} height={40} tabIndex={0} role="button" onClick={() => url && onOpen(url)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && url) { e.preventDefault(); onOpen(url); } }} />;
}

export default function JournalApp() {
  const [records, setRecords] = useState<JournalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [files, setFiles] = useState<{ before?: File; after?: File }>({});
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [ym, setYm] = useState(ym0());
  const [scope, setScope] = useState<"month" | "all">("month");
  const [viewer, setViewer] = useState<string | null>(null);
  const [W, setW] = useState(560);
  const chartsRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const res = await listRecords();
    if (res.ok) { setRecords(res.data); setLoadError(null); } else setLoadError(res.error);
    setLoading(false); return res.ok ? res.data : null;
  }, []);
  useEffect(() => { reload().then((d) => { if (d && d.length) setYm(d.map((r) => r.date).sort().slice(-1)[0].slice(0, 7)); }); }, [reload]);
  useEffect(() => {
    const el = chartsRef.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(Math.max(280, Math.min(620, el.clientWidth - 40)))); ro.observe(el); return () => ro.disconnect();
  }, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const decided = DECIDED.includes(draft.result);
  const startNew = () => { setEditing("new"); setDraft(blank()); setFiles({}); setRowErrors([]); setNotice(null); };
  const startEdit = (r: JournalRecord) => { setEditing(r.id!); setDraft(toDraft(r)); setFiles({}); setRowErrors([]); setNotice(null); };
  const cancel = () => { setEditing(null); setRowErrors([]); };

  async function save() {
    const old = editing && editing !== "new" ? records.find((r) => r.id === editing) : undefined;
    const rec = toRecord(draft, old), errors = validateRecord(rec);
    for (const [f, l] of [[files.before, "Before Analysis"], [files.after, "After Analysis"]] as const) if (f) { const m = validateImage(f, l); if (m) errors.push(m); }
    if (errors.length) { setRowErrors([...new Set(errors)]); return; }
    setSaving(true);
    const res = await saveRecord(rec, files);
    setSaving(false);
    if (!res.ok) { setRowErrors([res.error]); return; } // never report success unless the database confirmed it
    setEditing(null); setRowErrors([]); setYm(rec.date.slice(0, 7));
    await reload(); setNotice({ kind: "ok", text: "Saved to the database." });
  }
  async function remove(r: JournalRecord) {
    if (!window.confirm("Delete this record and its screenshots?")) return;
    const res = await deleteRecord(r);
    if (!res.ok) { setNotice({ kind: "err", text: res.error }); return; }
    await reload(); setNotice({ kind: "ok", text: "Record deleted." });
  }

  const scoped = scope === "all" ? records : monthRecords(records, ym);
  const s = summarize(scoped), ex = executionStats(scoped), noRR = scoped.filter((r) => typeof r.rr !== "number").length, label = scope === "all" ? "all months" : mlabel(ym);
  const dist = rrDistribution(scoped), candles = netRRCandles(scoped), decidedCount = dist.reduce((a, b) => a + b.count, 0);
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const tiles: [string, string | number][] = [["Total trades", s.total], ["Wins", s.wins], ["Losses", s.losses], ["Breakeven", s.breakeven], ["No Confirmation", s.noConfirmation], ["Running", s.running], ["Win rate", s.winRate === null ? "n/a" : `${s.winRate.toFixed(1)}%`], ["Net RR", `${s.netRR > 0 ? "+" : ""}${s.netRR.toFixed(2)} R`], ["No final RR", noRR]];
  const card = (title: string, body: React.ReactNode, note?: string) => <div className="card" style={{ marginBottom: 14 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{body}{note && <p className="note">{note}</p>}</div>;
  const dis = editing !== null;

  return (
    <>
      {loadError && <div className="msg warn" role="alert"><b>Journal unavailable.</b> {loadError}</div>}
      <div className="row">
        <div><label htmlFor="jmo">Month</label><input id="jmo" type="month" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} /></div>
        <div><label htmlFor="jsc">Statistics and graphs show</label><select id="jsc" value={scope} onChange={(e) => setScope(e.target.value as "month" | "all")}><option value="month">Selected month</option><option value="all">All months</option></select></div>
      </div>
      <div className="stats">{tiles.map(([k, v]) => <div className="stat" key={k}><b>{v}</b><span>{k}</span></div>)}</div>
      <p className="note">Win rate = wins ÷ (wins + losses), from decided trades only. Breakeven, No Confirmation and Running are counted separately and are not in the denominator. Net RR = sum of RR (in R-multiples) over Win, Loss and Breakeven records. “No final RR” counts records without an RR value (Running, No Confirmation).</p>

      <h2>Journal table</h2>
      <p className="note">One trade per row. RR is entered in <b>R-multiples</b> (2 = won 2R, -1 = lost 1R, 0 = breakeven), never in points. Execution is your own 1–5 rating of how closely you followed your plan.</p>
      <p><button className="btn" onClick={startNew} disabled={dis || !!loadError}>Add Row</button></p>
      {notice && <div className={`msg ${notice.kind}`} role={notice.kind === "err" ? "alert" : "status"}>{notice.text}</div>}
      <div className="tw" role="region" aria-label="Journal table (scrolls horizontally)" tabIndex={0}>
        <table id="jtbl">
          <thead><tr><th>Date</th><th>Timeframe</th><th>Pair / Instrument</th><th>Direction</th><th>Result</th><th>RR<br /><small>R-multiples, not points</small></th><th>Activated</th><th>Re-entry</th><th>Before Analysis</th><th>After Analysis</th><th>TradingView / WhatsApp Link</th><th>Execution<br /><small>1–5, your rating</small></th><th>Actions</th></tr></thead>
          <tbody>
            {editing === "new" && editRow()}
            {sorted.map((r) => editing === r.id ? editRow(r) : (
              <tr key={r.id}>
                <td>{r.date}</td><td>{r.timeframe}</td><td>{r.instrument}</td><td>{r.direction}</td><td style={{ color: COLORS[r.result] }}><b>{r.result}</b></td>
                <td>{typeof r.rr === "number" ? `${r.rr > 0 ? "+" : ""}${r.rr} R` : "—"}</td>
                <td style={{ textAlign: "center" }}>{r.activated ? "✓" : "—"}</td><td style={{ textAlign: "center" }}>{r.reentry ? "✓" : "—"}</td>
                <td><Thumb path={r.beforePath} label="Before" onOpen={setViewer} />{!r.beforePath && "—"}</td><td><Thumb path={r.afterPath} label="After" onOpen={setViewer} />{!r.afterPath && "—"}</td>
                <td>{r.url ? <a className="al" href={r.url} target="_blank" rel="noopener noreferrer">Open link</a> : "—"}</td>
                <td>{r.execution ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}><button className="btn dk" style={{ padding: "4px 9px" }} disabled={dis} onClick={() => startEdit(r)}>Edit</button> <button className="btn dk" style={{ padding: "4px 9px" }} disabled={dis} onClick={() => remove(r)}>Delete</button></td>
              </tr>))}
            {!loading && !sorted.length && editing !== "new" && <tr><td colSpan={13} style={{ padding: 20 }}>{loadError ? "The journal cannot load until the database is configured." : <>No records yet. Click <b>Add Row</b> to enter your first trade. Nothing is pre-filled.</>}</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Monthly graphs</h2>
      <div ref={chartsRef} aria-live="polite">
        {!scoped.length ? <div className="msg warn">No records for {label}. The graphs appear after you save records. Nothing is made up.</div> : (
          <>
            {card(`Monthly RR distribution — ${label}`, decidedCount ? <BarChart W={W} labels={dist.map((b) => b.label)} series={[{ name: "trades", color: "#b8975a", values: dist.map((b) => b.count) }]} fmt={(q) => String(Math.round(q))} aria={`RR distribution of ${decidedCount} decided trades`} ymax={Math.max(4, Math.ceil(Math.max(...dist.map((b) => b.count)) / 4) * 4)} xt="RR (R-multiples)" yt="Number of trades" /> : <p className="note">No decided trades with a final RR in this selection.</p>, `Counts decided trades (Win, Loss, Breakeven) by RR. ${decidedCount} included. ${noRR} record(s) with no final RR (Running, No Confirmation) are not plotted. All RR values are R-multiples; points are rejected on entry, so units are never mixed.`)}
            {card(`Monthly net RR — ${label}`, candles.length ? <CandleChart W={W} candles={candles} /> : <p className="note">No decided trades with a final RR in this selection.</p>, "Method: decided trades in date order. Each candle opens at the running net RR before that trade and closes after adding its RR: green = gain, red = loss. The heavy line is zero. There are no wicks because high/low values are not recorded, and none are invented.")}
            {card(`Result breakdown — ${label}`, <ResultBreakdown counts={resultCounts(scoped)} />)}
            {card(`Execution quality — ${label}`, !ex.rated ? <div className="msg warn">No execution ratings recorded for {label}. Enter a 1–5 rating in the Execution column of a row. Nothing is estimated.</div> : scope === "all" ? (() => { const m = executionByMonth(records); return <BarChart W={W} labels={m.map((x) => x.ym)} series={[{ name: "Average rating", color: "#3b6fb6", values: m.map((x) => x.average) }]} fmt={(q) => q.toFixed(1)} aria="Average execution rating by month" ymax={5} xt="Month" yt="Average rating (1–5)" />; })() : <ExecutionDayChart W={W} days={executionByDay(records, ym)} ym={ym} avg={ex.average as number} />, `Execution rating is entered by you for each trade: 1 = plan not followed, 3 = partly followed, 5 = plan followed exactly (entry, stop, size, exit). Dots are your ratings; the line joins daily averages; the dashed line is the average. Rated: ${ex.rated}. Unrated (excluded): ${ex.unrated}.${ex.average === null ? "" : ` Average: ${ex.average.toFixed(2)}.`}`)}
          </>)}
      </div>

      {viewer && (
        <div className="modal" onClick={() => setViewer(null)}>
          <div role="dialog" aria-modal="true" aria-label="Screenshot" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
            <p><button className="btn dk" autoFocus onClick={() => setViewer(null)}>Close</button></p>
            <img src={viewer} alt="Analysis screenshot" style={{ maxWidth: "100%", height: "auto" }} />
          </div>
        </div>)}
    </>
  );

  function editRow(old?: JournalRecord) {
    const opt = (arr: readonly string[], ph: string) => <><option value="">{ph}</option>{arr.map((x) => <option key={x}>{x}</option>)}</>;
    return [
      <tr className="editing" key="edit">
        <td><input type="date" aria-label="Date" value={draft.date} onChange={(e) => set("date", e.target.value)} /></td>
        <td><select aria-label="Timeframe" value={draft.timeframe} onChange={(e) => set("timeframe", e.target.value)}>{opt(TIMEFRAMES, "Select")}</select></td>
        <td><input aria-label="Pair or instrument (type it)" maxLength={30} placeholder="e.g. EURUSD" value={draft.instrument} onChange={(e) => set("instrument", e.target.value)} /></td>
        <td><select aria-label="Direction" value={draft.direction} onChange={(e) => set("direction", e.target.value)}>{opt(["Long", "Short"], "Select")}</select></td>
        <td><select aria-label="Result" value={draft.result} onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, result: v, rr: DECIDED.includes(v) ? (v === "Breakeven" ? "0" : d.rr) : "" })); }}>{opt(RESULTS, "Select")}</select></td>
        <td><input inputMode="decimal" aria-label="RR in R-multiples" placeholder="e.g. 2 or -1" disabled={!decided} value={draft.rr} onChange={(e) => set("rr", e.target.value)} /></td>
        <td style={{ textAlign: "center" }}><input type="checkbox" aria-label="Activated" checked={draft.activated} onChange={(e) => set("activated", e.target.checked)} /></td>
        <td style={{ textAlign: "center" }}><input type="checkbox" aria-label="Re-entry" checked={draft.reentry} onChange={(e) => set("reentry", e.target.checked)} /></td>
        <td><Thumb path={old?.beforePath ?? null} label="Before" onOpen={setViewer} /><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Before analysis image (PNG, JPEG or WebP, max 10 MB)" onChange={(e) => setFiles((f) => ({ ...f, before: e.target.files?.[0] }))} /></td>
        <td><Thumb path={old?.afterPath ?? null} label="After" onOpen={setViewer} /><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="After analysis image (PNG, JPEG or WebP, max 10 MB)" onChange={(e) => setFiles((f) => ({ ...f, after: e.target.files?.[0] }))} /></td>
        <td><input type="url" aria-label="TradingView or WhatsApp analysis URL" placeholder="https://" value={draft.url} onChange={(e) => set("url", e.target.value)} /></td>
        <td><select aria-label="Execution rating 1 to 5" value={draft.execution} onChange={(e) => set("execution", e.target.value)}>{opt(["1", "2", "3", "4", "5"], "—")}</select></td>
        <td style={{ whiteSpace: "nowrap" }}><button className="btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button> <button className="btn dk" disabled={saving} onClick={cancel}>Cancel</button></td>
      </tr>,
      <tr className="editing" key="edit-msg"><td colSpan={13}>{rowErrors.length > 0 && <div className="msg err" role="alert">{rowErrors.map((e) => <div key={e}>{e}</div>)}</div>}</td></tr>,
    ];
  }
}
