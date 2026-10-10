import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** remember=false makes auth cookies session cookies (cleared when the browser closes). */
export async function createClient(remember?: boolean) {
  const jar = await cookies();
  const sessionOnly = remember === undefined ? jar.get("ros_rm")?.value === "0" : !remember;
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            if (sessionOnly) { const { maxAge, expires, ...rest } = options; void maxAge; void expires; jar.set(name, value, rest); }
            else jar.set(name, value, options);
          }
        } catch { /* called from a Server Component; middleware refreshes the session */ }
      },
    },
  });
}
