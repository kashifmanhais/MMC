"use client";
import { useEffect, useState } from "react";
const KEY = "mmc_notes";
export default function NotesBox() {
  const [v, setV] = useState(""), [msg, setMsg] = useState("");
  useEffect(() => { try { setV(localStorage.getItem(KEY) ?? ""); } catch { /* storage disabled */ } }, []);
  const save = (x: string) => { setV(x); try { localStorage.setItem(KEY, x); setMsg("Saved in this browser."); } catch { setMsg("Could not save (storage full or disabled)."); } };
  return (<div className="card"><label htmlFor="nt">Your notes (saved in this browser only)</label><textarea id="nt" rows={6} value={v} onChange={(e) => save(e.target.value)} /><p className="note" aria-live="polite">{msg}</p><button className="btn dk" type="button" onClick={() => { save(""); setMsg("Notes cleared."); }}>Clear notes</button></div>);
}
