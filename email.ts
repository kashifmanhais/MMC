/** Owner notification via Resend's REST API (server-side only; the key never reaches the browser). */
export type EmailResult = { ok: true } | { ok: false; error: string };
export async function sendOwnerEmail(subject: string, lines: string[], replyTo?: string): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM, to = process.env.OWNER_EMAIL;
  if (!key || !from || !to) return { ok: false, error: "Email provider is not configured (RESEND_API_KEY, EMAIL_FROM, OWNER_EMAIL)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text: lines.join("\n"), ...(replyTo ? { reply_to: replyTo } : {}) }), // plain text only: no HTML injection
    });
    if (!res.ok) return { ok: false, error: `Provider responded ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Network error" }; }
}
