# Sign-in (Supabase Auth): notes

The main setup steps are in `README-SETUP.md`. This file only explains how sign-in behaves.

- **Email + password sign-in works on its own.** Google sign-in is OPTIONAL and is hidden unless `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
- Protected pages: `/journal`, `/dashboard`, `/admin` (see `PROTECTED` in `src/middleware.ts`). Logged-out visitors are sent to `/login`.
- "Remember me" off means the sign-in lasts only until the browser is closed.
- New accounts get a row in `public.profiles` (first name, last name, email) automatically from the database (SQL file 1).

## Optional: turn on Google sign-in later
1. Google Cloud Console > create an OAuth client (type: Web application). Add the redirect URI shown in Supabase under Authentication > Providers > Google (it looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
2. Paste the Google client ID and secret into Supabase (Authentication > Providers > Google) and switch it on. The secret stays in Supabase; never put it in the code or GitHub.
3. In Vercel, set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` to `true` and redeploy. The Google buttons then appear.

Nothing here has been run against a live Supabase project yet.
