import { createClient } from "@/lib/supabase/client";
import { authConfigured } from "@/lib/supabase/config";
import { IMAGE_TYPES, fromRow, toRow, validateImage, validateRecord, type JournalRecord } from "./record";

export type Res<T> = { ok: true; data: T } | { ok: false; error: string; notConfigured?: boolean };
const NOT_CONFIGURED = { ok: false, notConfigured: true, error: "The database is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and run the SQL migrations. Nothing was saved." } as const;
const BUCKET = "journal-images";
const ext = (t: string) => (t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg");

export async function listRecords(): Promise<Res<JournalRecord[]>> {
  if (!authConfigured()) return NOT_CONFIGURED;
  const { data, error } = await createClient().from("journal_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false });
  return error ? { ok: false, error: error.message } : { ok: true, data: (data ?? []).map(fromRow) };
}

/** Returns ok only after the database has confirmed the write (row-level security applies). */
export async function saveRecord(r: JournalRecord, files: { before?: File; after?: File } = {}): Promise<Res<JournalRecord>> {
  if (!authConfigured()) return NOT_CONFIGURED;
  const errors = validateRecord(r);
  for (const [k, label] of [["before", "Before Analysis"], ["after", "After Analysis"]] as const) { const f = files[k]; if (f) { const m = validateImage(f, label); if (m) errors.push(m); } }
  if (errors.length) return { ok: false, error: errors.join(" ") };
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: "You must be logged in to save records." };
  const uploaded: string[] = [], next = { ...r };
  for (const [k, field] of [["before", "beforePath"], ["after", "afterPath"]] as const) {
    const f = files[k]; if (!f || !IMAGE_TYPES.includes(f.type)) continue;
    const path = `${u.user.id}/${crypto.randomUUID()}.${ext(f.type)}`;
    const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (up.error) { if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded); return { ok: false, error: "Image upload failed: " + up.error.message }; }
    uploaded.push(path); next[field] = path;
  }
  const q = r.id ? supabase.from("journal_entries").update(toRow(next)).eq("id", r.id) : supabase.from("journal_entries").insert({ ...toRow(next), user_id: u.user.id });
  const { data, error } = await q.select("*").single();
  if (error || !data) { if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded); return { ok: false, error: error?.message ?? "The database did not confirm the save." }; }
  const old = [files.before && r.beforePath, files.after && r.afterPath].filter(Boolean) as string[];
  if (old.length) await supabase.storage.from(BUCKET).remove(old); // replaced images are removed only after the row is saved
  return { ok: true, data: fromRow(data) };
}

export async function deleteRecord(rec: JournalRecord): Promise<Res<true>> {
  if (!authConfigured()) return NOT_CONFIGURED;
  const supabase = createClient();
  const { error } = await supabase.from("journal_entries").delete().eq("id", rec.id!);
  if (error) return { ok: false, error: error.message };
  const paths = [rec.beforePath, rec.afterPath].filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  return { ok: true, data: true };
}

export async function signedImageUrl(path: string): Promise<string | null> {
  if (!authConfigured()) return null;
  const { data } = await createClient().storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
