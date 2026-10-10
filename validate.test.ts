import { describe, it, expect } from "vitest";
import { validatePost } from "./validate";
const ok = { title: "EURUSD structure update", url: "https://www.tradingview.com/x/abc123/", note: "", published: true };
describe("validatePost", () => {
  it("accepts TradingView and WhatsApp links", () => {
    expect(validatePost(ok)).toEqual([]);
    expect(validatePost({ ...ok, url: "https://whatsapp.com/channel/0029Vb9670eHbFVEkebTTA1B" })).toEqual([]);
    expect(validatePost({ ...ok, url: "https://wa.me/123" })).toEqual([]);
  });
  it("requires title and link", () => expect(validatePost({ ...ok, title: " ", url: "" }).length).toBe(2));
  it("rejects other sites, http and look-alike hosts", () => {
    for (const u of ["https://evil.com/x", "http://tradingview.com/x", "https://tradingview.com.evil.com/x", "javascript:alert(1)"]) expect(validatePost({ ...ok, url: u }).length).toBe(1);
  });
  it("limits lengths", () => { expect(validatePost({ ...ok, title: "x".repeat(121) }).length).toBe(1); expect(validatePost({ ...ok, note: "x".repeat(501) }).length).toBe(1); });
});
