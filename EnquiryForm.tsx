"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { validateForm, type FormType } from "@/lib/forms/validation";

type Field = { k: string; label: string; type?: string; area?: boolean; ac?: string };
const FIELDS: Record<FormType, Field[]> = {
  contact: [{ k: "name", label: "Name", ac: "name" }, { k: "email", label: "Email address", type: "email", ac: "email" }, { k: "message", label: "Message", area: true }],
  class: [{ k: "name", label: "Name", ac: "name" }, { k: "email", label: "Email address", type: "email", ac: "email" }, { k: "phone", label: "Phone or WhatsApp (optional)", type: "tel", ac: "tel" }, { k: "notes", label: "Notes or preferred batch (optional)", area: true }],
  call: [{ k: "name", label: "Name", ac: "name" }, { k: "email", label: "Email address", type: "email", ac: "email" }, { k: "date", label: "Requested date", type: "date" }, { k: "time", label: "Requested time and time zone (for example 8:00 PM PKT)" }, { k: "questions", label: "Prepared questions", area: true }, { k: "other", label: "Other contact detail (optional)" }],
};
type Status = { kind: "idle" | "sending" | "saved" | "error"; message?: string };

/** Success is shown ONLY after the server confirms the submission was stored. */
export default function EnquiryForm({ type, button }: { type: FormType; button: string }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = { type, ...v, consent, website: hp };
    const check = validateForm(type, payload);
    setErrors(check.errors);
    if (!check.ok) { setStatus({ kind: "idle" }); return; }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.saved) { setStatus({ kind: "saved", message: data.message }); setV({}); setConsent(false); return; }
      if (res.status === 422 && data.errors) setErrors(data.errors);
      setStatus({ kind: "error", message: (data.message as string) ?? "Not saved. Please check the form and try again." });
    } catch { setStatus({ kind: "error", message: "Could not reach the server. Nothing was confirmed as saved." }); }
  }

  if (status.kind === "saved") {
    return (
      <div className="card" role="status">
        <div className="msg ok"><b>{type === "call" ? "Request received. Status: pending." : "Received."}</b> {status.message}</div>
        {type === "call" && <p className="note">Your requested time is not a reservation until the owner confirms it.</p>}
      </div>
    );
  }
  return (
    <form className="card" noValidate onSubmit={submit}>
      {FIELDS[type].map((f) => (
        <div key={f.k}>
          <label htmlFor={`${type}-${f.k}`}>{f.label}</label>
          {f.area ? <textarea id={`${type}-${f.k}`} rows={4} value={v[f.k] ?? ""} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} aria-describedby={`${type}-${f.k}-e`} />
            : <input id={`${type}-${f.k}`} type={f.type ?? "text"} min={f.type === "date" ? today : undefined} autoComplete={f.ac ?? "off"} value={v[f.k] ?? ""} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} aria-invalid={!!errors[f.k]} aria-describedby={`${type}-${f.k}-e`} />}
          <div className="af-err" id={`${type}-${f.k}-e`} role="alert">{errors[f.k]}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: -9999 }}><input tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} /></div>
      <label style={{ fontWeight: 400 }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I agree that my details may be used to respond to this request, as described in the <Link className="al" href="/privacy">Privacy Policy</Link>.</label>
      <div className="af-err" role="alert">{errors.consent}</div>
      <p><button className="btn dk" type="submit" disabled={status.kind === "sending"}>{status.kind === "sending" ? "Sending…" : button}</button></p>
      {status.kind === "error" && <div className="msg err" role="alert">{status.message}</div>}
    </form>
  );
}
