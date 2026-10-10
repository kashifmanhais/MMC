-- ROS profiles: one row per auth user, created by a trigger (never by the browser).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- No insert/delete policies: only the trigger below creates rows; deletes cascade from auth.users.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full text := coalesce(nullif(m->>'full_name', ''), nullif(m->>'name', ''), '');
  fn text; ln text;
begin
  -- Email sign-up sends first_name/last_name; Google sends given_name/family_name (or a full name).
  fn := coalesce(nullif(m->>'first_name', ''), nullif(m->>'given_name', ''), nullif(split_part(full, ' ', 1), ''), '');
  ln := coalesce(nullif(m->>'last_name', ''), nullif(m->>'family_name', ''),
                 nullif(trim(substr(full, length(split_part(full, ' ', 1)) + 1)), ''), '');
  insert into public.profiles (id, first_name, last_name, email)
  values (new.id, left(fn, 60), left(ln, 60), coalesce(new.email, ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
