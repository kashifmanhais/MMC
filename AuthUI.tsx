"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { site } from "@/config/site";

export const inputCls = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#b8975a] aria-[invalid=true]:border-red-500";

export function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f1e6] px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#ddd3bd] bg-[#fffdf7] p-5 shadow-sm sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          {/* Logo: place the supplied file at public/ros-logo.png (transparent PNG). */}
          <span className="inline-flex rounded-lg bg-[#f6f1e6] p-1.5"><img src={site.logoPath} alt="MMC Redesign logo" className="h-12 w-auto" /></span>
          <span className="text-[10px] tracking-[0.2em] text-neutral-500">MIRROR MARKET CONCEPT</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function Field({ id, label, type = "text", error, autoComplete, defaultValue }: { id: string; label: string; type?: string; error?: string; autoComplete?: string; defaultValue?: string }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-800">{label}</label>
      <input id={id} name={id} type={type} autoComplete={autoComplete} defaultValue={defaultValue} className={inputCls} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="w-full rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-[#e0c88a] hover:bg-black disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#b8975a]">{pending ? "Please wait…" : children}</button>;
}

export function Msg({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return <div role={ok ? "status" : "alert"} className={`mb-4 rounded-lg border p-3 text-sm ${ok ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"}`}>{children}</div>;
}

export function Divider() {
  return <div className="my-5 flex items-center gap-3 text-xs text-neutral-500"><span className="h-px flex-1 bg-[#ddd3bd]" />or<span className="h-px flex-1 bg-[#ddd3bd]" /></div>;
}

/** Google sign-in is OPTIONAL: it only appears when NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true (after you enable the provider in Supabase). */
export const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export function GoogleButton({ label, next }: { label: string; next: string }) {
  async function go() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  }
  return (
    <button type="button" onClick={go} className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-800 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#b8975a]">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      {label}
    </button>
  );
}
