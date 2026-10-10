import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";

export type AnalysisPost = { id: string; title: string; note: string | null; url: string; published: boolean; created_at: string };
type Res = { ok: true; data: AnalysisPost[] } | { ok: false; error: string };
const COLS = "id,title,note,url,published,created_at";

/** Public: only published posts (enforced by the database, not just this query). Read at request time, so new posts need no rebuild. */
export async function listPublishedPosts(limit = 50): Promise<Res> {
  if (!authConfigured()) return { ok: false, error: "The database is not configured yet." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("analysis_posts").select(COLS).eq("published", true).order("created_at", { ascending: false }).limit(limit);
  return error ? { ok: false, error: "Posts could not be loaded." } : { ok: true, data: (data ?? []) as AnalysisPost[] };
}

/** Admin view: row-level security returns unpublished posts only to administrators. */
export async function listAllPosts(): Promise<Res> {
  if (!authConfigured()) return { ok: false, error: "The database is not configured yet." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("analysis_posts").select(COLS).order("created_at", { ascending: false });
  return error ? { ok: false, error: error.message } : { ok: true, data: (data ?? []) as AnalysisPost[] };
}
