"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validatePost, type PostInput } from "@/lib/analysis/validate";

const read = (fd: FormData): PostInput => ({ title: String(fd.get("title") ?? ""), url: String(fd.get("url") ?? ""), note: String(fd.get("note") ?? ""), published: fd.get("published") === "on" });
const back = (kind: "ok" | "err", msg: string): never => redirect(`/admin/analysis?${kind}=${encodeURIComponent(msg)}`);

/** Only administrators may write. The database enforces this too (row-level security), so this is a second lock, not the only one. */
async function admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/analysis");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? supabase : null;
}
const refresh = () => { revalidatePath("/analysis"); revalidatePath("/journal"); };

export async function createPostAction(fd: FormData) {
  const v = read(fd), errs = validatePost(v);
  if (errs.length) return back("err", errs.join(" "));
  const sb = await admin(); if (!sb) return back("err", "You are not an administrator.");
  const { error } = await sb.from("analysis_posts").insert({ title: v.title.trim(), url: v.url.trim(), note: v.note.trim() || null, published: v.published });
  if (error) return back("err", "Not saved: " + error.message);
  refresh(); return back("ok", "Post saved.");
}
export async function updatePostAction(fd: FormData) {
  const id = String(fd.get("id") ?? ""), v = read(fd), errs = validatePost(v);
  if (!id) return back("err", "Missing post id.");
  if (errs.length) return back("err", errs.join(" "));
  const sb = await admin(); if (!sb) return back("err", "You are not an administrator.");
  const { error } = await sb.from("analysis_posts").update({ title: v.title.trim(), url: v.url.trim(), note: v.note.trim() || null, published: v.published }).eq("id", id);
  if (error) return back("err", "Not saved: " + error.message);
  refresh(); return back("ok", "Post updated.");
}
export async function deletePostAction(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const sb = await admin(); if (!sb) return back("err", "You are not an administrator.");
  const { error } = await sb.from("analysis_posts").delete().eq("id", id);
  if (error) return back("err", "Not deleted: " + error.message);
  refresh(); return back("ok", "Post deleted.");
}
