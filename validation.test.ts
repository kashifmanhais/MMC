import { describe, it, expect } from "vitest";
import { validateForm } from "./validation";
const T = "2026-10-10";
describe("validateForm", () => {
  it("contact: valid", () => expect(validateForm("contact", { name: "Ali", email: "a@b.co", message: "Hello there, hi.", consent: true }, T).ok).toBe(true));
  it("requires consent, name, email, message", () => { const r = validateForm("contact", {}, T); expect(Object.keys(r.errors).sort()).toEqual(["consent", "email", "message", "name"]); });
  it("rejects bad email and non-boolean consent", () => { const r = validateForm("contact", { name: "A", email: "x@y", message: "long enough msg", consent: "true" }, T); expect(r.errors.email).toBeTruthy(); expect(r.errors.consent).toBeTruthy(); });
  it("class: phone and notes optional but limited", () => {
    expect(validateForm("class", { name: "A", email: "a@b.co", consent: true }, T).ok).toBe(true);
    expect(validateForm("class", { name: "A", email: "a@b.co", consent: true, phone: "1".repeat(31) }, T).errors.phone).toBeTruthy();
  });
  it("call: date must be valid and not in the past", () => {
    const base = { name: "A", email: "a@b.co", consent: true, time: "8 PM PKT", questions: "What is my risk plan?" };
    expect(validateForm("call", { ...base, date: "2026-10-10" }, T).ok).toBe(true);
    expect(validateForm("call", { ...base, date: "2026-10-09" }, T).errors.date).toContain("later");
    expect(validateForm("call", { ...base, date: "2026-13-45" }, T).errors.date).toBeTruthy();
    expect(validateForm("call", { ...base, date: "" }, T).errors.date).toBeTruthy();
  });
  it("call: questions and time required", () => { const r = validateForm("call", { name: "A", email: "a@b.co", consent: true, date: "2026-11-01", questions: "short" }, T); expect(r.errors.questions).toBeTruthy(); expect(r.errors.time).toBeTruthy(); });
  it("trims and ignores non-string input", () => { const r = validateForm("contact", { name: 5, email: " a@b.co ", message: "  long enough text  ", consent: true }, T); expect(r.values.email).toBe("a@b.co"); expect(r.errors.name).toBeTruthy(); });
});
