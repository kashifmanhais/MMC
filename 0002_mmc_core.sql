-- MMC Redesign core schema. Run AFTER 0001_profiles.sql (see README-SETUP.md for the exact order).
-- Public form tables have RLS enabled and NO anon/authenticated insert policy: the Next.js server writes to them
-- with the service-role key (server only). Admins (rows in admin_users) can read and manage them.

create table public.admin_users (user_id uuid primary key references auth.users (id) on delete cascade);
alter table public.admin_users enable row level security;  -- no policies: managed only via the SQL editor / service role

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Contact messages ----------
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  message text not null check (char_length(message) between 10 and 2000),
  consent boolean not null check (consent),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  email_error text,
  created_at timestamptz not null default now()
);

-- ---------- Online class bookings ("Book Your Seat") ----------
create table public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (char_length(phone) <= 30),
  notes text check (char_length(notes) <= 2000),
  consent boolean not null check (consent),
  status text not null default 'received' check (status in ('received','confirmed','cancelled')),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger class_bookings_touch before update on public.class_bookings for each row execute function public.touch_updated_at();

-- ---------- Private call requests (60 minutes) ----------
create table public.private_call_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  requested_date date not null,
  requested_time text not null check (char_length(requested_time) between 1 and 60),
  questions text not null check (char_length(questions) between 10 and 2000),
  other_contact text check (char_length(other_contact) <= 80),
  consent boolean not null check (consent),
  duration_minutes int not null default 60 check (duration_minutes = 60),
  status text not null default 'pending' check (status in ('pending','confirmed','declined','cancelled')),
  confirmed_start timestamptz,
  confirmed_end timestamptz,
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A call is "confirmed" only with a concrete 60-minute slot set by the owner.
  constraint confirmed_has_slot check ((status = 'confirmed') = (confirmed_start is not null and confirmed_end is not null)),
  constraint confirmed_is_60_min check (confirmed_start is null or confirmed_end = confirmed_start + interval '60 minutes'),
  -- Double-booking prevention for confirmed slots.
  constraint no_double_booking exclude using gist (tstzrange(confirmed_start, confirmed_end) with &&) where (status = 'confirmed')
);
create trigger private_call_touch before update on public.private_call_requests for each row execute function public.touch_updated_at();
create index private_call_status_idx on public.private_call_requests (status, created_at desc);

-- Admin access to form data (read + manage status). Nobody else can read these tables.
alter table public.contact_submissions enable row level security;
alter table public.class_bookings enable row level security;
alter table public.private_call_requests enable row level security;
create policy "Admins read contact" on public.contact_submissions for select to authenticated using (public.is_admin());
create policy "Admins read bookings" on public.class_bookings for select to authenticated using (public.is_admin());
create policy "Admins update bookings" on public.class_bookings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read calls" on public.private_call_requests for select to authenticated using (public.is_admin());
create policy "Admins update calls" on public.private_call_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Public analysis posts (WhatsApp / TradingView links managed by the owner, no rebuild needed) ----------
create table public.analysis_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  note text check (char_length(note) <= 500),
  url text not null check (url ~* '^https://([a-z0-9-]+\.)*(tradingview\.com|whatsapp\.com|wa\.me)(/|$|\?)'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index analysis_posts_published_idx on public.analysis_posts (published, created_at desc);
create trigger analysis_posts_touch before update on public.analysis_posts for each row execute function public.touch_updated_at();
alter table public.analysis_posts enable row level security;
create policy "Anyone reads published posts" on public.analysis_posts for select to anon, authenticated using (published);
create policy "Admins read all posts" on public.analysis_posts for select to authenticated using (public.is_admin());
create policy "Admins insert posts" on public.analysis_posts for insert to authenticated with check (public.is_admin());
create policy "Admins update posts" on public.analysis_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete posts" on public.analysis_posts for delete to authenticated using (public.is_admin());

-- ---------- Rate limiting (used by the server route via the service role) ----------
create table public.rate_limits (key text not null, window_start timestamptz not null, hits int not null default 0, primary key (key, window_start));
alter table public.rate_limits enable row level security;
create function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); n int;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, w, 1)
    on conflict (key, window_start) do update set hits = r.hits + 1 returning hits into n;
  return n <= p_limit;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------- Live Analysis Journal (private per user) ----------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  timeframe text not null check (timeframe in ('1m','5m','15m','30m','1H','4H','Daily','Weekly')),
  instrument text not null check (char_length(btrim(instrument)) between 1 and 30),
  direction text not null check (direction in ('Long','Short')),
  result text not null check (result in ('Win','Loss','Breakeven','No Confirmation','Running')),
  rr numeric(8,2),
  rr_unit text not null default 'R' check (rr_unit = 'R'),  -- RR is always stored in R-multiples; units are never mixed
  trade_activated boolean not null default false,
  reentry_taken boolean not null default false,
  execution_rating smallint check (execution_rating between 1 and 5),  -- user-entered 1-5 plan-adherence rating; null = unrated
  analysis_url text check (analysis_url is null or analysis_url ~* '^https://([a-z0-9-]+\.)*(tradingview\.com|whatsapp\.com|wa\.me)(/|$|\?)'),
  before_image_path text,
  after_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rr_matches_result check (
    (result = 'Win' and rr > 0) or (result = 'Loss' and rr < 0) or (result = 'Breakeven' and rr = 0)
    or (result in ('No Confirmation','Running') and rr is null)),
  constraint reentry_needs_activation check (not reentry_taken or trade_activated),
  constraint before_in_own_folder check (before_image_path is null or before_image_path like user_id::text || '/%'),
  constraint after_in_own_folder check (after_image_path is null or after_image_path like user_id::text || '/%')
);
create index journal_user_date_idx on public.journal_entries (user_id, entry_date desc);
create trigger journal_touch before update on public.journal_entries for each row execute function public.touch_updated_at();
alter table public.journal_entries enable row level security;
create policy "Own journal select" on public.journal_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own journal insert" on public.journal_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own journal update" on public.journal_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own journal delete" on public.journal_entries for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Private storage for analysis images (10 MB, PNG/JPEG/WebP) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal-images', 'journal-images', false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/png','image/jpeg','image/webp'];
-- Files must live in a folder named after the user's id: <user_id>/<file>
create policy "Own images read" on storage.objects for select to authenticated using (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own images insert" on storage.objects for insert to authenticated with check (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own images update" on storage.objects for update to authenticated using (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own images delete" on storage.objects for delete to authenticated using (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
