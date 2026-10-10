# MMC Redesign (Mirror Market Concept) website

Next.js (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, Storage) + Resend (owner email notifications), deployed on Vercel.

## Run locally
```bash
npm install
cp .env.example .env.local     # then fill in the values in .env.local; never commit it
npm run dev                    # http://localhost:3000
npm test                       # Vitest unit tests (validation, calculator, journal rules and statistics)
npm run typecheck && npm run build
```
Without Supabase or Resend variables the site still runs. Forms and the journal then say "not configured, nothing was saved" instead of pretending to succeed.

## Where things live
| Path | What |
|---|---|
| `src/config/site.ts` | Brand, contact, VIP WhatsApp URL, class WhatsApp link, class dates/fees (empty until final) |
| `src/content/policy-text.ts` | Terms, Privacy and Refund wording (DRAFT for your review) |
| `src/app/*` | Pages: home, programs, about, classes, private-call, vip, contact, journal, calculator, library, login, signup, policies, terms, privacy, refund |
| `src/app/api/submit/route.ts` | Contact, class booking and private-call submissions: validate, rate-limit, store, then email the owner |
| `src/app/analysis`, `src/app/admin/analysis` | Public analysis links, and the admin page where you add or change them (no rebuild) |
| `src/lib/journal/*` | Journal validation, statistics and the Supabase service layer |
| `src/middleware.ts` | Protects `/journal` and `/dashboard` (redirects to `/login`) |
| `supabase/migrations/0001_profiles.sql`, `0002_mmc_core.sql` | Tables, constraints, indexes, Row Level Security, private image bucket. Run in that order |
| `.env.example` | Variable NAMES only. Real values go in `.env.local` and Vercel settings |

## Setup and deployment
Start with `README-SETUP.md` (beginner friendly: GitHub, the two SQL files in order, Vercel, admin, optional email/Google/domain). `README-AUTH.md` explains sign-in.

## Security rules for this repo
Never commit `.env*` files (already in `.gitignore`). The Supabase service-role key, Resend key and `RATE_LIMIT_SALT` are server-only Vercel environment variables.
