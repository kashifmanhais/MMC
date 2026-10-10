# Setup guide (beginner friendly)

Follow the steps in order. You do not need to install anything on your computer to put the site online: GitHub stores the files, Supabase stores the data, and Vercel builds and hosts the site.
Nothing in this guide has been tested against your real accounts yet, so if a screen looks different, send me a screenshot or the error text.

**Never put passwords or keys in the code or in GitHub.** Keys go only into the Supabase and Vercel dashboards (steps 2 and 3).

---

## Step 1: Put the files into your (empty) GitHub repository
The files you received are in folders. They must keep the same folder layout. `package.json` must sit at the TOP of the repository (not inside an extra folder).

**Easiest way (web upload)**
1. Open your repository on github.com. Click **Add file** > **Upload files**.
2. On your computer, open the project folder, select everything inside it (all folders and files) and drag it onto the GitHub page. GitHub keeps the subfolders.
3. Check that hidden files `.gitignore` and `.env.example` were included. If not, upload those two separately.
4. Scroll down, click **Commit changes**.
5. Check: the repository's first page should show `package.json`, `src`, `supabase`, `public`, and `README.md`.

**Or with Git on your computer** (from inside the project folder)
```
git init
git add .
git commit -m "MMC Redesign website"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git push -u origin main
```
Do not upload a file called `.env.local`. It is for your own computer only and is already ignored by `.gitignore`.

---

## Step 2: Supabase (database). Run the two SQL files IN THIS ORDER
Open your project at supabase.com.

1. **SQL file 1:** left menu **SQL Editor** > **New query**. Open `supabase/migrations/0001_profiles.sql` in the repo, copy ALL of it, paste it, click **Run**. You should see "Success".
2. **SQL file 2:** **New query** again. Open `supabase/migrations/0002_mmc_core.sql`, copy ALL of it, paste, **Run**. You should see "Success".
   - Run each file once, file 1 first. If you see an error, copy the exact message and send it to me. Do not run the file again.
   - File 2 creates the tables for contact messages, class bookings, private calls, journal records, analysis posts and rate limiting, the private image storage (10 MB, PNG/JPEG/WebP only), and the access rules (Row Level Security).
3. **Keys:** **Project Settings** > **API**. You will copy three things in step 3: the **Project URL**, the **anon public key**, and the **service_role key**. The service_role key is a SECRET (treat it like a password).
4. **Sign-in settings:** **Authentication** > **Providers** > **Email**. Keep "Confirm email" on. (Supabase's built-in email sender is limited in how many emails it sends; check its current limits. You can add your own email service before a public launch.)
5. **Site URL:** after step 3 gives you your Vercel address, come back to **Authentication** > **URL Configuration**. Set **Site URL** to that address (for example `https://your-project.vercel.app`) and add `https://your-project.vercel.app/**` to **Redirect URLs**.

---

## Step 3: Vercel (hosting)
1. Open vercel.com > **Add New** > **Project** > import your GitHub repository.
2. Vercel detects **Next.js** automatically. Leave the build settings as they are.
3. Open **Environment Variables** and add these (names exactly as written). Tick Production and Preview.

| Name | What to paste | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | no |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **YES** |
| `RATE_LIMIT_SALT` | any long random text you make up | **YES** |
| `NEXT_PUBLIC_SITE_URL` | your Vercel address (add after the first deploy) | no |

Add later, when you are ready (the site works without them): `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`, `NEXT_PUBLIC_CLASS_WHATSAPP_URL`, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`. See step 6.
4. Click **Deploy**. When it finishes, Vercel shows your address (`https://....vercel.app`). Put it in `NEXT_PUBLIC_SITE_URL`, finish Supabase step 2.5, and click **Redeploy** (any time you change variables you must redeploy).
5. If the build fails, open the build log, copy the red error text, and send it to me.

---

## Step 4: Make yourself an administrator
1. On your live site go to **Login** > **Sign Up** and create your account (confirm the email if asked).
2. In Supabase: **Authentication** > **Users**, copy your **User UID**.
3. **SQL Editor** > **New query**, paste this with your UID, **Run**:
   `insert into public.admin_users (user_id) values ('PASTE-YOUR-USER-UID-HERE');`
4. You can now open `/admin/analysis` on your site.

## Step 5: Check it works (what you should see)
- Home, Programs, About, Contact, Classes, Private Call, VIP Community, Terms, Privacy, Refund all open. The footer has three sections only.
- Contact form: after you submit, it says "Received" only if the database saved it (see the `contact_submissions` table in Supabase > Table Editor). If it says "not configured", a variable in step 3 is missing.
- Login/Sign Up work with email and password. Journal: log in, **Add Row**, **Save**.
- Class page: the "Ask on WhatsApp" button is disabled until you set the class link (step 6b). That is expected.

## Adding or changing analysis posts later (no rebuild)
Log in as administrator, open `/admin/analysis`, paste a TradingView or WhatsApp link with a title (and optional note), and save. It appears immediately on `/analysis` and the journal page. You can edit, unpublish or delete posts there. Only https links on tradingview.com, wa.me and whatsapp.com are accepted. No sample posts are included.

---

## Step 6: Later, when you are ready (optional)
**6a. Owner email notifications (Resend).** Until this is done, submissions are still saved in the database; the owner email simply is not sent and the entry is marked "failed" so you can see it.
1. Create an account at resend.com. **Domains** > **Add Domain** (you need your own domain for this; skip until you have one).
2. Resend shows DNS records (SPF and DKIM). Add them exactly as shown at the company where you bought the domain, then click **Verify**. Also add a DMARC record named `_dmarc` with the value `v=DMARC1; p=none; rua=mailto:kashif.manhais@gmail.com`.
3. **API Keys** > create a key. In Vercel add `RESEND_API_KEY` (secret), `EMAIL_FROM` (an address on your verified domain, for example `MMC Redesign <notifications@yourdomain.com>`), and `OWNER_EMAIL` (`kashif.manhais@gmail.com`). Redeploy.
4. Test the contact form and check your inbox.

**6b. Class-booking WhatsApp link.** This is NOT the VIP channel link. When you have it, add it in Vercel as `NEXT_PUBLIC_CLASS_WHATSAPP_URL` (for example `https://wa.me/<country code and number>`) and redeploy. The class page button then turns on. Class dates and fees: edit `classes` in `src/config/site.ts` when final (leave empty until then).

**6c. Google sign-in (optional).** See `README-AUTH.md`. Email sign-in works without it.

**6d. Custom domain (later).** Vercel > your project > **Settings** > **Domains** > Add. Vercel then shows the exact DNS records to create at your domain company; copy exactly what it shows. After it works, update Supabase **Site URL** and **Redirect URLs** and `NEXT_PUBLIC_SITE_URL`.

**6e. Your review.** Terms, Privacy and Refund wording is in `src/content/policy-text.ts` (draft). Items marked [OWNER TO CONFIRM] need your decision before you publish.

## Troubleshooting
- "Not configured" messages: a variable from step 3 is missing or you did not redeploy.
- Cannot open `/admin/analysis`: complete step 4.
- Journal says it cannot load: the SQL files were not run (step 2) or the Supabase keys are wrong.
- Anything else: send me the exact message.

## Honest status
Written and unit-tested here: validation, calculator, journal rules and statistics, analysis-post validation (60 tests). Written but NOT built or run here (the work environment could not install packages): all React pages, `next build`, the SQL files, and anything involving Supabase, Resend or Vercel. Expect to fix small things on first deploy.
