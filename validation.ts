import { EMAIL_RE } from "../auth/validation";
export type FormType = "contact" | "class" | "call";
export type Errors = Record<string, string>;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const need = (e: Errors, k: string, v: string, label: string, min = 1, max = 2000) => {
  if (!v) e[k] = `${label} is required.`;
  else if (v.length < min) e[k] = `${label} must be at least ${min} characters.`;
  else if (v.length > max) e[k] = `${label} must be ${max} characters or fewer.`;
};
const optional = (e: Errors, k: string, v: string, label: string, max: number) => { if (v.length > max) e[k] = `${label} must be ${max} characters or fewer.`; };

/** Returns cleaned values or errors. `today` is injected for testing (YYYY-MM-DD). */
export function validateForm(type: FormType, raw: Record<string, unknown>, today = new Date().toISOString().slice(0, 10)) {
  const e: Errors = {};
  const v = { name: s(raw.name), email: s(raw.email), message: s(raw.message), phone: s(raw.phone), notes: s(raw.notes), date: s(raw.date), time: s(raw.time), questions: s(raw.questions), other: s(raw.other) };
  need(e, "name", v.name, "Name", 1, 80);
  if (!v.email) e.email = "Email address is required."; else if (!EMAIL_RE.test(v.email) || v.email.length > 254) e.email = "Enter a valid email address.";
  if (raw.consent !== true) e.consent = "Please agree to continue.";
  if (type === "contact") need(e, "message", v.message, "Message", 10);
  if (type === "class") { optional(e, "phone", v.phone, "Phone", 30); optional(e, "notes", v.notes, "Notes", 2000); }
  if (type === "call") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(Date.parse(v.date))) e.date = "Choose a valid date.";
    else if (v.date < today) e.date = "Choose today or a later date.";
    need(e, "time", v.time, "Requested time and time zone", 1, 60);
    need(e, "questions", v.questions, "Prepared questions", 10);
    optional(e, "other", v.other, "Other contact detail", 80);
  }
  return { ok: Object.keys(e).length === 0, errors: e, values: v };
}
