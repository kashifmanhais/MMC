import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/validation";

// Handles Google OAuth, email-confirmation and password-reset links (PKCE code exchange).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (code) {
    const supabase = await createClient(true);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const fwd = request.headers.get("x-forwarded-host");
      const base = process.env.NODE_ENV === "development" || !fwd ? origin : `https://${fwd}`;
      return NextResponse.redirect(`${base}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
