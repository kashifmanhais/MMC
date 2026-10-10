import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigured } from "@/lib/supabase/config";

const PROTECTED = ["/journal", "/dashboard", "/admin"]; // add every private route prefix here
const AUTH_PAGES = ["/login", "/signup"];
const hit = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const toLogin = () => { const u = req.nextUrl.clone(); u.pathname = "/login"; u.search = `?next=${encodeURIComponent(pathname + search)}`; return NextResponse.redirect(u); };

  // Fail closed: if Supabase is not configured, private routes stay private.
  if (!authConfigured()) return hit(pathname, PROTECTED) ? toLogin() : NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sessionOnly = req.cookies.get("ros_rm")?.value === "0";
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => {
          if (sessionOnly) { const { maxAge, expires, ...rest } = options; void maxAge; void expires; res.cookies.set(name, value, rest); }
          else res.cookies.set(name, value, options);
        });
      },
    },
  });
  // getUser() re-validates the token with Supabase; never trust getSession() for authorization.
  const { data: { user } } = await supabase.auth.getUser();

  const redirect = (to: NextResponse) => { res.cookies.getAll().forEach((c) => to.cookies.set(c)); return to; };
  if (!user && hit(pathname, PROTECTED)) return redirect(toLogin());
  if (user && hit(pathname, AUTH_PAGES)) { const u = req.nextUrl.clone(); u.pathname = "/journal"; u.search = ""; return redirect(NextResponse.redirect(u)); }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
